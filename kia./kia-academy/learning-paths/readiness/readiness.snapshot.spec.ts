import { ReadinessService } from './readiness.service';
import { EXAM_QUESTION_BANK, type ExamQuestion } from '@kia./shared';

/**
 * EXAM-3: readiness attempts must pin a full question snapshot at start and be
 * served/graded from that snapshot — not from the live (admin-editable) bank.
 */

function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    examAttempt: {
      findFirst: jest.fn(),
      create: jest.fn(),
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

function makeService(
  prisma: Record<string, unknown>,
  bank: ExamQuestion[] = EXAM_QUESTION_BANK,
) {
  return new ReadinessService(
    prisma as never,
    { sendReadinessResults: jest.fn().mockResolvedValue(undefined) } as never,
    { get: jest.fn().mockResolvedValue({ readiness: { passThreshold: 50 } }) } as never,
    { getExamQuestions: jest.fn().mockResolvedValue(bank) } as never,
    {} as never,
    {} as never,
  );
}

/** A minimal single_choice question from the real bank (grading key included). */
const bankQ1 = EXAM_QUESTION_BANK.find((q) => q.type === 'single_choice') as ExamQuestion;

describe('ReadinessService EXAM-3 question snapshots', () => {
  it('pins the full question snapshot on the attempt at start', async () => {
    const prisma = makePrisma();
    prisma.examAttempt.create = jest.fn().mockResolvedValue({
      id: 'at-1',
      userId: 'u1',
      roadmapId: null,
      blueprintVersion: 'v1',
      status: 'IN_PROGRESS',
      questionIds: EXAM_QUESTION_BANK.map((q) => q.id),
      questions: EXAM_QUESTION_BANK,
      answers: {},
      startedAt: new Date(),
      endsAt: new Date(Date.now() + 60_000),
      submittedAt: null,
    });

    const service = makeService(prisma);
    await service.startExam('u1');

    expect(prisma.examAttempt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          questionIds: EXAM_QUESTION_BANK.map((q) => q.id),
          questions: EXAM_QUESTION_BANK,
        }),
      }),
    );
  });

  it('serves a resumed attempt from the snapshot even when the live bank changed', async () => {
    // Live bank no longer contains bankQ1 (admin removed it after start).
    const prunedBank = EXAM_QUESTION_BANK.filter((q) => q.id !== bankQ1.id);
    const prisma = makePrisma();
    prisma.examAttempt.findFirst = jest.fn().mockResolvedValue({
      id: 'at-live',
      userId: 'u1',
      roadmapId: null,
      blueprintVersion: 'v1',
      status: 'IN_PROGRESS',
      questionIds: EXAM_QUESTION_BANK.map((q) => q.id),
      questions: EXAM_QUESTION_BANK,
      answers: {},
      startedAt: new Date(),
      endsAt: new Date(Date.now() + 60_000),
      submittedAt: null,
    });

    const service = makeService(prisma, prunedBank);
    const session = await service.startExam('u1');

    expect(session.questions.map((q) => q.id)).toContain(bankQ1.id);
    expect(session.questions.length).toBe(EXAM_QUESTION_BANK.length);
  });

  it('falls back to the live bank for legacy attempts without a snapshot', async () => {
    const prisma = makePrisma();
    prisma.examAttempt.findFirst = jest.fn().mockResolvedValue({
      id: 'at-legacy',
      userId: 'u1',
      roadmapId: null,
      blueprintVersion: 'v1',
      status: 'IN_PROGRESS',
      questionIds: EXAM_QUESTION_BANK.map((q) => q.id),
      questions: null, // pre-EXAM-3 attempt
      answers: {},
      startedAt: new Date(),
      endsAt: new Date(Date.now() + 60_000),
      submittedAt: null,
    });

    const service = makeService(prisma);
    const session = await service.startExam('u1');

    expect(session.questions.length).toBe(EXAM_QUESTION_BANK.length);
  });
});
