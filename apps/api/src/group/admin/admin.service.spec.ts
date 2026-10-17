import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '@kia./shared';
import { AdminService } from './admin.service';

const actor: AuthUser = {
  id: 'admin-1',
  name: 'Admin',
  email: 'admin@kia.academy',
  phone: '09120000000',
  role: 'SUPER_ADMIN',
  profileComplete: true,
};

function makeService(prisma: unknown) {
  return new AdminService(
    prisma as never,
    {
      deleteByPublicUrl: jest.fn(),
      clearLessonDir: jest.fn(),
      saveLessonVideo: jest.fn(),
    } as never,
    { get: jest.fn() } as never,
    { record: jest.fn().mockResolvedValue(undefined) } as never,
    { refundOrder: jest.fn() } as never,
  );
}

describe('AdminService.getStats', () => {
  it('returns the shared flat AdminStats shape', async () => {
    const prisma = {
      user: { count: jest.fn().mockResolvedValue(10) },
      course: { count: jest.fn().mockResolvedValue(4) },
      lesson: { count: jest.fn().mockResolvedValue(20) },
      challenge: {
        count: jest.fn().mockResolvedValueOnce(5).mockResolvedValueOnce(2),
      },
      payment: {
        count: jest.fn().mockResolvedValue(7),
        aggregate: jest.fn().mockResolvedValue({ _sum: { amountCents: 19000 } }),
      },
      enrollment: { count: jest.fn().mockResolvedValue(12) },
    };

    const service = makeService(prisma);
    await expect(service.getStats()).resolves.toEqual({
      users: 10,
      courses: 4,
      lessons: 20,
      enrollments: 12,
      payments: 7,
      revenueCents: 19000,
      challenges: 5,
      activeChallenges: 2,
    });
  });
});


describe('AdminService.updateUserRole session revocation', () => {
  it('deletes the target user refresh tokens when their role changes', async () => {
    const deleteMany = jest.fn().mockResolvedValue({ count: 2 });
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'u1',
          name: 'Learner',
          email: 'learner@kia.academy',
          phone: '09120000001',
          role: 'LEARNER',
          status: 'ACTIVE',
          createdAt: new Date(),
          adminPanelAccess: null,
        }),
      },
      role: { findUnique: jest.fn() },
      $transaction: jest.fn(async (cb: (tx: never) => Promise<unknown>) =>
        cb({
          user: {
            update: jest.fn().mockResolvedValue({
              id: 'u1',
              name: 'Learner',
              email: 'learner@kia.academy',
              phone: '09120000001',
              role: 'ADMIN',
              status: 'ACTIVE',
              createdAt: new Date(),
              adminPanelAccess: { users: ['read'] },
            }),
          },
          refreshToken: { deleteMany },
        } as never),
      ),
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new AdminService(
      prisma as never,
      {
        deleteByPublicUrl: jest.fn(),
        clearLessonDir: jest.fn(),
        saveLessonVideo: jest.fn(),
      } as never,
      { get: jest.fn().mockResolvedValue({ adminAccess: { users: ['read'] } }) } as never,
      audit as never,
      { refundOrder: jest.fn() } as never,
    );

    await service.updateUserRole('u1', { role: 'ADMIN' }, actor);
    expect(deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'user.role_change', before: { role: 'LEARNER' }, after: { role: 'ADMIN' } }),
    );
  });

  it('keeps refresh tokens when the role is unchanged', async () => {
    const deleteMany = jest.fn().mockResolvedValue({ count: 0 });
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'u1',
          name: 'Admin',
          email: 'admin@kia.academy',
          phone: '09120000000',
          role: 'ADMIN',
          status: 'ACTIVE',
          createdAt: new Date(),
          adminPanelAccess: null,
        }),
      },
      role: { findUnique: jest.fn() },
      $transaction: jest.fn(async (cb: (tx: never) => Promise<unknown>) =>
        cb({
          user: {
            update: jest.fn().mockResolvedValue({
              id: 'u1',
              name: 'Admin',
              email: 'admin@kia.academy',
              phone: '09120000000',
              role: 'ADMIN',
              status: 'ACTIVE',
              createdAt: new Date(),
              adminPanelAccess: { users: ['read'] },
            }),
          },
          refreshToken: { deleteMany },
        } as never),
      ),
    };
    const service = new AdminService(
      prisma as never,
      {
        deleteByPublicUrl: jest.fn(),
        clearLessonDir: jest.fn(),
        saveLessonVideo: jest.fn(),
      } as never,
      { get: jest.fn().mockResolvedValue({ adminAccess: { users: ['read'] } }) } as never,
      { record: jest.fn().mockResolvedValue(undefined) } as never,
      { refundOrder: jest.fn() } as never,
    );

    await service.updateUserRole('u1', { role: 'ADMIN' }, actor);
    expect(deleteMany).not.toHaveBeenCalled();
  });
});

describe('AdminService.createLesson', () => {
  it('creates a lesson under a course slug', async () => {
    const prisma = {
      course: {
        findUnique: jest.fn().mockResolvedValue({ id: 'c1', slug: 'js-core' }),
      },
      lesson: {
        findFirst: jest.fn().mockResolvedValue(null),
        aggregate: jest.fn().mockResolvedValue({ _max: { sortOrder: 1 } }),
        create: jest.fn().mockResolvedValue({
          id: 'l1',
          slug: 'intro',
          title: 'Intro',
          content: '# Hello',
          videoUrl: null,
          durationMin: 10,
          sortOrder: 2,
        }),
      },
    };

    const service = makeService(prisma);
    const lesson = await service.createLesson(
      'js-core',
      { slug: 'intro', title: 'Intro', content: '# Hello' },
      actor,
    );

    expect(lesson.slug).toBe('intro');
    expect(prisma.lesson.create).toHaveBeenCalled();
  });
});


describe('AdminService.listUsers', () => {
  it('paginates, filters and maps users without leaking passwords', async () => {
    const user = {
      id: 'u1',
      name: 'Alex',
      email: 'alex@kia.academy',
      phone: '09120000000',
      role: 'LEARNER',
      status: 'ACTIVE',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      adminPanelAccess: null,
    };
    const prisma = {
      user: {
        count: jest.fn().mockResolvedValue(25),
        findMany: jest.fn().mockResolvedValue([user]),
      },
    };

    const service = makeService(prisma);
    const result = await service.listUsers({ page: 2, limit: 20, search: 'alex', role: 'LEARNER' });

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ role: 'LEARNER' }),
        skip: 20,
        take: 20,
      }),
    );
    expect(result).toEqual({
      items: [
        {
          id: 'u1',
          name: 'Alex',
          email: 'alex@kia.academy',
          phone: '09120000000',
          role: 'LEARNER',
          status: 'ACTIVE',
          createdAt: '2026-01-01T00:00:00.000Z',
          // DB-4: the list reports whether the row is soft-deleted.
          deleted: false,
          adminPanelAccess: null,
        },
      ],
      total: 25,
      page: 2,
      limit: 20,
      hasNext: false,
    });
  });

  /**
   * DB-4 visibility. The default must keep hidden accounts hidden — widening it
   * would expose deleted PII to every moderator — while the deleted/all views
   * are what make a mistaken deletion reversible.
   */
  it('hides soft-deleted accounts by default and surfaces them on request', async () => {
    function prismaFor() {
      return {
        user: {
          count: jest.fn().mockResolvedValue(0),
          findMany: jest.fn().mockResolvedValue([]),
        },
      };
    }

    const defaultPrisma = prismaFor();
    await makeService(defaultPrisma).listUsers({});
    expect(defaultPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ deletedAt: null }) }),
    );

    const deletedPrisma = prismaFor();
    await makeService(deletedPrisma).listUsers({ deleted: 'deleted' });
    expect(deletedPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deletedAt: { not: null } }),
      }),
    );

    const allPrisma = prismaFor();
    await makeService(allPrisma).listUsers({ deleted: 'all' });
    const whereArg = allPrisma.user.findMany.mock.calls[0]?.[0]?.where as Record<string, unknown>;
    expect(whereArg).not.toHaveProperty('deletedAt');
  });

  it('reports the deleted flag for a soft-deleted row', async () => {
    const prisma = {
      user: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'u3',
            name: 'Gone',
            email: null,
            phone: null,
            role: 'LEARNER',
            status: 'ACTIVE',
            createdAt: new Date('2026-01-01T00:00:00Z'),
            deletedAt: new Date('2026-02-01T00:00:00Z'),
            adminPanelAccess: null,
          },
        ]),
      },
    };

    const result = await makeService(prisma).listUsers({ deleted: 'deleted' });
    expect(result.items[0].deleted).toBe(true);
  });
});

describe('AdminService.updateUserStatus', () => {
  const learner = {
    id: 'u2',
    name: 'Learner',
    email: 'l@kia.academy',
    phone: null,
    role: 'LEARNER',
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    adminPanelAccess: null,
  };

  function statusPrisma(existing: Record<string, unknown>) {
    const txRefreshDelete = jest.fn().mockResolvedValue({ count: 2 });
    return {
      txRefreshDelete,
      user: {
        findUnique: jest.fn().mockResolvedValue(existing),
        update: jest.fn(),
      },
      refreshToken: { deleteMany: jest.fn().mockResolvedValue({ count: 2 }) },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          user: {
            update: jest.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) => ({
              ...existing,
              ...data,
            })),
          },
          refreshToken: { deleteMany: txRefreshDelete },
        }),
      ),
    };
  }

  it('suspends a learner with a reason and revokes sessions', async () => {
    const prisma = statusPrisma(learner);
    const service = makeService(prisma);

    const result = await service.updateUserStatus(
      'u2',
      { status: 'SUSPENDED', reason: 'abuse' },
      actor,
    );

    expect(result.status).toBe('SUSPENDED');
    expect(prisma.txRefreshDelete).toHaveBeenCalledWith({ where: { userId: 'u2' } });
  });

  it('requires a reason when suspending or banning', async () => {
    const service = makeService(statusPrisma(learner));

    await expect(
      service.updateUserStatus('u2', { status: 'SUSPENDED' }, actor),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('blocks self-status changes and super-admin suspension', async () => {
    const self = { ...learner, id: 'admin-1', role: 'SUPER_ADMIN' };
    const service = makeService(statusPrisma(self));

    await expect(
      service.updateUserStatus('admin-1', { status: 'BANNED', reason: 'x' }, actor),
    ).rejects.toBeInstanceOf(BadRequestException);

    const superTarget = { ...learner, role: 'SUPER_ADMIN' };
    const service2 = makeService(statusPrisma(superTarget));
    await expect(
      service2.updateUserStatus('u2', { status: 'BANNED', reason: 'x' }, actor),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('forbids moderators from changing staff status', async () => {
    const staff = { ...learner, role: 'ADMIN' };
    const service = makeService(statusPrisma(staff));

    await expect(
      service.updateUserStatus(
        'u2',
        { status: 'SUSPENDED', reason: 'x' },
        { ...actor, role: 'ADMIN' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects unknown statuses and missing users', async () => {
    const service = makeService(statusPrisma(learner));
    await expect(
      service.updateUserStatus('u2', { status: 'DELETED' } as never, actor),
    ).rejects.toBeInstanceOf(BadRequestException);

    const missing = statusPrisma(learner);
    (missing.user.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(
      makeService(missing).updateUserStatus('nope', { status: 'ACTIVE' }, actor),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('AdminService.softDeleteUser (DB-4)', () => {
  const baseUser = {
    id: 'user-1',
    name: 'Learner',
    email: 'learner@kia.academy',
    phone: '09120000001',
    role: 'LEARNER',
    status: 'ACTIVE',
    deletedAt: null,
    createdAt: new Date('2026-01-01'),
    adminPanelAccess: null,
    passwordHash: 'hash',
    twoFactorEnabled: false,
    suspendedAt: null,
    bio: 'hi',
    avatarUrl: null,
    province: null,
    city: null,
    firstName: null,
    lastName: null,
    profileComplete: true,
  };

  function txMock(updateResult: unknown) {
    return {
      refreshToken: { deleteMany: jest.fn().mockResolvedValue({ count: 2 }) },
      user: { update: jest.fn().mockResolvedValue(updateResult) },
    };
  }

  it('clears PII, bans the account, and forces logout inside a transaction', async () => {
    const updated = { ...baseUser, status: 'BANNED', name: 'abcdef0123456789', email: null };
    const tx = txMock(updated);
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ ...baseUser }) },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(tx)),
    };
    const service = makeService(prisma);

    const result = await service.softDeleteUser('user-1', 'gdpr request', actor);

    expect(tx.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    const data = tx.user.update.mock.calls[0][0].data;
    expect(data.status).toBe('BANNED');
    expect(data.email).toBeNull();
    expect(data.phone).toBeNull();
    expect(data.passwordHash).toBeNull();
    expect(data.deletedAt).toBeInstanceOf(Date);
    expect(result.status).toBe('BANNED');
  });

  it('refuses to soft-delete yourself', async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ ...baseUser, id: 'admin-1' }) },
      $transaction: jest.fn(),
    };
    const service = makeService(prisma);
    await expect(service.softDeleteUser('admin-1', 'x', actor)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('refuses to soft-delete the last super admin', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ ...baseUser, role: 'SUPER_ADMIN' }),
        count: jest.fn().mockResolvedValue(1),
      },
      $transaction: jest.fn(),
    };
    const service = makeService(prisma);
    await expect(service.softDeleteUser('user-1', 'x', actor)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('refuses to soft-delete an already-deleted account', async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ ...baseUser, deletedAt: new Date() }) },
      $transaction: jest.fn(),
    };
    const service = makeService(prisma);
    await expect(service.softDeleteUser('user-1', 'x', actor)).rejects.toThrow(ConflictException);
  });
});
