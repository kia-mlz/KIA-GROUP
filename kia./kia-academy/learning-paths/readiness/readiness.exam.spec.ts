import { ReadinessService } from './readiness.service';
import {
  EXAM_QUESTION_BANK,
  gradeAttempt,
  buildExamOutcome,
} from '@kia./shared';

function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    examAttempt: {
      findFirst: jest.fn(),
      create: jest.fn().mockResolvedValue({
        id: 'at-1',
        userId: 'u1',
        roadmapId: null,
        blueprintVersion: 'v1',
        status: 'IN_PROGRESS',
        questionIds: JSON.stringify(EXAM_QUESTION_BANK.map((q) => q.id)),
        answers: '{}',
        startedAt: new Date(),
        endsAt: new Date(Date.now() + 60_000),
        submittedAt: null,
        outcome: null,
        verdict: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: jest.fn(),
    },
    roadmap: { findFirst: jest.fn().mockResolvedValue(null), findUnique: jest.fn() },
    readinessTest: { create: jest.fn().mockResolvedValue({}) },
    user: { findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'u1', name: '', email: null }) },
    ...overrides,
  };
}

function makeService(prisma: Record<string, unknown>) {
  return new ReadinessService(
    prisma as never,
    { sendReadinessResults: jest.fn().mockResolvedValue(undefined) } as never,
    { get: jest.fn().mockResolvedValue({ readiness: { passThreshold: 50 } }) } as never,
    { getExamQuestions: jest.fn().mockResolvedValue(EXAM_QUESTION_BANK) } as never,
    {} as never,
    {} as never,
  );
}

describe('ReadinessService exam integrity', () => {
  describe('submitExam expiration enforcement', () => {
    it('expires and rejects a submission that arrives after endsAt', async () => {
      const prisma = makePrisma();
      prisma.examAttempt.findFirst!.mockResolvedValue({
        id: 'at-expired',
        userId: 'u1',
        roadmapId: null,
        blueprintVersion: 'v1',
        status: 'IN_PROGRESS',
        questionIds: JSON.stringify(EXAM_QUESTION_BANK.map((q) => q.id)),
        answers: '{}',
        startedAt: new Date(Date.now() - 120_000),
        endsAt: new Date(Date.now() - 60_000),
        submittedAt: null,
        outcome: null,
        verdict: null,
      });
      // The atomic claim loses (status already flipped / row is gone after expiry).
      prisma.examAttempt.updateMany!.mockResolvedValue({ count: 0 });
      prisma.examAttempt.findUniqueOrThrow!.mockResolvedValue({
        id: 'at-expired',
        status: 'EXPIRED',
      });

      const service = makeService(prisma);
      await expect(service.submitExam('at-expired', 'u1', {})).rejects.toThrow(
        'Exam attempt cannot be submitted',
      );
      expect(prisma.examAttempt.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'IN_PROGRESS' }),
        }),
      );
    });

    it('allows an in-time submission and persists the result once', async () => {
      const prisma = makePrisma();
      prisma.examAttempt.findFirst!.mockResolvedValue({
        id: 'at-1',
        userId: 'u1',
        roadmapId: 'rm-1',
        blueprintVersion: 'v1',
        status: 'IN_PROGRESS',
        questionIds: JSON.stringify(EXAM_QUESTION_BANK.map((q) => q.id)),
        answers: '{}',
        startedAt: new Date(),
        endsAt: new Date(Date.now() + 60_000),
        submittedAt: null,
        outcome: null,
        verdict: null,
      });
      prisma.examAttempt.updateMany!.mockResolvedValue({ count: 1 });
      const updated = {
        id: 'at-1',
        status: 'SUBMITTED',
        outcome: JSON.stringify({ roadmapModules: [] }),
        verdict: JSON.stringify({ icon: '🎉', title: { en: 'x' } }),
        domainScores: JSON.stringify({}),
        percentages: JSON.stringify({}),
        submittedAt: new Date(),
        average: 80,
        passed: true,
        roadmapId: 'rm-1',
      };
      prisma.examAttempt.update!.mockResolvedValue(updated);
      prisma.roadmap.findFirst!.mockResolvedValue(null);

      const service = makeService(prisma);
      const result = await service.submitExam('at-1', 'u1', {});
      expect(prisma.examAttempt.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'SUBMITTED' }),
        }),
      );
      expect(result).toBeDefined();
    });
  });

  describe('startExam one-active-attempt invariant', () => {
    it('returns an existing live attempt instead of creating a duplicate', async () => {
      const prisma = makePrisma();
      prisma.roadmap.findFirst!.mockResolvedValue({ id: 'rm-1' });
      prisma.examAttempt.findFirst!.mockResolvedValue({
        id: 'at-live',
        userId: 'u1',
        roadmapId: 'rm-1',
        blueprintVersion: 'v1',
        status: 'IN_PROGRESS',
        questionIds: JSON.stringify(EXAM_QUESTION_BANK.map((q) => q.id)),
        answers: '{}',
        startedAt: new Date(),
        endsAt: new Date(Date.now() + 60_000),
        submittedAt: null,
      });
      const service = makeService(prisma);
      const session = await service.startExam('u1', 'rm-1');
      expect(prisma.examAttempt.create).not.toHaveBeenCalled();
      expect(session.attemptId).toBe('at-live');
    });

    it('releases an expired attempt and creates a fresh one', async () => {
      const prisma = makePrisma();
      prisma.roadmap.findFirst!.mockResolvedValue({ id: 'rm-1' });
      prisma.examAttempt.findFirst!.mockResolvedValue({
        id: 'at-expired',
        userId: 'u1',
        roadmapId: 'rm-1',
        blueprintVersion: 'v1',
        status: 'IN_PROGRESS',
        questionIds: JSON.stringify(EXAM_QUESTION_BANK.map((q) => q.id)),
        answers: '{}',
        startedAt: new Date(Date.now() - 120_000),
        endsAt: new Date(Date.now() - 60_000),
        submittedAt: null,
      });
      const service = makeService(prisma);
      await service.startExam('u1', 'rm-1');
      expect(prisma.examAttempt.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'EXPIRED' } }),
      );
      expect(prisma.examAttempt.create).toHaveBeenCalledTimes(1);
    });

    it('handles a P2002 race by returning the existing active attempt', async () => {
      const prisma = makePrisma();
      prisma.roadmap.findFirst!.mockResolvedValue({ id: 'rm-1' });
      prisma.examAttempt.findFirst!
        .mockResolvedValueOnce(null) // no existing live attempt
        .mockResolvedValueOnce({
          id: 'at-active',
          userId: 'u1',
          roadmapId: 'rm-1',
          blueprintVersion: 'v1',
          status: 'IN_PROGRESS',
          questionIds: JSON.stringify(EXAM_QUESTION_BANK.map((q) => q.id)),
          answers: '{}',
          startedAt: new Date(),
          endsAt: new Date(Date.now() + 60_000),
          submittedAt: null,
        });
      prisma.examAttempt.create!.mockRejectedValue({
        code: 'P2002',
        message: 'unique violation',
      });
      const service = makeService(prisma);
      const session = await service.startExam('u1', 'rm-1');
      expect(session.attemptId).toBe('at-active');
    });
  });

  describe('ReadinessService exam helpers', () => {
  it('grades bank questions server-side without trusting client scores', () => {
    const answers = Object.fromEntries(
      EXAM_QUESTION_BANK.map((q) => {
        if (q.type === 'single_choice') {
          return [q.id, { type: 'single_choice' as const, optionId: 'zzz' }];
        }
        if (q.type === 'multi_choice') {
          return [q.id, { type: 'multi_choice' as const, optionIds: [] }];
        }
        if (q.type === 'order') {
          return [q.id, { type: 'order' as const, orderedIds: [] }];
        }
        return [q.id, { type: 'fill_blank' as const, values: ['wrong'] }];
      }),
    );

    const graded = gradeAttempt(EXAM_QUESTION_BANK, answers);
    expect(graded.passed).toBe(false);
    expect(graded.average).toBe(0);

    const outcome = buildExamOutcome({
      passed: false,
      average: 0,
      percentages: graded.percentages,
      roadmap: {
        id: 'r1',
        modules: ['JavaScript Core'],
        level: 'absoluteBeginner',
      },
    });
    expect(outcome.refreshersInserted.length).toBe(5);
    expect(outcome.roadmapModules[0]?.startsWith('Refresher:')).toBe(true);
  });

  it('exports ReadinessService', () => {
    expect(ReadinessService).toBeDefined();
  });
});
});
