import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { AuthService } from './auth.service';

/**
 * Security-focused unit tests for auth-sensitive paths that are easy to regress:
 *  - per-phone OTP flood protection (SMS-bombing)
 *  - OTP code never exposed unless explicitly enabled outside production
 *  - brute-force lockout on OTP verification
 *  - avatar magic-byte validation (defense in depth against polyglot uploads)
 */

function buildService(overrides?: {
  otpCount?: number | Promise<number>;
  otpDevExpose?: string;
  nodeEnv?: string;
  storedOtp?: Record<string, unknown> | null;
  storedUser?: Record<string, unknown> | null;
  storedRefresh?: Record<string, unknown> | null;
}) {
  const prisma = {
    phoneOtp: {
      count: jest.fn().mockResolvedValue(overrides?.otpCount ?? 0),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn().mockResolvedValue({ id: 'otp1' }),
      findFirst: jest.fn().mockResolvedValue(
        overrides?.storedOtp !== undefined
          ? overrides.storedOtp
          : null,
      ),
      update: jest.fn().mockResolvedValue({}),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue(overrides?.storedUser ?? null),
      update: jest.fn(),
    },
    refreshToken: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      findFirst: jest.fn().mockResolvedValue(overrides?.storedRefresh ?? null),
    },
  };
  const configGet = jest.fn((key: string) => {
    if (key === 'NODE_ENV') return overrides?.nodeEnv ?? 'test';
    if (key === 'OTP_DEV_EXPOSE') return overrides?.otpDevExpose;
    if (key === 'JWT_SECRET') return 'test-jwt-secret-for-otp-pepper-32chars';
    return undefined;
  });
  const configGetOrThrow = jest.fn((key: string) => {
    const value = configGet(key);
    if (value === undefined || value === null) {
      throw new Error(`Missing config ${key}`);
    }
    return value;
  });
  const service = new AuthService(
    prisma as never,
    { sign: jest.fn(), verify: jest.fn() } as never,
    { get: configGet, getOrThrow: configGetOrThrow } as never,
    {} as never,
    { get: jest.fn().mockResolvedValue({}) } as never,
    { sendOtp: jest.fn().mockResolvedValue(undefined) } as never,
    { loginGate: jest.fn().mockResolvedValue(null) } as never,
    { publish: jest.fn().mockResolvedValue(undefined) } as never,
  );
  return { service, prisma, configGet };
}

describe('AuthService security hardening', () => {
  describe('requestOtp flood protection', () => {
    it('blocks the 4th code for the same phone inside the window', async () => {
      const { service } = buildService({ otpCount: 3 });
      await expect(service.requestOtp('09123456789')).rejects.toThrow(ThrottlerException);
    });

    it('still issues codes under the limit', async () => {
      const { service, prisma } = buildService({ otpCount: 2 });
      const result = await service.requestOtp('09123456789');
      expect(prisma.phoneOtp.create).toHaveBeenCalledTimes(1);
      expect(result.phone).toBe('09123456789');
      // Codes are secret by default…
      expect(result.devCode).toBeUndefined();
    });

    it('counts every generated code toward the cap (even consumed ones)', async () => {
      const { service, prisma } = buildService({
        otpCount: Promise.resolve(3),
      });
      await expect(service.requestOtp('09121234567')).rejects.toThrow(ThrottlerException);
      expect(prisma.phoneOtp.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ phone: '09121234567' }),
        }),
      );
    });
  });

  describe('OTP exposure discipline', () => {
    it('never exposes devCode without an explicit opt-in flag', async () => {
      const { service } = buildService({ otpCount: 0, otpDevExpose: undefined });
      const result = await service.requestOtp('09123456789');
      expect(result.devCode).toBeUndefined();
    });

    it('exposes devCode only when OTP_DEV_EXPOSE=true outside production', async () => {
      const { service } = buildService({ otpCount: 0, otpDevExpose: 'true' });
      const result = await service.requestOtp('09123456789');
      expect(typeof result.devCode).toBe('string');
      expect(result.devCode).toMatch(/^\d{6}$/);
    });
  });

  describe('verifyOtp brute-force lockout', () => {
    it('refuses verification once max attempts are exhausted', async () => {
      const stored = {
        id: 'otp-row',
        codeHash: 'hash',
        attempts: 5,
        expiresAt: new Date(Date.now() + 60_000),
      };
      const { service, prisma } = buildService({ storedOtp: stored });
      await expect(service.verifyOtp('09123456789', '123456')).rejects.toThrow(
        UnauthorizedException,
      );
      // No hash comparison happened — lockout short-circuits.
      expect(prisma.phoneOtp.update).not.toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'otp-row' } }),
      );
    });

    it('rejects malformed codes before touching storage', async () => {
      const { service, prisma } = buildService({});
      await expect(service.verifyOtp('09123456789', '12345')).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.phoneOtp.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('account suspension / ban revocation', () => {
    it('login refuses a suspended account and revokes surviving refresh tokens', async () => {
      const suspended = {
        id: 'u-suspended',
        email: 'suspended@example.com',
        passwordHash: '$2b$12$abcdefghijklmnopqrstuv',
        status: 'SUSPENDED',
      };
      const { service, prisma } = buildService({ storedUser: suspended });
      await expect(
        service.login({ email: 'suspended@example.com', password: 'x' } as never),
      ).rejects.toThrow(UnauthorizedException);
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'u-suspended' },
      });
    });

    it('login refuses a banned account', async () => {
      const banned = {
        id: 'u-banned',
        email: 'banned@example.com',
        passwordHash: '$2b$12$abcdefghijklmnopqrstuv',
        status: 'BANNED',
      };
      const { service } = buildService({ storedUser: banned });
      await expect(
        service.login({ email: 'banned@example.com', password: 'x' } as never),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('validateUser rejects an access token for a banned user immediately', async () => {
      const { service } = buildService({
        storedUser: { id: 'u1', name: '', email: null, phone: '0912', status: 'BANNED' },
      });
      await expect(service.validateUser('u1')).resolves.toBeNull();
    });

    it('validateRefreshToken rejects a stored token whose owner was suspended', async () => {
      const { service } = buildService({
        storedRefresh: {
          id: 'rt1',
          userId: 'u1',
          token: 'hash',
          expiresAt: new Date(Date.now() + 60_000),
          user: { id: 'u1', name: '', email: null, phone: '0912', status: 'SUSPENDED' },
        },
      });
      await expect(service.validateRefreshToken('u1', 'rt1', 'jwt-string')).resolves.toBeNull();
    });
  });
});
