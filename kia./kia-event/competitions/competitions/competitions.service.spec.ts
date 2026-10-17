import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CompetitionsService } from './competitions.service';

/** Minimal Prisma/EventBus fakes cast past the DI-typed constructors. */
const asDi = <T>(value: unknown) => value as T;

const activeCompetition = {
  id: 'comp-1',
  slug: 'autumn-sprint',
  title: 'Autumn Sprint',
  description: 'desc',
  startsAt: new Date(Date.now() - 1_000),
  endsAt: new Date(Date.now() + 86_400_000),
  active: true,
  createdAt: new Date(),
};

type PrismaError = { code?: string };

function makeService(opts: {
  competition?: typeof activeCompetition | null;
  existingRegistration?: { id: string } | null;
  createError?: PrismaError | Error | null;
}) {
  const create = jest.fn().mockImplementation(async () => {
    if (opts.createError) throw opts.createError;
    return { id: 'reg-1' };
  });
  const competition = opts.competition === undefined ? activeCompetition : opts.competition;
  const prisma = {
    competition: {
      findUnique: jest.fn().mockResolvedValue(competition),
    },
    competitionRegistration: {
      findUnique: jest.fn().mockResolvedValue(opts.existingRegistration ?? null),
      create,
    },
  };
  const events = { publish: jest.fn().mockResolvedValue(undefined) };
  const service = new CompetitionsService(asDi(prisma), asDi(events));
  return { service, prisma, create, events };
}

describe('CompetitionsService.register', () => {
  it('registers an active competition and publishes the domain event', async () => {
    const { service, events } = makeService({});

    const summary = await service.register('user-1', 'autumn-sprint');

    expect(summary.registered).toBe(true);
    expect(events.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'events.registration.created',
        userId: 'user-1',
        competitionId: 'comp-1',
      }),
    );
  });

  it('rejects unknown or inactive competitions with 404', async () => {
    const { service } = makeService({ competition: null });
    await expect(service.register('user-1', 'nope')).rejects.toBeInstanceOf(NotFoundException);

    const { service: inactive } = makeService({
      competition: { ...activeCompetition, active: false },
    });
    await expect(inactive.register('user-1', 'autumn-sprint')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects registration after the competition ended', async () => {
    const { service } = makeService({
      competition: { ...activeCompetition, endsAt: new Date(Date.now() - 1) },
    });
    await expect(service.register('user-1', 'autumn-sprint')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects a duplicate registration with 409', async () => {
    const { service } = makeService({ existingRegistration: { id: 'reg-0' } });
    await expect(service.register('user-1', 'autumn-sprint')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('REGRESSION: concurrent duplicate loses the DB race as a clean 409, not a 500', async () => {
    // Two parallel requests both pass the findUnique pre-check; the DB unique
    // constraint (userId, competitionId) is the single-winner. The loser must
    // see ConflictException — not a raw Prisma P2002 bubbling up as HTTP 500.
    const { service, events } = makeService({
      existingRegistration: null, // pre-check passes for BOTH callers
      createError: { code: 'P2002' },
    });

    await expect(service.register('user-1', 'autumn-sprint')).rejects.toBeInstanceOf(
      ConflictException,
    );
    // The losing racer must not announce a registration that never happened.
    expect(events.publish).not.toHaveBeenCalled();
  });

  it('rethrows non-P2002 create failures unchanged', async () => {
    const { service } = makeService({
      createError: new Error('connection lost'),
    });
    await expect(service.register('user-1', 'autumn-sprint')).rejects.toThrow('connection lost');
  });
});
