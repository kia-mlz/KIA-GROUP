import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EXAM_BLUEPRINT_VERSION,
  EXAM_DURATION_SEC,
  EXAM_PASS_THRESHOLD,
  LEGACY_READINESS_TO_DOMAIN,
  READINESS_MODULES,
  buildExamOutcome,
  buildExamVerdict,
  computeReadinessResult,
  gradeAttempt,
  toPublicExamQuestions,
  type ExamAttemptSession,
  type ExamOutcome,
  type ExamQuestion,
  type ExamResponse,
  type ExamSubmitResult,
  type LearnerTestReport,
  type LearnerTestReportReadiness,
  type LearnerTestReportRoadmap,
  type LocaleText,
  type ReadinessResult,
  type ReadinessScores,
  type ReadinessTestSummary,
} from '@kia./shared';
import { AssessmentsService } from '../assessments/assessments.service';
import { EmailService } from '@kia./platform';
import { PersonalityService } from '../../students/personality/personality.service';
import { PrismaService } from '@kia./platform';
import type { Prisma } from '@kia./platform';
import { SiteSettingsService } from '@kia./platform';
import { TestBanksService } from '../test-banks/test-banks.service';
import { CreateReadinessTestDto } from './dto/create-readiness-test.dto';

export interface ReadinessTestResponse extends ReadinessResult {
  id: string;
  createdAt: string;
  outcome?: ExamOutcome;
}

@Injectable()
export class ReadinessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly siteSettings: SiteSettingsService,
    private readonly testBanks: TestBanksService,
    private readonly personalityService: PersonalityService,
    private readonly assessmentsService: AssessmentsService,
  ) {}

  /** Legacy client-scored path — kept for older clients; prefer exam endpoints. */
  async create(dto: CreateReadinessTestDto, userId: string): Promise<ReadinessTestResponse> {
    this.assertValidScores(dto.scores);
    const settings = await this.siteSettings.get();
    const result = computeReadinessResult(dto.scores, settings.readiness);

    const record = await this.prisma.readinessTest.create({
      data: {
        userId,
        scores: dto.scores as unknown as Prisma.InputJsonValue,
        percentages: result.percentages as unknown as Prisma.InputJsonValue,
        average: result.average,
        passed: result.passed,
        verdict: result.verdict as unknown as Prisma.InputJsonValue,
      },
    });

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    await this.emailService.sendReadinessResults(
      { id: user.id, name: user.name, email: user.email ?? 'noreply@kia.academy' },
      result,
    );

    return {
      id: record.id,
      createdAt: record.createdAt.toISOString(),
      ...result,
    };
  }

  async startExam(
    userId: string,
    roadmapId?: string,
  ): Promise<ExamAttemptSession> {
    const resolvedRoadmapId = await this.resolveRoadmapId(userId, roadmapId);

    const existing = await this.prisma.examAttempt.findFirst({
      where: { userId, status: 'IN_PROGRESS' },
      orderBy: { startedAt: 'desc' },
    });

    if (existing) {
      const isExpired = existing.endsAt.getTime() <= Date.now();
      // Attempt has finished its time budget — stop it and let START create a
      // fresh attempt; the DB partial-unique index guarantees only one active
      // (IN_PROGRESS/PROCESSING) attempt per user at a time, race-proof.
      if (isExpired) {
        await this.expireAttempt(existing.id);
      } else {
        return await this.toSession(existing);
      }
    }

    const questions = await this.testBanks.getExamQuestions();
    const startedAt = new Date();
    const endsAt = new Date(startedAt.getTime() + EXAM_DURATION_SEC * 1000);

    let record: Awaited<ReturnType<typeof this.prisma.examAttempt.create>>;
    try {
      record = await this.prisma.examAttempt.create({
        data: {
          userId,
          roadmapId: resolvedRoadmapId,
          blueprintVersion: EXAM_BLUEPRINT_VERSION,
          status: 'IN_PROGRESS',
          questionIds: questions.map((q) => q.id),
          // EXAM-3: pin the full question content so admin edits to the live
          // test bank can never change the meaning of a question mid-attempt.
          questions: questions as unknown as Prisma.InputJsonValue,
          answers: {} as Prisma.InputJsonValue,
          startedAt,
          endsAt,
        },
      });
    } catch (err) {
      // Race with an in-flight START from another tab/device: enforce the
      // one-active-attempt invariant by returning the existing attempt.
      if ((err as { code?: string } | null)?.code === 'P2002') {
        const active = await this.prisma.examAttempt.findFirst({
          where: { userId, status: { in: ['IN_PROGRESS', 'PROCESSING'] } },
          orderBy: { startedAt: 'desc' },
        });
        if (active) {
          return this.toSession(active);
        }
      }
      throw err;
    }

    return await this.toSession(record);
  }

  async saveAnswers(
    attemptId: string,
    userId: string,
    answers: Record<string, unknown>,
  ): Promise<{ ok: true; remainingSec: number }> {
    const attempt = await this.requireInProgress(attemptId, userId);
    const merged = {
      ...this.parseAnswers(attempt.answers),
      ...this.sanitizeAnswers(answers),
    };

    await this.prisma.examAttempt.update({
      where: { id: attemptId },
      data: { answers: merged },
    });

    return {
      ok: true,
      remainingSec: Math.max(
        0,
        Math.floor((attempt.endsAt.getTime() - Date.now()) / 1000),
      ),
    };
  }

  async submitExam(
    attemptId: string,
    userId: string,
    finalAnswers?: Record<string, unknown>,
  ): Promise<ExamSubmitResult> {
    const attempt = await this.prisma.examAttempt.findFirst({
      where: { id: attemptId, userId },
    });
    if (!attempt) {
      throw new NotFoundException(`Exam attempt ${attemptId} not found`);
    }

    if (attempt.status === 'SUBMITTED' && attempt.outcome && attempt.verdict) {
      return this.toSubmitResult(attempt);
    }

    if (attempt.status !== 'IN_PROGRESS' && attempt.status !== 'EXPIRED') {
      throw new BadRequestException('Exam attempt cannot be submitted');
    }

    // Server-authoritative expiration: a submission after endsAt is rejected,
    // even if the client never saw the countdown finish. First claim to flip
    // IN_PROGRESS→PROCESSING wins; duplicate/concurrent submissions are ignored.
    const claimedAt = new Date();
    const expired = attempt.endsAt.getTime() <= claimedAt.getTime();
    const claimed = await this.prisma.examAttempt.updateMany({
      where: { id: attemptId, userId, status: 'IN_PROGRESS' },
      data: {
        status: 'PROCESSING',
        ...(expired ? {} : { submittedAt: claimedAt }),
      },
    });
    if (claimed.count === 0) {
      if (expired) {
        await this.expireAttempt(attemptId);
      }
      const current = await this.prisma.examAttempt.findFirst({
        where: { id: attemptId, userId },
      });
      if (current?.status === 'SUBMITTED' && current.outcome && current.verdict) {
        return this.toSubmitResult(current);
      }
      throw new BadRequestException('Exam attempt cannot be submitted');
    }

    const answers = {
      ...this.parseAnswers(attempt.answers),
      ...(finalAnswers ? this.sanitizeAnswers(finalAnswers) : {}),
    };

    // EXAM-3: grade against the pinned snapshot (fallback to the live bank for
    // legacy attempts created before snapshots existed).
    const questions = await this.questionsForAttemptWithSnapshot(
      attempt.questionIds,
      attempt.questions,
    );
    const graded = gradeAttempt(questions, answers);
    const settings = await this.siteSettings.get();
    const passThreshold = settings.readiness.passThreshold ?? EXAM_PASS_THRESHOLD;
    const passed = graded.average >= passThreshold;

    const roadmapRecord = attempt.roadmapId
      ? await this.prisma.roadmap.findFirst({
          where: { id: attempt.roadmapId, userId },
        })
      : await this.prisma.roadmap.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });

    const roadmap = roadmapRecord
      ? {
          id: roadmapRecord.id,
          modules: roadmapRecord.modules as unknown as string[],
          level: roadmapRecord.level,
        }
      : null;

    const outcome = buildExamOutcome({
      passed,
      average: graded.average,
      percentages: graded.percentages,
      roadmap,
    });

    if (roadmapRecord && outcome.roadmapModules.length > 0) {
      const profile = roadmapRecord.profile as unknown as {
        goal: string;
        level: string;
        style: string;
        hours: number;
      };
      await this.prisma.roadmap.update({
        where: { id: roadmapRecord.id },
        data: {
          modules: outcome.roadmapModules,
          level: outcome.levelAfter || roadmapRecord.level,
          profile: {
            ...profile,
            level: outcome.levelAfter || profile.level,
          },
        },
      });
    }

    const verdict = buildExamVerdict({
      passed,
      average: graded.average,
      outcome,
    });

    const submittedAt = new Date();
    const updated = await this.prisma.examAttempt.update({
      where: { id: attemptId },
      data: {
        status: 'SUBMITTED',
        answers: answers as unknown as Prisma.InputJsonValue,
        submittedAt,
        average: graded.average,
        passed,
        domainScores: graded.domainScores as unknown as Prisma.InputJsonValue,
        percentages: graded.percentages as unknown as Prisma.InputJsonValue,
        outcome: outcome as unknown as Prisma.InputJsonValue,
        verdict: verdict as unknown as Prisma.InputJsonValue,
        roadmapId: outcome.roadmapId ?? attempt.roadmapId,
      },
    });

    const legacyScores = this.toLegacyScores(graded.percentages);
    const legacyResult = computeReadinessResult(legacyScores, settings.readiness);
    legacyResult.average = graded.average;
    legacyResult.passed = passed;
    legacyResult.percentages = {
      ...legacyResult.percentages,
      ...graded.percentages,
    };
    legacyResult.verdict = {
      icon: verdict.icon,
      title: verdict.title.en,
      message: verdict.message.en,
      unlockTitle: verdict.unlockTitle.en,
      unlockSub: verdict.unlockSub.en,
      variant: verdict.variant,
    };

    await this.prisma.readinessTest.create({
      data: {
        userId,
        scores: legacyScores as unknown as Prisma.InputJsonValue,
        percentages: legacyResult.percentages as unknown as Prisma.InputJsonValue,
        average: graded.average,
        passed,
        verdict: legacyResult.verdict as unknown as Prisma.InputJsonValue,
      },
    });

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    await this.emailService.sendReadinessResults(
      { id: user.id, name: user.name, email: user.email ?? 'noreply@kia.academy' },
      legacyResult,
    );

    return this.toSubmitResult(updated);
  }

  async getExamAttempt(
    attemptId: string,
    userId: string,
  ): Promise<ExamAttemptSession | ExamSubmitResult> {
    const attempt = await this.prisma.examAttempt.findFirst({
      where: { id: attemptId, userId },
    });
    if (!attempt) {
      throw new NotFoundException(`Exam attempt ${attemptId} not found`);
    }

    if (attempt.status === 'IN_PROGRESS' && attempt.endsAt.getTime() <= Date.now()) {
      await this.expireAttempt(attempt.id);
      const expired = await this.prisma.examAttempt.findUniqueOrThrow({
        where: { id: attempt.id },
      });
      return await this.toSession(expired);
    }

    if (attempt.status === 'SUBMITTED') {
      return this.toSubmitResult(attempt);
    }

    return await this.toSession(attempt);
  }

  async findOne(id: string, userId: string): Promise<ReadinessTestResponse> {
    const exam = await this.prisma.examAttempt.findFirst({
      where: { id, userId, status: 'SUBMITTED' },
    });
    if (exam) {
      const submit = this.toSubmitResult(exam);
      return {
        id: exam.id,
        createdAt: exam.createdAt.toISOString(),
        percentages: submit.percentages,
        average: submit.average,
        passed: submit.passed,
        verdict: {
          icon: submit.verdict.icon,
          title: submit.verdict.title.en,
          message: submit.verdict.message.en,
          unlockTitle: submit.verdict.unlockTitle.en,
          unlockSub: submit.verdict.unlockSub.en,
          variant: submit.verdict.variant,
        },
        outcome: submit.outcome,
      };
    }

    const record = await this.prisma.readinessTest.findFirst({
      where: { id, userId },
    });
    if (!record) {
      throw new NotFoundException(`Readiness test ${id} not found`);
    }

    return {
      id: record.id,
      createdAt: record.createdAt.toISOString(),
      percentages: record.percentages as unknown as Record<string, number>,
      average: record.average,
      passed: record.passed,
      verdict: record.verdict as unknown as ReadinessResult['verdict'],
    };
  }

  /**
   * Full three-test report: Mini-IPIP personality + goal assessment + readiness exam.
   * When `examAttemptId` is set, pairs personality/assessment from the same session window.
   */
  async getTestReport(userId: string, examAttemptId?: string): Promise<LearnerTestReport> {
    const readiness = examAttemptId
      ? await this.toReportReadiness(examAttemptId, userId)
      : await this.latestReportReadiness(userId);

    const anchorAt = readiness ? new Date(readiness.createdAt) : undefined;
    const roadmapId =
      readiness?.outcome?.roadmapId ??
      (await this.latestRoadmapId(userId, examAttemptId));

    const roadmap = roadmapId ? await this.loadReportRoadmap(roadmapId, userId) : null;
    const assessment = roadmap?.assessmentId
      ? await this.assessmentsService.findForUser(roadmap.assessmentId, userId)
      : await this.assessmentsService.latestForUser(userId);

    const personality = await this.personalityService.forUserAround(userId, anchorAt);

    return {
      personality,
      assessment,
      readiness,
      roadmap: roadmap
        ? {
            id: roadmap.id,
            trackKey: roadmap.trackKey,
            trackName: roadmap.trackName,
            level: roadmap.level,
            profile: roadmap.profile,
          }
        : null,
    };
  }

  private async latestReportReadiness(
    userId: string,
  ): Promise<LearnerTestReport['readiness']> {
    // Prefer timed exam attempts (bilingual verdict) over legacy readiness rows
    // created as a side-effect of exam submit — those store English-only copy.
    const latestExam = await this.prisma.examAttempt.findFirst({
      where: { userId, status: 'SUBMITTED' },
      orderBy: { submittedAt: 'desc' },
      select: { id: true },
    });
    if (latestExam) return this.toReportReadiness(latestExam.id, userId);

    const latestLegacy = await this.prisma.readinessTest.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (!latestLegacy) return null;
    return this.toReportReadiness(latestLegacy.id, userId);
  }

  /** Preserves bilingual exam verdicts for accurate fa/en report rendering. */
  private async toReportReadiness(
    id: string,
    userId: string,
  ): Promise<LearnerTestReport['readiness']> {
    const exam = await this.prisma.examAttempt.findFirst({
      where: { id, userId, status: 'SUBMITTED' },
    });
    if (exam) {
      const submit = this.toSubmitResult(exam);
      return {
        id: exam.id,
        createdAt: (exam.submittedAt ?? exam.createdAt).toISOString(),
        percentages: submit.percentages,
        average: submit.average,
        passed: submit.passed,
        verdict: submit.verdict,
        outcome: submit.outcome,
      };
    }

    const record = await this.prisma.readinessTest.findFirst({
      where: { id, userId },
    });
    if (!record) return null;

    // Exam submit also writes a legacy ReadinessTest with English-only verdict.
    // Prefer the matching ExamAttempt when present so the report stays bilingual.
    const nearbyExam = await this.prisma.examAttempt.findFirst({
      where: {
        userId,
        status: 'SUBMITTED',
        average: record.average,
        submittedAt: {
          gte: new Date(record.createdAt.getTime() - 120_000),
          lte: new Date(record.createdAt.getTime() + 120_000),
        },
      },
      orderBy: { submittedAt: 'desc' },
    });
    if (nearbyExam) {
      const submit = this.toSubmitResult(nearbyExam);
      return {
        id: nearbyExam.id,
        createdAt: (nearbyExam.submittedAt ?? nearbyExam.createdAt).toISOString(),
        percentages: submit.percentages,
        average: submit.average,
        passed: submit.passed,
        verdict: submit.verdict,
        outcome: submit.outcome,
      };
    }

    return {
      id: record.id,
      createdAt: record.createdAt.toISOString(),
      percentages: record.percentages as unknown as Record<string, number>,
      average: record.average,
      passed: record.passed,
      verdict: record.verdict as unknown as LearnerTestReportReadiness['verdict'],
    };
  }

  private async latestRoadmapId(
    userId: string,
    examAttemptId?: string,
  ): Promise<string | null> {
    if (examAttemptId) {
      const attempt = await this.prisma.examAttempt.findFirst({
        where: { id: examAttemptId, userId },
        select: { roadmapId: true },
      });
      if (attempt?.roadmapId) return attempt.roadmapId;
    }
    const latest = await this.prisma.roadmap.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    return latest?.id ?? null;
  }

  private async loadReportRoadmap(
    id: string,
    userId: string,
  ): Promise<(LearnerTestReportRoadmap & { assessmentId: string | null }) | null> {
    const record = await this.prisma.roadmap.findFirst({
      where: { id, userId },
    });
    if (!record) return null;
    return {
      id: record.id,
      assessmentId: record.assessmentId,
      trackKey: record.trackKey,
      trackName: record.trackName,
      level: record.level,
      profile: record.profile as unknown as LearnerTestReportRoadmap['profile'],
    };
  }

  async listForUser(userId: string): Promise<ReadinessTestSummary[]> {
    const [exams, legacy] = await Promise.all([
      this.prisma.examAttempt.findMany({
        where: { userId, status: 'SUBMITTED' },
        orderBy: { submittedAt: 'desc' },
        select: {
          id: true,
          submittedAt: true,
          createdAt: true,
          average: true,
          passed: true,
        },
      }),
      this.prisma.readinessTest.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          createdAt: true,
          average: true,
          passed: true,
        },
      }),
    ]);

    const examIds = new Set(exams.map((e) => e.id));
    const fromExams: ReadinessTestSummary[] = exams.map((record) => ({
      id: record.id,
      createdAt: (record.submittedAt ?? record.createdAt).toISOString(),
      average: record.average ?? 0,
      passed: record.passed ?? false,
    }));

    // Drop legacy rows that were written as a side-effect of exam submit
    // (same average within 2 minutes) so history shows real exam scores once.
    const fromLegacy = legacy
      .filter((record) => {
        if (examIds.has(record.id)) return false;
        const legacyTime = record.createdAt.getTime();
        return !exams.some((exam) => {
          const examTime = (exam.submittedAt ?? exam.createdAt).getTime();
          return (
            (exam.average ?? 0) === record.average &&
            Math.abs(examTime - legacyTime) <= 120_000
          );
        });
      })
      .map((record) => ({
        id: record.id,
        createdAt: record.createdAt.toISOString(),
        average: record.average,
        passed: record.passed,
      }));

    return [...fromExams, ...fromLegacy].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  private async resolveRoadmapId(
    userId: string,
    roadmapId?: string,
  ): Promise<string | null> {
    if (roadmapId) {
      const match = await this.prisma.roadmap.findFirst({
        where: { id: roadmapId, userId },
        select: { id: true },
      });
      if (!match) {
        throw new BadRequestException('Roadmap not found for this user');
      }
      return match.id;
    }
    const latest = await this.prisma.roadmap.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    return latest?.id ?? null;
  }

  private async requireInProgress(attemptId: string, userId: string) {
    const attempt = await this.prisma.examAttempt.findFirst({
      where: { id: attemptId, userId },
    });
    if (!attempt) {
      throw new NotFoundException(`Exam attempt ${attemptId} not found`);
    }
    if (attempt.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Exam is not in progress');
    }
    if (attempt.endsAt.getTime() <= Date.now()) {
      await this.expireAttempt(attempt.id);
      throw new BadRequestException('Exam time has expired — please submit');
    }
    return attempt;
  }

  private async expireAttempt(id: string) {
    // Atomic no-op if already terminal; releasing the one-active-attempt slot
    // for a subsequent START.
    await this.prisma.examAttempt.updateMany({
      where: { id, status: { in: ['IN_PROGRESS', 'PROCESSING'] } },
      data: { status: 'EXPIRED' },
    });
  }

  /**
   * EXAM-3: prefer the attempt's pinned question snapshot so grading is immune
   * to admin edits to the live bank; legacy attempts created before snapshots
   * existed (null snapshot) fall back to resolving IDs against the live bank.
   */
  private questionIdList(questionIdsJson: Prisma.JsonValue): string[] {
    if (Array.isArray(questionIdsJson)) return questionIdsJson.map(String);
    if (typeof questionIdsJson === 'string' && questionIdsJson.length > 0) {
      try {
        const parsed = JSON.parse(questionIdsJson) as unknown;
        return Array.isArray(parsed) ? parsed.map(String) : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  private async questionsForAttempt(questionIdsJson: Prisma.JsonValue): Promise<ExamQuestion[]> {
    const ids = this.questionIdList(questionIdsJson);
    const bank = await this.testBanks.getExamQuestions();
    const byId = new Map(bank.map((q) => [q.id, q]));
    return ids.map((id) => {
      const q = byId.get(id);
      if (!q) {
        throw new BadRequestException(`Unknown exam question: ${id}`);
      }
      return q;
    });
  }

  private async questionsForAttemptWithSnapshot(
    questionIdsJson: Prisma.JsonValue,
    snapshot: Prisma.JsonValue | null,
  ): Promise<ExamQuestion[]> {
    if (Array.isArray(snapshot) && snapshot.length > 0) {
      const wanted = new Set(this.questionIdList(questionIdsJson));
      const pinned = (snapshot as unknown as ExamQuestion[]).filter((q) => wanted.has(q.id));
      // The snapshot is authoritative only when it covers every pinned ID;
      // anything missing means partial/legacy data — fall back to the live bank.
      if (pinned.length === wanted.size) {
        return pinned;
      }
    }
    return this.questionsForAttempt(questionIdsJson);
  }

  private async toSession(attempt: {
    id: string;
    blueprintVersion: string;
    startedAt: Date;
    endsAt: Date;
    roadmapId: string | null;
    questionIds: Prisma.JsonValue;
    questions: Prisma.JsonValue | null;
    answers: Prisma.JsonValue;
    status: string;
  }): Promise<ExamAttemptSession> {
    const questions = await this.questionsForAttemptWithSnapshot(
      attempt.questionIds,
      attempt.questions,
    );
    // Deterministic shuffle seed from attempt id so refresh keeps same option order.
    const rng = this.rngFromSeed(attempt.id);
    return {
      attemptId: attempt.id,
      blueprintVersion: attempt.blueprintVersion,
      durationSec: EXAM_DURATION_SEC,
      startedAt: attempt.startedAt.toISOString(),
      endsAt: attempt.endsAt.toISOString(),
      roadmapId: attempt.roadmapId,
      questions: toPublicExamQuestions(questions, rng),
      savedAnswers: this.parseAnswers(attempt.answers),
      status: attempt.status as ExamAttemptSession['status'],
    };
  }

  private toSubmitResult(attempt: {
    id: string;
    average: number | null;
    passed: boolean | null;
    domainScores: Prisma.JsonValue | null;
    percentages: Prisma.JsonValue | null;
    outcome: Prisma.JsonValue | null;
    verdict: Prisma.JsonValue | null;
    submittedAt: Date | null;
    createdAt?: Date;
  }): ExamSubmitResult {
    if (
      attempt.average == null ||
      attempt.passed == null ||
      !attempt.domainScores ||
      !attempt.percentages ||
      !attempt.outcome ||
      !attempt.verdict
    ) {
      throw new BadRequestException('Exam result is incomplete');
    }

    return {
      attemptId: attempt.id,
      average: attempt.average,
      passed: attempt.passed,
      domainScores: attempt.domainScores as unknown as ExamSubmitResult['domainScores'],
      percentages: attempt.percentages as unknown as ExamSubmitResult['percentages'],
      outcome: attempt.outcome as unknown as ExamSubmitResult['outcome'],
      verdict: attempt.verdict as unknown as ExamSubmitResult['verdict'],
      submittedAt: (attempt.submittedAt ?? attempt.createdAt ?? new Date()).toISOString(),
    };
  }

  private parseAnswers(raw: Prisma.JsonValue): Record<string, ExamResponse> {
    try {
      return this.sanitizeAnswers(
        (raw && typeof raw === 'object' && !Array.isArray(raw)
          ? raw
          : {}) as Record<string, unknown>,
      );
    } catch {
      return {};
    }
  }

  private sanitizeAnswers(
    input: Record<string, unknown>,
  ): Record<string, ExamResponse> {
    const out: Record<string, ExamResponse> = {};
    for (const [key, value] of Object.entries(input)) {
      if (!value || typeof value !== 'object') continue;
      const v = value as Record<string, unknown>;
      if (v.type === 'single_choice' && typeof v.optionId === 'string') {
        out[key] = { type: 'single_choice', optionId: v.optionId };
      } else if (
        v.type === 'multi_choice' &&
        Array.isArray(v.optionIds) &&
        v.optionIds.every((id) => typeof id === 'string')
      ) {
        out[key] = { type: 'multi_choice', optionIds: v.optionIds as string[] };
      } else if (
        v.type === 'order' &&
        Array.isArray(v.orderedIds) &&
        v.orderedIds.every((id) => typeof id === 'string')
      ) {
        out[key] = { type: 'order', orderedIds: v.orderedIds as string[] };
      } else if (
        v.type === 'fill_blank' &&
        Array.isArray(v.values) &&
        v.values.every((id) => typeof id === 'string')
      ) {
        out[key] = { type: 'fill_blank', values: v.values as string[] };
      }
    }
    return out;
  }

  private toLegacyScores(percentages: Record<string, number>): ReadinessScores {
    const scores: ReadinessScores = {};
    for (const module of READINESS_MODULES) {
      const domain = LEGACY_READINESS_TO_DOMAIN[module];
      const pct = domain ? (percentages[domain] ?? 0) : 0;
      const total = 4;
      const correct = Math.round((pct / 100) * total);
      scores[module] = { correct, total };
    }
    return scores;
  }

  private rngFromSeed(seed: string): () => number {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i += 1) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return () => {
      h += 0x6d2b79f5;
      let t = h;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  private assertValidScores(scores: ReadinessScores): void {
    for (const module of READINESS_MODULES) {
      const score = scores[module];
      if (!score || typeof score.correct !== 'number' || typeof score.total !== 'number') {
        throw new BadRequestException(`Missing or invalid score for module: ${module}`);
      }
      if (score.total < 1 || score.correct < 0 || score.correct > score.total) {
        throw new BadRequestException(`Score out of bounds for module: ${module}`);
      }
    }
  }
}

/** Pick localized verdict strings for API consumers that still expect plain strings. */
export function localizeVerdict(
  verdict: ExamSubmitResult['verdict'],
  locale: 'fa' | 'en',
): ReadinessResult['verdict'] {
  const pick = (text: LocaleText) => text[locale] ?? text.en;
  return {
    icon: verdict.icon,
    title: pick(verdict.title),
    message: pick(verdict.message),
    unlockTitle: pick(verdict.unlockTitle),
    unlockSub: pick(verdict.unlockSub),
    variant: verdict.variant,
  };
}
