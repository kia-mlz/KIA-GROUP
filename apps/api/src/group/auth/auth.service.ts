import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ThrottlerException } from '@nestjs/throttler';
import type {
  AuthResponse,
  AuthTokens,
  AuthUser,
  CompleteProfileDto,
  LearnerState,
  ProfileDetails,
  RequestOtpResponse,
} from '@kia./shared';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/password.dto';
import {
  containsUnsafeText,
  isValidEmail,
  isValidIranCity,
  isValidIranProvince,
  normalizeIranianPhone,
  resolveStaffAdminAccess,
  sanitizeProfileText,
} from '@kia./shared';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, randomInt, randomUUID } from 'crypto';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { EmailService } from '@kia./platform';
import { PrismaService } from '@kia./platform';
import { SiteSettingsService } from '@kia./platform';
import { SmsService } from '../sms/sms.service';
import { TwoFactorService } from './two-factor/two-factor.service';
import { EventBusService } from '@kia./platform';
import { sniffImageMime } from '@kia./platform';
import { LoginDto } from './dto/login.dto';

import type { TwoFactorChallengeResponse } from './two-factor/two-factor.types';
import { addDurationToDate, parseExpiresInSeconds } from './auth.utils';

const BCRYPT_ROUNDS = 12;
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
/** Per-phone SMS-bomb protection: max codes generated per window regardless of IP. */
const OTP_PHONE_WINDOW_MS = 10 * 60 * 1000;
const OTP_MAX_PER_PHONE = 3;

/** Password reset tokens (AUTH-4): short-lived, single-use, hashed at rest. */
const RESET_TOKEN_TTL_MINUTES = 30;
const RESET_TOKEN_TTL_MS = RESET_TOKEN_TTL_MINUTES * 60 * 1000;
/** 32 random bytes, hex-encoded. shape-checked before any DB lookup. */
const RESET_TOKEN_PATTERN = /^[0-9a-f]{64}$/;
/** Email-bomb protection: at most this many reset emails per account per window. */
const RESET_EMAIL_WINDOW_MS = 10 * 60 * 1000;
const RESET_EMAIL_MAX = 3;

/**
 * Accounts that must never authenticate: suspended (temporary) or banned
 * (permanent). Enforced on every credential mint AND on every request via
 * the JWT strategy, so suspension takes effect immediately even for
 * already-issued access tokens.
 */
function isAccountInactive(status: string): boolean {
  return status === 'SUSPENDED' || status === 'BANNED';
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly siteSettings: SiteSettingsService,
    private readonly smsService: SmsService,
    private readonly twoFactorService: TwoFactorService,
    private readonly events: EventBusService,
  ) {}
  async login(
    dto: LoginDto,
  ): Promise<(AuthResponse & { refreshToken: string }) | TwoFactorChallengeResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (isAccountInactive(user.status)) {
      // Session revocation: suspended/banned accounts cannot mint new sessions.
      // Also clears any refresh token that survived (defense in depth).
      await this.prisma.refreshToken.deleteMany({ where: { userId: user.id } });
      throw new UnauthorizedException('Account suspended');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // AUTH-5: 2FA-enabled staff accounts receive NO session here — only a
    // short-lived single-purpose challenge. The response shape is
    // discriminated by `twoFactorRequired: true` so clients can branch safely.
    const challenge = await this.twoFactorService.loginGate({ id: user.id, role: user.role });
    if (challenge) {
      return { twoFactorRequired: true, ...challenge };
    }

    return this.issueAuthResponse(await this.buildAuthUser(user));
  }

  /**
   * Second login step (AUTH-5): verify the TOTP/recovery code for the
   * challenge and mint the real session for the account.
   */
  async completeTwoFactorLogin(challenge: string, code: string): Promise<AuthResponse & { refreshToken: string }> {
    const { userId } = await this.twoFactorService.verifyTwoFactorLogin(challenge, code);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    if (isAccountInactive(user.status)) {
      throw new UnauthorizedException('Account suspended');
    }
    return this.issueAuthResponse(await this.buildAuthUser(user));
  }

  async requestOtp(rawPhone: string): Promise<RequestOtpResponse> {
    const phone = normalizeIranianPhone(rawPhone);
    if (!phone) {
      throw new BadRequestException('Invalid Iranian phone number');
    }

    const code = String(randomInt(100000, 999999));
    const recentForPhone = await this.prisma.phoneOtp.count({
      where: {
        phone,
        createdAt: { gte: new Date(Date.now() - OTP_PHONE_WINDOW_MS) },
      },
    });
    if (recentForPhone >= OTP_MAX_PER_PHONE) {
      throw new ThrottlerException('Too many verification codes requested. Try again later.');
    }
    const codeHash = this.hashOtp(phone, code);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    await this.prisma.phoneOtp.updateMany({
      where: { phone, consumedAt: null },
      data: { consumedAt: new Date() },
    });

    await this.prisma.phoneOtp.create({
      data: { phone, codeHash, expiresAt },
    });

    // Deliver via configured SMS provider (Kavenegar, …). Failures surface to the client.
    await this.smsService.sendOtp(phone, code);

    // Never expose OTP in production. In non-production, require an explicit flag.
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    const expose =
      !isProduction && this.configService.get<string>('OTP_DEV_EXPOSE') === 'true';

    const masked =
      phone.length >= 4 ? `${phone.slice(0, 4)}****${phone.slice(-2)}` : '****';
    if (expose) {
      // Local DX only — never enable OTP_DEV_EXPOSE in production (Joi-enforced).
      console.info(`[otp] phone=${masked} code=${code}`);
    } else {
      console.info(`[otp] code dispatched to ${masked}`);
    }

    return {
      phone,
      expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
      ...(expose ? { devCode: code } : {}),
    };
  }

  async verifyOtp(
    rawPhone: string,
    code: string,
  ): Promise<AuthResponse & { refreshToken: string }> {
    const phone = normalizeIranianPhone(rawPhone);
    if (!phone) {
      throw new BadRequestException('Invalid Iranian phone number');
    }
    if (!/^\d{6}$/.test(code)) {
      throw new BadRequestException('Invalid verification code');
    }

    const otp = await this.prisma.phoneOtp.findFirst({
      where: { phone, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp || otp.expiresAt < new Date()) {
      throw new UnauthorizedException('Code expired or not found');
    }
    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      throw new UnauthorizedException('Too many attempts. Request a new code.');
    }

    const ok = otp.codeHash === this.hashOtp(phone, code);
    if (!ok) {
      await this.prisma.phoneOtp.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('Invalid verification code');
    }

    await this.prisma.phoneOtp.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    });

    let user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      const settings = await this.siteSettings.get();
      user = await this.prisma.user.create({
        data: {
          phone,
          phoneVerified: true,
          name: '',
          profileComplete: false,
          bootcampProfile: {
            create: {
              rank: settings.bootcamp.defaultRank,
              points: settings.bootcamp.defaultPoints,
            },
          },
        },
      });
      // Domain event: the identity platform announces a new user. Never
      // blocks registration — the bus isolates consumer failures.
      await this.events
        .publish({
          name: 'group.user.registered',
          occurredAt: new Date().toISOString(),
          userId: user.id,
          via: 'otp',
        })
        .catch(() => undefined);
    } else if (!user.phoneVerified) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { phoneVerified: true },
      });
    }
    if (isAccountInactive(user.status)) {
      throw new UnauthorizedException('Account suspended');
    }

    return this.issueAuthResponse(await this.buildAuthUser(user));
  }

  async completeProfile(
    userId: string,
    dto: CompleteProfileDto,
  ): Promise<AuthResponse & { refreshToken: string }> {
    const firstName = sanitizeProfileText(dto.firstName);
    const lastName = sanitizeProfileText(dto.lastName);
    const province = sanitizeProfileText(dto.province);
    const city = sanitizeProfileText(dto.city);
    const email = dto.email.trim().toLowerCase();

    if (!firstName || !lastName || !province || !city) {
      throw new BadRequestException('All profile fields are required');
    }
    if (!isValidIranProvince(province) || !isValidIranCity(province, city)) {
      throw new BadRequestException('Invalid province or city');
    }
    if (
      containsUnsafeText(firstName) ||
      containsUnsafeText(lastName) ||
      containsUnsafeText(province) ||
      containsUnsafeText(city)
    ) {
      throw new BadRequestException('Profile contains unsafe content');
    }
    if (!isValidEmail(email) || containsUnsafeText(email)) {
      throw new BadRequestException('Invalid email address');
    }

    // AUTH-6: never reveal whether another account already uses this email.
    // The P2002 unique violation below resolves the conflict atomically; the
    // true owner receives a verification email either way.
    const existingUser = await this.prisma.user.findUnique({ where: { id: userId } });
    const isFirstCompletion = existingUser && !existingUser.profileComplete;

    let user: Awaited<ReturnType<typeof this.prisma.user.update>>;
    try {
      user = await this.prisma.user.update({
        where: { id: userId },
        data: {
          firstName,
          lastName,
          province,
          city,
          email,
          emailVerified: false, // re-verify on every email change
          name: `${firstName} ${lastName}`.trim(),
          profileComplete: true,
        },
      });
    } catch (err) {
      if ((err as { code?: string } | null)?.code === 'P2002') {
        // Email belongs to someone else. Same generic error, no reveal.
        throw new ConflictException('Unable to save profile with this information');
      }
      throw err;
    }

    if (user.email && isFirstCompletion) {
      await this.emailService.sendWelcome({
        id: user.id,
        name: user.name,
        email: user.email,
      });
    }

    if (isFirstCompletion) {
      await this.events
        .publish({
          name: 'group.user.profile_completed',
          occurredAt: new Date().toISOString(),
          userId: user.id,
        })
        .catch(() => undefined);
    }

    return this.issueAuthResponse(await this.buildAuthUser(user));
  }

  async getProfileDetails(userId: string): Promise<ProfileDetails> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return {
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      province: user.province ?? '',
      city: user.city ?? '',
      email: user.email,
      phone: user.phone,
      name: user.name,
      bio: user.bio ?? '',
      avatarUrl: user.avatarUrl ?? null,
    };
  }

  async updateProfile(
    userId: string,
    dto: CompleteProfileDto,
  ): Promise<AuthResponse & { refreshToken: string }> {
    const result = await this.completeProfile(userId, dto);
    if (typeof dto.bio === 'string') {
      const bio = sanitizeProfileText(dto.bio).slice(0, 500);
      if (containsUnsafeText(bio)) {
        throw new BadRequestException('Profile contains unsafe content');
      }
      await this.prisma.user.update({
        where: { id: userId },
        data: { bio },
      });
    }
    return result;
  }

  async updateAvatar(
    userId: string,
    file: Express.Multer.File,
  ): Promise<ProfileDetails> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Avatar file is required');
    }
    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
    if (!allowed.has(file.mimetype)) {
      throw new BadRequestException('Avatar must be a JPEG, PNG, WebP, or GIF image');
    }
    // Defense in depth: client-supplied MIME is untrusted — verify magic bytes.
    const detectedMime = sniffImageMime(file.buffer);
    if (!detectedMime || detectedMime !== file.mimetype) {
      throw new BadRequestException('Avatar content does not match its declared image type');
    }
    if (file.size > 2 * 1024 * 1024) {
      throw new BadRequestException('Avatar must be under 2MB');
    }

    const ext =
      file.mimetype === 'image/png'
        ? 'png'
        : file.mimetype === 'image/webp'
          ? 'webp'
          : file.mimetype === 'image/gif'
            ? 'gif'
            : 'jpg';

    const dir = join(process.cwd(), 'uploads', 'avatars');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    const filename = `${userId}.${ext}`;
    writeFileSync(join(dir, filename), file.buffer);
    const avatarUrl = `/api/uploads/avatars/${filename}?t=${Date.now()}`;

    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    });

    return this.getProfileDetails(userId);
  }

  async refresh(
    user: AuthUser,
    refreshToken: string,
  ): Promise<AuthResponse & { refreshToken: string }> {
    // Atomic single-use claim: exactly ONE concurrent caller can delete the row.
    // A findFirst→delete pair would let two parallel refreshes both succeed,
    // defeating rotation-based theft detection.
    const claimed = await this.prisma.refreshToken.deleteMany({
      where: {
        userId: user.id,
        token: this.hashRefreshToken(refreshToken),
        expiresAt: { gt: new Date() },
      },
    });
    if (claimed.count === 0) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.issueAuthResponse(user);
  }

  // ---------------------------------------------------------------------------
  // Password reset & change (AUTH-4)
  // ---------------------------------------------------------------------------

  /**
   * Always resolves without error and with a uniform response: callers and
   * attackers cannot distinguish unknown / malformed / rate-capped addresses
   * from successful dispatch (account enumeration protection).
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const email = dto.email.trim().toLowerCase();
    if (!isValidEmail(email)) {
      return;
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.email) {
      return;
    }

    // Email-bomb protection: silently ignore once the cap is hit — no
    // attacker-visible signal, and the newest legitimate link stays valid.
    const recent = await this.prisma.passwordResetToken.count({
      where: {
        userId: user.id,
        createdAt: { gte: new Date(Date.now() - RESET_EMAIL_WINDOW_MS) },
      },
    });
    if (recent >= RESET_EMAIL_MAX) {
      return;
    }

    // Any older token for the account becomes unusable — only the newest link works.
    await this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    const rawToken = randomBytes(32).toString('hex');
    await this.prisma.passwordResetToken.create({
      data: {
        tokenHash: this.hashToken(rawToken),
        userId: user.id,
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    });

    const appUrl = this.configService.get<string>('APP_URL', 'http://localhost:3000');
    const resetUrl = `${appUrl.replace(/\/$/, '')}/reset-password?token=${rawToken}`;
    const status = await this.emailService.sendPasswordReset(
      { id: user.id, name: user.name, email: user.email },
      resetUrl,
      RESET_TOKEN_TTL_MINUTES,
    );

    if (status !== 'sent' && this.configService.get<string>('NODE_ENV') !== 'production') {
      // DEV ONLY: without SMTP there is no way to receive the link locally.
      // The raw token is never logged in production.
      this.logger.warn(
        `[dev-only] SMTP unavailable — password reset link for ${email}: ${resetUrl}`,
      );
    }
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    if (dto.password !== dto.passwordConfirm) {
      throw new BadRequestException('Passwords do not match');
    }
    if (!RESET_TOKEN_PATTERN.test(dto.token)) {
      throw new BadRequestException('Invalid or expired reset link');
    }

    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: this.hashToken(dto.token) },
      include: { user: true },
    });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset link');
    }
    if (isAccountInactive(record.user.status)) {
      throw new UnauthorizedException('Account suspended');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const isVerifyLink = dto.type === 'verify';
    await this.prisma.$transaction(async (tx) => {
      // Atomic single-use claim: a replayed link loses the race and changes nothing.
      const claimed = await tx.passwordResetToken.updateMany({
        where: { id: record.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (claimed.count === 0) {
        throw new BadRequestException('Invalid or expired reset link');
      }
      await tx.user.update({
        where: { id: record.userId },
        data: {
          passwordHash,
          // Verification links confirm mailbox ownership without a reset.
          ...(isVerifyLink ? { emailVerified: true } : {}),
        },
      });
      // The credential may have been compromised — revoke every session.
      await tx.refreshToken.deleteMany({ where: { userId: record.userId } });
    });
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    currentRefreshToken?: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    if (!user.passwordHash) {
      throw new BadRequestException(
        'This account signs in by phone. Use "forgot password" to set one first.',
      );
    }

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('New password must be different from the current password');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      // Revoke OTHER sessions (stolen-credential mitigation) but keep the
      // current device signed in; if no cookie is present, revoke everything.
      this.prisma.refreshToken.deleteMany({
        where: currentRefreshToken
          ? { userId, token: { not: this.hashRefreshToken(currentRefreshToken) } }
          : { userId },
      }),
    ]);
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await this.prisma.refreshToken.deleteMany({
        where: { userId, token: this.hashRefreshToken(refreshToken) },
      });
      return;
    }

    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }

  async validateUser(userId: string): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    // Server-authoritative session state: a suspended/banned user is rejected
    // on EVERY authenticated request, even with a still-valid access token.
    if (!user || isAccountInactive(user.status)) {
      return null;
    }
    return this.buildAuthUser(user);
  }

  async validateRefreshToken(
    userId: string,
    tokenId: string,
    refreshToken: string,
  ): Promise<AuthUser | null> {
    const stored = await this.prisma.refreshToken.findFirst({
      where: { id: tokenId, userId, token: this.hashRefreshToken(refreshToken) },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date() || isAccountInactive(stored.user.status)) {
      return null;
    }

    return this.buildAuthUser(stored.user);
  }

  async getLearnerState(userId: string): Promise<LearnerState> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const [roadmaps, readinessTests, examAttempts, entitlements, enrollments] = await Promise.all([
      this.prisma.roadmap.findMany({
        where: { userId },
        select: { enrolled: true },
      }),
      this.prisma.readinessTest.findMany({
        where: { userId },
        select: { id: true },
      }),
      this.prisma.examAttempt.findMany({
        where: { userId, status: 'SUBMITTED' },
        select: { id: true },
      }),
      this.prisma.entitlement.findMany({ where: { userId } }),
      this.prisma.enrollment.findMany({
        where: { userId },
        include: { course: { select: { slug: true } } },
      }),
    ]);

    const hasRoadmap = roadmaps.length > 0;
    const roadmapEnrolled = roadmaps.some((roadmap) => roadmap.enrolled);
    // Readiness test is free — legacy readinessPaid kept for client compatibility.
    const readinessPaid = true;

    const authUser = await this.buildAuthUser(user);

    return {
      user: authUser,
      hasRoadmap,
      roadmapEnrolled,
      readinessPaid,
      testCompleted: readinessTests.length > 0 || examAttempts.length > 0,
      profileComplete: authUser.profileComplete,
      entitlements: entitlements.map(
        (entitlement) => `${entitlement.resourceType}:${entitlement.resourceId}`,
      ),
      enrollments: enrollments.map((enrollment) => enrollment.course.slug),
    };
  }

  private hashOtp(phone: string, code: string): string {
    return createHash('sha256').update(`${phone}:${code}`).digest('hex');
  }

  /** Refresh tokens are high-value credentials — persist only their digest. */
  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /** Reset tokens are bearer credentials — persist only their digest. */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async issueAuthResponse(
    user: AuthUser,
  ): Promise<AuthResponse & { refreshToken: string }> {
    const tokens = await this.createTokens(user);
    return {
      user,
      ...tokens,
    };
  }

  private async createTokens(user: AuthUser): Promise<AuthTokens & { refreshToken: string }> {
    const accessExpiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '15m');
    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');

    // Single write: derive the id first so the signed JWT can embed it and the
    // stored token IS the JWT (no pointless provisional value / second update).
    const tokenId = randomUUID();
    const refreshToken = await this.jwtService.signAsync(
      { sub: user.id, tokenId },
      {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: parseExpiresInSeconds(refreshExpiresIn),
      },
    );
    await this.prisma.refreshToken.create({
      data: {
        id: tokenId,
        // Store only a SHA-256 digest of the JWT: a database leak must never
        // yield usable refresh tokens. Deploy note: tokens written by older
        // versions fail this lookup once and force a fresh OTP login.
        token: this.hashRefreshToken(refreshToken),
        userId: user.id,
        expiresAt: addDurationToDate(refreshExpiresIn),
      },
    });

    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email ?? user.phone ?? '',
        role: user.role,
      },
      {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
        expiresIn: parseExpiresInSeconds(accessExpiresIn),
      },
    );

    return {
      accessToken,
      expiresIn: parseExpiresInSeconds(accessExpiresIn),
      refreshToken,
    };
  }

  private async buildAuthUser(user: {
    id: string;
    name: string;
    email: string | null;
    phone?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    province?: string | null;
    city?: string | null;
    role: AuthUser['role'];
    profileComplete?: boolean;
    adminPanelAccess?: unknown;
  }): Promise<AuthUser> {
    const authUser: AuthUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone ?? null,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      province: user.province ?? null,
      city: user.city ?? null,
      role: user.role,
      profileComplete: Boolean(user.profileComplete),
    };

    if (user.role !== 'LEARNER' && user.role !== 'SUPER_ADMIN') {
      // ADM-1: the server ISSUES the effective matrix (user override → custom
      // role matrix → site template) so the admin UI never re-derives it.
      const settings = await this.siteSettings.get();
      const roleRow =
        user.role !== 'ADMIN' && !user.adminPanelAccess
          ? await this.prisma.role.findUnique({ where: { key: user.role } })
          : null;
      authUser.adminPanelAccess = resolveStaffAdminAccess(
        user.adminPanelAccess,
        roleRow?.access,
        settings.adminAccess,
      );
    }

    return authUser;
  }
}
