import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomInt } from 'crypto';
import * as bcrypt from 'bcrypt';
import * as QRCode from 'qrcode';
import type { AuthUser } from '@kia./shared';
import { PrismaService } from '@kia./platform';
import {
  decryptTotpSecret,
  encryptTotpSecret,
  generateTotpSecret,
  verifyTotp,
} from './totp';

/**
 * TOTP two-factor authentication (AUTH-5) for staff accounts.
 *
 * Flow:
 *  1. setup()   — staff-only. Creates a pending secret + otpauth:// URL + QR data URL.
 *  2. confirm() — staff-only. Verifies the first code, stores the secret encrypted,
 *                 generates 8 single-use recovery codes (shown exactly once).
 *  3. login()   — AuthService consults loginGate() during password login and, for
 *                 2FA-enabled staff, issues NO session — only a short-lived
 *                 single-purpose challenge JWT; verifyTwoFactorLogin() exchanges
 *                 { challenge, code } for a real session.
 *  4. Admin overrides: listStaffTwoFactor / disableForUser (SUPER_ADMIN only).
 *
 * Security properties: secret encrypted at rest (AES-256-GCM, key derived from
 * JWT_REFRESH_SECRET), recovery codes stored only as bcrypt digests with atomic
 * single-use claims, challenge tokens are audience/purpose-scoped and expire in
 * 2 minutes, TOTP steps cannot be replayed (twoFactorVerifiedAt watermark),
 * verification is rate-limited at the controller.
 */

const RECOVERY_CODE_COUNT = 8;
const RECOVERY_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O/1/I
const RECOVERY_CODE_BLOCKS = 2;
const RECOVERY_CODE_BLOCK_LEN = 5;
const TOTP_REPLAY_GRACE_MS = 90 * 1000;
const CHALLENGE_TTL_SECONDS = 120;

export interface StaffTwoFactorRow {
  id: string;
  name: string;
  email: string | null;
  role: string;
  twoFactorEnabled: boolean;
}

@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger(TwoFactorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  // ------------------------------------------------------------------ setup

  async setup(user: AuthUser): Promise<{ otpauthUrl: string; qrDataUrl: string; secret: string }> {
    this.assertStaff(user);
    const record = await this.prisma.user.findUnique({ where: { id: user.id } });
    if (!record) {
      throw new NotFoundException('User not found');
    }
    if (record.twoFactorEnabled) {
      throw new BadRequestException('Two-factor authentication is already enabled');
    }

    const secret = generateTotpSecret();
    // The plaintext secret is returned to the enrolling admin exactly once and
    // never logged; only the encrypted form is persisted.
    const encrypted = encryptTotpSecret(secret, this.encryptionKeyMaterial());
    await this.prisma.user.update({
      where: { id: user.id },
      data: { twoFactorSecret: encrypted, twoFactorEnabled: false },
    });

    const otpauthUrl = this.buildOtpauthUrl(secret, record.email ?? record.id);
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl, { margin: 1, width: 240 });
    return { otpauthUrl, qrDataUrl, secret };
  }

  async confirm(user: AuthUser, code: string): Promise<{ enabled: true; recoveryCodes: string[] }> {
    this.assertStaff(user);
    const record = await this.prisma.user.findUnique({ where: { id: user.id } });
    if (!record?.twoFactorSecret) {
      throw new BadRequestException('Start the two-factor setup first');
    }
    if (record.twoFactorEnabled) {
      throw new BadRequestException('Two-factor authentication is already enabled');
    }

    const secret = decryptTotpSecret(record.twoFactorSecret, this.encryptionKeyMaterial());
    const { valid } = verifyTotp(secret, code);
    if (!valid) {
      throw new BadRequestException('Invalid verification code');
    }

    const recoveryCodes = this.generateRecoveryCodes();
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { twoFactorEnabled: true, twoFactorVerifiedAt: new Date() },
      }),
      this.prisma.twoFactorRecoveryCode.deleteMany({ where: { userId: user.id } }),
      ...recoveryCodes.map((rc) =>
        this.prisma.twoFactorRecoveryCode.create({
          // Hash the stripped form so user input matches regardless of
          // separators/case (matchSecondFactor strips before comparing).
          data: { userId: user.id, codeHash: bcrypt.hashSync(rc.replace(/-/g, ''), 10) },
        }),
      ),
    ]);

    this.logger.log(`2FA enabled for staff account ${user.id}`);
    return { enabled: true, recoveryCodes };
  }

  async status(user: AuthUser): Promise<{ enabled: boolean; backupCodesRemaining: number }> {
    const record = await this.prisma.user.findUnique({ where: { id: user.id } });
    const enabled = Boolean(record?.twoFactorEnabled);
    const backupCodesRemaining = enabled
      ? await this.prisma.twoFactorRecoveryCode.count({
          where: { userId: user.id, usedAt: null },
        })
      : 0;
    return { enabled, backupCodesRemaining };
  }

  /**
   * Regenerate recovery codes. Requires a valid current TOTP code (step-up),
   * so a stolen browser session alone cannot reset the backup factor.
   */
  async regenerateRecoveryCodes(user: AuthUser, code: string): Promise<{ recoveryCodes: string[] }> {
    this.assertStaff(user);
    const record = await this.prisma.user.findUnique({ where: { id: user.id } });
    if (!record?.twoFactorEnabled || !record.twoFactorSecret) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }
    const secret = decryptTotpSecret(record.twoFactorSecret, this.encryptionKeyMaterial());
    const { valid } = verifyTotp(secret, code);
    if (!valid) {
      throw new UnauthorizedException('Invalid verification code');
    }

    const recoveryCodes = this.generateRecoveryCodes();
    await this.prisma.$transaction([
      this.prisma.twoFactorRecoveryCode.deleteMany({ where: { userId: user.id } }),
      ...recoveryCodes.map((rc) =>
        this.prisma.twoFactorRecoveryCode.create({
          data: { userId: user.id, codeHash: bcrypt.hashSync(rc.replace(/-/g, ''), 10) },
        }),
      ),
    ]);
    return { recoveryCodes };
  }

  async disable(user: AuthUser, code: string): Promise<{ enabled: false }> {
    this.assertStaff(user);
    const record = await this.prisma.user.findUnique({ where: { id: user.id } });
    if (!record?.twoFactorEnabled || !record.twoFactorSecret) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }
    await this.assertValidSecondFactor(record.id, record.twoFactorSecret, code, new Date());
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorVerifiedAt: null },
      }),
      this.prisma.twoFactorRecoveryCode.deleteMany({ where: { userId: user.id } }),
    ]);
    return { enabled: false };
  }

  // -------------------------------------------------------------- login path

  /** Staff roles that can carry a 2FA enrollment (learners never can). */
  isTwoFactorEligibleRole(role: string): boolean {
    return role === 'ADMIN' || role === 'SUPER_ADMIN' || this.isCustomStaffRole(role);
  }

  /**
   * Called from AuthService.login after the password verifies. When 2FA is
   * enabled for the account, no session is minted — the client must complete
   * the second step with the returned single-purpose challenge.
   */
  async loginGate(
    user: { id: string; role: string },
  ): Promise<{ challenge: string; expiresIn: number } | null> {
    if (!this.isTwoFactorEligibleRole(user.role)) {
      return null;
    }
    const record = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { twoFactorEnabled: true },
    });
    if (!record?.twoFactorEnabled) {
      return null;
    }
    const challenge = await this.jwtService.signAsync(
      { sub: user.id, purpose: '2fa-login' },
      {
        secret: this.challengeSecret(),
        expiresIn: CHALLENGE_TTL_SECONDS,
        audience: 'kia-academy:2fa',
      },
    );
    return { challenge, expiresIn: CHALLENGE_TTL_SECONDS };
  }

  /** Exchange { challenge, code } for the account identity (session minted by AuthService). */
  async verifyTwoFactorLogin(challenge: string, code: string): Promise<{ userId: string }> {
    let sub: string;
    try {
      const payload = await this.jwtService.verifyAsync<{ sub?: string; purpose?: string }>(
        challenge,
        {
          secret: this.challengeSecret(),
          audience: 'kia-academy:2fa',
        },
      );
      if (payload.purpose !== '2fa-login' || typeof payload.sub !== 'string') {
        throw new Error('wrong purpose');
      }
      sub = payload.sub;
    } catch {
      throw new UnauthorizedException('Challenge expired — sign in again');
    }

    const record = await this.prisma.user.findUnique({
      where: { id: sub },
      select: { id: true, twoFactorEnabled: true, twoFactorSecret: true },
    });
    if (!record?.twoFactorEnabled || !record.twoFactorSecret) {
      throw new UnauthorizedException('Two-factor authentication is not active');
    }
    const consumed = await this.consumeSecondFactor(record.id, record.twoFactorSecret, code);
    if (!consumed) {
      throw new UnauthorizedException('Invalid or expired verification code');
    }
    return { userId: record.id };
  }

  // ------------------------------------------------------- admin overrides

  async listStaffTwoFactor(): Promise<StaffTwoFactorRow[]> {
    return this.prisma.user.findMany({
      where: { OR: [{ role: 'ADMIN' }, { role: 'SUPER_ADMIN' }] },
      select: { id: true, name: true, email: true, role: true, twoFactorEnabled: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async disableForUser(actor: AuthUser, targetUserId: string): Promise<{ enabled: false }> {
    if (actor.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only super admins can manage other staff accounts');
    }
    const target = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) {
      throw new NotFoundException('User not found');
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: targetUserId },
        data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorVerifiedAt: null },
      }),
      this.prisma.twoFactorRecoveryCode.deleteMany({ where: { userId: targetUserId } }),
    ]);
    return { enabled: false };
  }

  // ------------------------------------------------------------- internals

  /**
   * Verify a TOTP or recovery code without consuming it (authorizes sensitive
   * self-service actions like disabling 2FA).
   */
  private async assertValidSecondFactor(
    userId: string,
    encryptedSecret: string,
    code: string,
    now: Date,
  ): Promise<void> {
    const ok = await this.matchSecondFactor(userId, encryptedSecret, code, now);
    if (!ok) {
      throw new UnauthorizedException('Invalid or expired verification code');
    }
  }

  /** Verify and consume (recovery codes burn; TOTP steps cannot repeat). */
  private async consumeSecondFactor(
    userId: string,
    encryptedSecret: string,
    code: string,
  ): Promise<boolean> {
    return this.matchSecondFactor(userId, encryptedSecret, code, new Date(), true);
  }

  private async matchSecondFactor(
    userId: string,
    encryptedSecret: string,
    code: string,
    now: Date,
    consume = false,
  ): Promise<boolean> {
    const normalized = String(code ?? '').trim();
    const secret = decryptTotpSecret(encryptedSecret, this.encryptionKeyMaterial());

    // 1) TOTP branch (6 digits).
    if (/^\d{6}$/.test(normalized)) {
      const { valid, step } = verifyTotp(secret, normalized, now.getTime());
      if (!valid || step === null) {
        return false;
      }
      if (consume) {
        // Replay guard: the same 30s step must not authorize twice. The
        // watermark stores the step start time of the last accepted code.
        const record = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { twoFactorVerifiedAt: true },
        });
        const last = record?.twoFactorVerifiedAt?.getTime() ?? 0;
        const stepStart = step * 30_000;
        if (last > stepStart && now.getTime() - last < TOTP_REPLAY_GRACE_MS) {
          return false;
        }
        await this.prisma.user.update({
          where: { id: userId },
          data: { twoFactorVerifiedAt: now },
        });
      }
      return true;
    }

    // 2) Recovery-code branch (xxxxx-xxxxx, separators optional).
    const stripped = normalized.toUpperCase().replace(/[\s-]/g, '');
    if (!/^[A-Z2-9]{10}$/.test(stripped)) {
      return false;
    }
    const candidates = await this.prisma.twoFactorRecoveryCode.findMany({
      where: { userId, usedAt: null },
      select: { id: true, codeHash: true },
    });
    for (const candidate of candidates) {
      if (await bcrypt.compare(stripped, candidate.codeHash)) {
        if (consume) {
          // Atomic single-use claim: parallel replays lose the race.
          const claimed = await this.prisma.twoFactorRecoveryCode.updateMany({
            where: { id: candidate.id, usedAt: null },
            data: { usedAt: new Date() },
          });
          return claimed.count === 1;
        }
        return true;
      }
    }
    return false;
  }

  private buildOtpauthUrl(secret: string, accountName: string): string {
    const issuer = 'Kia';
    const label = encodeURIComponent(`${issuer}:${accountName}`);
    const params = new URLSearchParams({
      secret,
      issuer,
      algorithm: 'SHA1',
      digits: '6',
      period: '30',
    });
    return `otpauth://totp/${label}?${params.toString()}`;
  }

  private generateRecoveryCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < RECOVERY_CODE_COUNT; i += 1) {
      let code = '';
      for (let b = 0; b < RECOVERY_CODE_BLOCKS; b += 1) {
        if (b > 0) code += '-';
        for (let c = 0; c < RECOVERY_CODE_BLOCK_LEN; c += 1) {
          code += RECOVERY_CODE_ALPHABET[randomInt(0, RECOVERY_CODE_ALPHABET.length)];
        }
      }
      codes.push(code);
    }
    return codes;
  }

  private assertStaff(user: AuthUser): void {
    if (!this.isTwoFactorEligibleRole(user.role)) {
      throw new ForbiddenException('Two-factor authentication is available to staff accounts only');
    }
  }

  private isCustomStaffRole(role: string): boolean {
    return role !== 'LEARNER' && role !== 'ADMIN' && role !== 'SUPER_ADMIN';
  }

  private challengeSecret(): string {
    return this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
  }

  private encryptionKeyMaterial(): string {
    return this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
  }
}
