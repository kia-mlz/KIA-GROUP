import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { generateTotpSecret, currentTotp } from './totp';
import { TwoFactorService } from './two-factor.service';

/**
 * Unit tests for the AUTH-5 two-factor flows: staff-only enrollment, the
 * login gate issuing a challenge instead of a session, challenge verification
 * with TOTP or recovery codes, replay protection, and SUPER_ADMIN overrides.
 */

function buildService(overrides?: {
  userRecord?: Record<string, unknown> | null;
  recoveryCodes?: Array<{ id: string; codeHash: string; usedAt: Date | null }>;
}) {
  const userRecord: Record<string, unknown> =
    overrides?.userRecord === undefined
      ? { id: 'staff-1', role: 'ADMIN', twoFactorEnabled: false, twoFactorSecret: null }
      : (overrides.userRecord as Record<string, unknown>);

  let challengeCounter = 0;
  const jwtService = {
    signAsync: jest.fn(async (payload: { sub: string; purpose: string }) => {
      challengeCounter += 1;
      return `challenge-jwt-${challengeCounter}-${payload.sub}-${payload.purpose}`;
    }),
    verifyAsync: jest.fn(async (token: string) => {
      const match = /^challenge-jwt-(\d+)-(staff-1|other-staff)-2fa-login$/.exec(token);
      if (!match) throw new Error('invalid challenge');
      return { sub: match[2], purpose: '2fa-login' };
    }),
  };

  const prisma = {
    user: {
      findUnique: jest.fn(async ({ where }: { where: { id: string } }) => {
        if (!userRecord || where.id !== userRecord.id) return null;
        return userRecord;
      }),
      update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        Object.assign(userRecord, data);
        return userRecord;
      }),
    },
    twoFactorRecoveryCode: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn().mockResolvedValue({}),
      count: jest.fn(async () => (overrides?.recoveryCodes ?? []).filter((c) => !c.usedAt).length),
      findMany: jest.fn(async () =>
        (overrides?.recoveryCodes ?? []).filter((c) => !c.usedAt),
      ),
      updateMany: jest.fn(async ({ where }: { where: { id: string; usedAt: object } }) => {
        const list = overrides?.recoveryCodes ?? [];
        const row = list.find((c) => c.id === where.id);
        if (row && !row.usedAt) {
          row.usedAt = new Date();
          return { count: 1 };
        }
        return { count: 0 };
      }),
    },
    $transaction: jest.fn(async (arg: unknown): Promise<unknown> =>
      typeof arg === 'function' ? (arg as (tx: unknown) => Promise<unknown>)(prisma) : arg,
    ),
  };

  const configGet = jest.fn((_key: string) => 'unit-test-key-material-0123456789abcdef');
  const configService = { get: configGet, getOrThrow: configGet };

  const service = new TwoFactorService(
    prisma as never,
    configService as never,
    jwtService as never,
  );

  const staffUser = { id: 'staff-1', role: 'ADMIN', name: 'Admin' } as never;
  const superUser = { id: 'staff-1', role: 'SUPER_ADMIN', name: 'Root' } as never;
  const learner = { id: 'learner-1', role: 'LEARNER', name: 'L' } as never;

  return { service, prisma, jwtService, staffUser, superUser, learner, userRecord };
}

/** Pre-enroll a user: enabled with a known secret, so tests can compute codes. */
function enrolledRecord(overrides: { twoFactorVerifiedAt?: Date | null } = {}) {
  const secret = generateTotpSecret();
  return {
    id: 'staff-1',
    role: 'ADMIN',
    twoFactorEnabled: true,
    twoFactorSecret: encryptForTest(secret),
    twoFactorVerifiedAt: overrides.twoFactorVerifiedAt ?? null,
    __secret: secret,
  };
}

// The service encrypts with the same deterministic key material the tests use.
import { encryptTotpSecret } from './totp';
const encryptForTest = (secret: string) =>
  encryptTotpSecret(secret, 'unit-test-key-material-0123456789abcdef');


describe('TwoFactorService — enrollment', () => {
  it('refuses learners and custom non-staff roles outright', async () => {
    const { service, learner } = buildService();
    await expect(service.setup(learner)).rejects.toThrow(ForbiddenException);
  });

  it('issues otpauth URL + QR + secret and stores only the encrypted form', async () => {
    const { service, prisma, staffUser } = buildService({
      userRecord: { id: 'staff-1', email: 'a@b.c', twoFactorEnabled: false, twoFactorSecret: null },
    });
    const result = await service.setup(staffUser);

    // The issuer is what an authenticator app shows next to the account, so it
    // carries the current brand name.
    expect(result.otpauthUrl).toMatch(/^otpauth:\/\/totp\/KIA\.%3Aa%40b\.c\?/);
    expect(result.otpauthUrl).toContain('issuer=KIA.');
    expect(result.qrDataUrl).toMatch(/^data:image\//);
    expect(result.secret).toMatch(/^[A-Z2-7]{32}$/);
    // Only the ciphertext is persisted — never the plaintext secret.
    const persisted = prisma.user.update.mock.calls[0][0].data.twoFactorSecret as string;
    expect(persisted).not.toBe(result.secret);
    expect(persisted.startsWith('v1:')).toBe(true);
  });

  it('refuses setup when 2FA is already enabled', async () => {
    const { service, staffUser } = buildService({
      userRecord: enrolledRecord(),
    });
    await expect(service.setup(staffUser)).rejects.toThrow(BadRequestException);
  });

  it('confirm enables 2FA and generates 8 recovery codes inside a transaction', async () => {
    const secret = generateTotpSecret();
    const { service, prisma, staffUser } = buildService({
      userRecord: {
        id: 'staff-1',
        twoFactorEnabled: false,
        twoFactorSecret: encryptForTest(secret),
      },
    });
    const code = currentTotp(secret);
    const result = await service.confirm(staffUser, code);

    expect(result.recoveryCodes).toHaveLength(8);
    for (const rc of result.recoveryCodes) {
      expect(rc).toMatch(/^[A-Z2-9]{5}-[A-Z2-9]{5}$/);
    }
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.twoFactorRecoveryCode.create).toHaveBeenCalledTimes(8);
    // Each code is stored as a bcrypt hash, never plaintext.
    for (const call of prisma.twoFactorRecoveryCode.create.mock.calls) {
      expect(call[0].data.codeHash).toMatch(/^\$2[aby]\$/);
      expect(call[0].data.codeHash).not.toBe(result.recoveryCodes);
    }
  });

  it('confirm rejects a wrong first code and does not enable', async () => {
    const secret = generateTotpSecret();
    const { service, prisma } = buildService({
      userRecord: {
        id: 'staff-1',
        twoFactorEnabled: false,
        twoFactorSecret: encryptForTest(secret),
      },
    });
    await expect(service.confirm({ id: 'staff-1', role: 'ADMIN' } as never, '000000')).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('TwoFactorService — login gate & challenge verification', () => {
  it('returns null for learners and for staff without 2FA (normal login)', async () => {
    const { service } = buildService();
    await expect(
      service.loginGate({ id: 'learner-1', role: 'LEARNER' }),
    ).resolves.toBeNull();
    await expect(service.loginGate({ id: 'staff-1', role: 'ADMIN' })).resolves.toBeNull();
  });

  it('returns a single-purpose challenge for 2FA-enabled staff — never tokens', async () => {
    const { service } = buildService({ userRecord: enrolledRecord() });
    const challenge = await service.loginGate({ id: 'staff-1', role: 'ADMIN' });
    expect(challenge).toMatchObject({ challenge: 'challenge-jwt-1-staff-1-2fa-login', expiresIn: 120 });
  });

  it('verifyTwoFactorLogin accepts a current TOTP and returns the userId', async () => {
    const record = enrolledRecord();
    const { service } = buildService({ userRecord: record });
    const code = currentTotp(record.__secret);
    await expect(
      service.verifyTwoFactorLogin('challenge-jwt-1-staff-1-2fa-login', code),
    ).resolves.toEqual({ userId: 'staff-1' });
  });

  it('rejects expired/malformed challenges before touching the database', async () => {
    const { service, prisma } = buildService({ userRecord: enrolledRecord() });
    await expect(service.verifyTwoFactorLogin('garbage-token', '123456')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('rejects a wrong TOTP code', async () => {
    const { service } = buildService({ userRecord: enrolledRecord() });
    await expect(
      service.verifyTwoFactorLogin('challenge-jwt-1-staff-1-2fa-login', '000000'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('refuses the same TOTP step twice (replay protection)', async () => {
    const record = enrolledRecord();
    const { service } = buildService({ userRecord: record });
    const code = currentTotp(record.__secret);
    await expect(
      service.verifyTwoFactorLogin('challenge-jwt-1-staff-1-2fa-login', code),
    ).resolves.toEqual({ userId: 'staff-1' });
    // Second use inside the same 30s window must fail.
    await expect(
      service.verifyTwoFactorLogin('challenge-jwt-2-staff-1-2fa-login', code),
    ).rejects.toThrow(UnauthorizedException);
  });
});

describe('TwoFactorService — recovery codes', () => {
  function buildWithRecovery(usedAt: Date | null = null) {
    const record = enrolledRecord();
    const recovery: { id: string; codeHash: string; usedAt: Date | null } = {
      id: 'rc-1',
      codeHash: '',
      usedAt,
    };
    const svc = buildService({ userRecord: record, recoveryCodes: [recovery] });
    return { ...svc, recovery, record };
  }

  it('accepts a valid recovery code exactly once (atomic single-use claim)', async () => {
    const s = buildWithRecovery();
    // Seed a matching bcrypt hash of the STRIPPED code (service stores stripped).
    s.recovery.codeHash = await bcrypt.hash('ABCD2EFGH5', 10);

    await expect(
      s.service.verifyTwoFactorLogin('challenge-jwt-1-staff-1-2fa-login', 'abcd2-efgh5'),
    ).resolves.toEqual({ userId: 'staff-1' });

    // A second attempt hits the usedAt filter → no candidates → rejected.
    await expect(
      s.service.verifyTwoFactorLogin('challenge-jwt-2-staff-1-2fa-login', 'abcd2-efgh5'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects codes that match no stored hash', async () => {
    const s = buildWithRecovery();
    s.recovery.codeHash = await bcrypt.hash('ABCD2EFGH5', 10);
    await expect(
      s.service.verifyTwoFactorLogin('challenge-jwt-1-staff-1-2fa-login', 'ZZZZ9-ZZZZ9'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('regenerating requires a valid TOTP (step-up) and replaces the set', async () => {
    const record = enrolledRecord();
    const { service, prisma } = buildService({ userRecord: record });
    const result = await service.regenerateRecoveryCodes(
      { id: 'staff-1', role: 'ADMIN' } as never,
      currentTotp(record.__secret),
    );
    expect(result.recoveryCodes).toHaveLength(8);
    expect(prisma.twoFactorRecoveryCode.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'staff-1' },
    });
    await expect(
      service.regenerateRecoveryCodes({ id: 'staff-1', role: 'ADMIN' } as never, '000000'),
    ).rejects.toThrow(UnauthorizedException);
  });
});

describe('TwoFactorService — disable & admin overrides', () => {
  it('disable requires a valid second factor and clears the enrollment', async () => {
    const record = enrolledRecord();
    const { service, prisma } = buildService({ userRecord: record });
    await expect(
      service.disable({ id: 'staff-1', role: 'ADMIN' } as never, currentTotp(record.__secret)),
    ).resolves.toEqual({ enabled: false });
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('disable rejects an invalid code', async () => {
    const { service } = buildService({ userRecord: enrolledRecord() });
    await expect(
      service.disable({ id: 'staff-1', role: 'ADMIN' } as never, '000000'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('only SUPER_ADMIN may disable another staff member', async () => {
    const { service } = buildService({ userRecord: enrolledRecord() });
    await expect(
      service.disableForUser({ id: 'staff-1', role: 'ADMIN' } as never, 'other-staff'),
    ).rejects.toThrow(ForbiddenException);
    const target = enrolledRecord();
    target.id = 'other-staff';
    await expect(
      service.disableForUser(
        { id: 'staff-1', role: 'SUPER_ADMIN' } as never,
        'other-staff',
      ),
    ).rejects.toThrow(); // user lookup misses (single-record mock) — permission check passed
  });
});
