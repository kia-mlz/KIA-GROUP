import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AdminCourseExam,
  CourseExamAttemptSession,
  CourseExamAttemptSummary,
  CourseExamQuestion,
  CourseExamScoreDetail,
  CourseExamSubmitResult,
  CourseExamSummary,
  CourseExamResponse,
  PublicCourseExamQuestion,
  CourseExamKind,
} from '@kia./shared';
import { PrismaService } from '@kia./platform';
import type { Prisma } from '@kia./platform';
import {
  AdminCreateCourseExamDto,
  AdminUpdateCourseExamDto,
  SaveCourseExamAnswersDto,
} from './dto/course-exam.dto';

interface CourseExamRow {
  id: string;
  title: string;
  description: string;
  passScore: number;
  durationMin: number;
  maxAttempts: number;
  published: boolean;
  sortOrder: number;
  kind: string;
  afterLessonId: string | null;
  questions: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
  course: { slug: string; title: string };
  afterLesson: { slug: string } | null;
}

function parseQuestions(raw: Prisma.JsonValue): CourseExamQuestion[] {
  return (Array.isArray(raw) ? raw : []) as unknown as CourseExamQuestion[];
}

function toPublicQuestion(q: CourseExamQuestion): PublicCourseExamQuestion {
  const { answer: _answer, ...rest } = q;
  return rest;
}

@Injectable()
export class CourseExamsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- Admin ----------
  async listForCourseAdmin(courseSlug: string): Promise<AdminCourseExam[]> {
    const course = await this.ensureCourseBySlug(courseSlug);
    const rows = await this.prisma.courseExam.findMany({
      where: { courseId: course.id },
      include: {
        course: { select: { slug: true, title: true } },
        afterLesson: { select: { slug: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });
    return rows.map((row) => this.toAdminExam(row));
  }

  async listAllAdmin(): Promise<AdminCourseExam[]> {
    const rows = await this.prisma.courseExam.findMany({
      include: {
        course: { select: { slug: true, title: true } },
        afterLesson: { select: { slug: true } },
      },
      orderBy: [{ course: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
    });
    return rows.map((row) => this.toAdminExam(row));
  }

  async listForLearner(userId: string, courseSlug: string): Promise<CourseExamSummary[]> {
    const course = await this.ensureCourseBySlug(courseSlug);
    await this.assertEnrolled(userId, course.id);
    const rows = await this.prisma.courseExam.findMany({
      where: { courseId: course.id, published: true },
      include: {
        course: { select: { slug: true, title: true } },
        afterLesson: { select: { slug: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });
    return rows.map((row) => this.toSummary(row));
  }

  /** All published exams across the user's enrolled courses (dashboard listing). */
  async listMyExams(userId: string): Promise<CourseExamSummary[]> {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId },
      select: { courseId: true },
    });
    const ids = enrollments.map((e) => e.courseId);
    if (ids.length === 0) return [];
    const rows = await this.prisma.courseExam.findMany({
      where: { courseId: { in: ids }, published: true },
      include: {
        course: { select: { slug: true, title: true } },
        afterLesson: { select: { slug: true } },
      },
      orderBy: [{ course: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
    });
    return rows.map((row) => this.toSummary(row));
  }

  /** List the user's attempts for one exam (status / summary). */
  async listAttemptsLearner(userId: string, examId: string): Promise<CourseExamAttemptSummary[]> {
    const exam = await this.prisma.courseExam.findUnique({ where: { id: examId } });
    if (!exam) throw new NotFoundException('Course exam not found');
    await this.assertEnrolled(userId, exam.courseId);
    const attempts = await this.prisma.courseExamAttempt.findMany({
      where: { userId, examId },
      orderBy: { startedAt: 'desc' },
    });
    return attempts.map((a) => ({
      id: a.id,
      examId: a.examId,
      status: a.status,
      score: a.score,
      passed: a.passed,
      startedAt: a.startedAt.toISOString(),
      submittedAt: a.submittedAt?.toISOString() ?? null,
    }));
  }

  /** Start (or resume) an in-progress attempt for the user on this exam. */
  async startAttempt(userId: string, examId: string): Promise<CourseExamAttemptSession> {
    const exam = await this.prisma.courseExam.findUnique({
      where: { id: examId },
      include: {
        course: { select: { slug: true, title: true } },
        afterLesson: { select: { slug: true } },
      },
    });
    if (!exam) throw new NotFoundException('Course exam not found');
    if (!exam.published) throw new ForbiddenException('This exam is not published');
    await this.assertEnrolled(userId, exam.courseId);

    // EXAM-4: enforce the exam's attempt cap. Only SUBMITTED attempts consume
    // the budget — an in-progress, processing or expired attempt never blocks
    // the learner from resuming their current try.
    const maxAttempts = exam.maxAttempts ?? 3;
    const usedAttempts = await this.prisma.courseExamAttempt.count({
      where: { userId, examId, status: 'SUBMITTED' },
    });
    if (usedAttempts >= maxAttempts) {
      throw new ForbiddenException(
        `Attempt limit reached (${usedAttempts}/${maxAttempts}) — this exam allows at most ${maxAttempts} graded attempts`,
      );
    }

    // Only in-flight attempts are resumable. EXPIRED is terminal (EXAM-4):
    // a timed-out try never consumes the graded-attempt budget, so the learner
    // can start a fresh attempt while any budget remains.
    const existing = await this.prisma.courseExamAttempt.findFirst({
      where: { userId, examId, status: { in: ['IN_PROGRESS', 'PROCESSING'] } },
      orderBy: { startedAt: 'desc' },
    });

    const liveQuestions = parseQuestions(exam.questions);
    const durationMin = exam.durationMin;

    if (existing && existing.status === 'IN_PROGRESS') {
      const endsAt = new Date(existing.startedAt.getTime() + durationMin * 60_000);
      const now = new Date();
      let status = existing.status as 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED';
      if (now > endsAt) status = 'EXPIRED';
      if (status !== existing.status) {
        await this.prisma.courseExamAttempt.update({ where: { id: existing.id }, data: { status } });
      }
      if (status !== 'EXPIRED') {
        return {
          attemptId: existing.id,
          examId: exam.id,
          examTitle: exam.title,
          courseSlug: exam.course.slug,
          kind: exam.kind === 'MIDTERM' ? 'MIDTERM' : 'FINAL',
          durationMin,
          passScore: exam.passScore,
          startedAt: existing.startedAt.toISOString(),
          endsAt: endsAt.toISOString(),
          questions: this.resolveAttemptQuestions(existing.questions, liveQuestions).map(
            toPublicQuestion,
          ),
          savedAnswers: this.parseAnswers(existing.answers),
          status,
        };
      }
      // Timed out while we looked at it — fall through and start a fresh
      // attempt (the budget check above already ensured one is available).
    }

    const attempt = await this.prisma.courseExamAttempt.create({
      data: {
        examId: exam.id,
        userId,
        status: 'IN_PROGRESS',
        // EXAM-3: pin the question payload so admin edits mid-attempt can never
        // change what this attempt is served or graded against.
        questions: liveQuestions as unknown as Prisma.InputJsonValue,
      },
    }).catch(async (err: unknown) => {
      // Race with an in-flight START from another tab/device: the DB invariant
      // (one active attempt per user/exam) rejects the second create — return
      // the existing active attempt instead.
      if ((err as { code?: string } | null)?.code === 'P2002') {
        const active = await this.prisma.courseExamAttempt.findFirst({
          where: { userId, examId, status: { in: ['IN_PROGRESS', 'PROCESSING'] } },
          orderBy: { startedAt: 'desc' },
        });
        if (active) {
          return active;
        }
      }
      throw err;
    });
    const endsAt = new Date(attempt.startedAt.getTime() + durationMin * 60_000);
    return {
      attemptId: attempt.id,
      examId: exam.id,
      examTitle: exam.title,
      courseSlug: exam.course.slug,
      kind: exam.kind === 'MIDTERM' ? 'MIDTERM' : 'FINAL',
      durationMin,
      passScore: exam.passScore,
      startedAt: attempt.startedAt.toISOString(),
      endsAt: endsAt.toISOString(),
      questions: liveQuestions.map(toPublicQuestion),
      savedAnswers: {},
      status: 'IN_PROGRESS',
    };
  }


  async createAdmin(courseSlug: string, dto: AdminCreateCourseExamDto): Promise<AdminCourseExam> {
    const course = await this.ensureCourseBySlug(courseSlug);
    const maxOrder = await this.prisma.courseExam.aggregate({
      where: { courseId: course.id },
      _max: { sortOrder: true },
    });
    const row = await this.prisma.courseExam.create({
      data: {
        courseId: course.id,
        title: dto.title,
        description: dto.description ?? '',
        passScore: dto.passScore ?? 60,
        durationMin: dto.durationMin ?? 15,
        maxAttempts: dto.maxAttempts ?? 3,
        published: dto.published ?? true,
        sortOrder: dto.sortOrder ?? (maxOrder._max.sortOrder ?? 0) + 1,
        kind: this.toDbKind(dto.kind),
        afterLessonId: dto.afterLessonId ?? null,
        questions: (dto.questions ?? []) as unknown as Prisma.InputJsonValue,
      },
      include: {
        course: { select: { slug: true, title: true } },
        afterLesson: { select: { slug: true } },
      },
    });
    return this.toAdminExam(row);
  }

  async updateAdmin(
    courseSlug: string,
    examId: string,
    dto: AdminUpdateCourseExamDto,
  ): Promise<AdminCourseExam> {
    const exam = await this.ensureExamForCourse(courseSlug, examId);
    const row = await this.prisma.courseExam.update({
      where: { id: exam.id },
      data: {
        title: dto.title,
        description: dto.description,
        passScore: dto.passScore,
        durationMin: dto.durationMin,
        maxAttempts: dto.maxAttempts,
        published: dto.published,
        sortOrder: dto.sortOrder,
        kind: dto.kind !== undefined ? this.toDbKind(dto.kind) : undefined,
        afterLessonId: dto.afterLessonId,
        questions:
          dto.questions !== undefined
            ? (dto.questions as unknown as Prisma.InputJsonValue)
            : undefined,
      },
      include: {
        course: { select: { slug: true, title: true } },
        afterLesson: { select: { slug: true } },
      },
    });
    return this.toAdminExam(row);
  }

  async deleteAdmin(courseSlug: string, examId: string): Promise<{ deleted: true }> {
    const exam = await this.ensureExamForCourse(courseSlug, examId);
    await this.prisma.courseExamAttempt.deleteMany({ where: { examId: exam.id } });
    await this.prisma.courseExam.delete({ where: { id: exam.id } });
    return { deleted: true };
  }

  /** Persist a full ordered slug list as the course's lesson order. */
  async reorderLessons(courseSlug: string, slugs: string[]): Promise<{ ok: true }> {
    const course = await this.ensureCourseBySlug(courseSlug);
    const lessons = await this.prisma.lesson.findMany({
      where: { courseId: course.id },
      select: { id: true, slug: true },
    });
    const bySlug = new Map(lessons.map((l) => [l.slug, l.id]));
    const known = slugs.filter((s) => bySlug.has(s));
    if (known.length === 0 && lessons.length > 0) {
      throw new BadRequestException('Reorder list does not reference any lesson in this course');
    }
    await this.prisma.$transaction(
      known.map((slug, index) =>
        this.prisma.lesson.update({
          where: { id: bySlug.get(slug)! },
          data: { sortOrder: index + 1 },
        }),
      ),
    );
    return { ok: true };
  }

  /** Persist a full ordered slug list as the catalog course order. */
  async reorderCourses(slugs: string[]): Promise<{ ok: true }> {
    const courses = await this.prisma.course.findMany({ select: { id: true, slug: true } });
    const bySlug = new Map(courses.map((c) => [c.slug, c.id]));
    const known = slugs.filter((s) => bySlug.has(s));
    if (known.length === 0 && courses.length > 0) {
      throw new BadRequestException('Reorder list does not reference any course');
    }
    await this.prisma.$transaction(
      known.map((slug, index) =>
        this.prisma.course.update({
          where: { id: bySlug.get(slug)! },
          data: { sortOrder: index + 1 },
        }),
      ),
    );
    return { ok: true };
  }

  async saveAnswers(
    userId: string,
    attemptId: string,
    dto: SaveCourseExamAnswersDto,
  ): Promise<{ ok: true }> {
    const attempt = await this.assertOwnAttempt(userId, attemptId);
    if (attempt.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Attempt is no longer in progress');
    }
    await this.prisma.courseExamAttempt.update({
      where: { id: attempt.id },
      data: { answers: this.sanitizeAnswers(dto.answers) },
    });
    return { ok: true };
  }

  async submitAttempt(
    userId: string,
    attemptId: string,
    dto?: SaveCourseExamAnswersDto,
  ): Promise<CourseExamSubmitResult> {
    const attempt = await this.assertOwnAttempt(userId, attemptId);
    const exam = await this.prisma.courseExam.findUnique({
      where: { id: attempt.examId },
      include: { course: { select: { slug: true } } },
    });
    if (!exam) throw new NotFoundException('Course exam not found');

    if (attempt.status === 'SUBMITTED' && attempt.score !== null) {
      return this.toSubmitResult(
        exam,
        attempt,
        this.resolveAttemptQuestions(attempt.questions, parseQuestions(exam.questions)),
      );
    }
    if (attempt.status !== 'IN_PROGRESS' && attempt.status !== 'EXPIRED') {
      throw new BadRequestException('Attempt cannot be submitted');
    }

    // Server-authoritative expiration + single-winner atomic claim. The attempt
    // flips IN_PROGRESS→PROCESSING exactly once; concurrent duplicate
    // submissions are ignored, and an attempt past its deadline is expired.
    const claimedAt = new Date();
    const endsAt = new Date(attempt.startedAt.getTime() + exam.durationMin * 60_000);
    const expired = endsAt.getTime() <= claimedAt.getTime();
    const claimed = await this.prisma.courseExamAttempt.updateMany({
      where: { id: attempt.id, userId, status: 'IN_PROGRESS' },
      data: {
        status: 'PROCESSING',
        ...(expired ? {} : { submittedAt: claimedAt }),
      },
    });
    if (claimed.count === 0) {
      if (expired) {
        await this.prisma.courseExamAttempt.updateMany({
          where: { id: attempt.id, userId, status: 'IN_PROGRESS' },
          data: { status: 'EXPIRED' },
        });
      }
      const current = await this.prisma.courseExamAttempt.findFirst({
        where: { id: attempt.id, userId },
      });
      if (current?.status === 'SUBMITTED' && current.score !== null) {
        return this.toSubmitResult(
          exam,
          current,
          this.resolveAttemptQuestions(current.questions, parseQuestions(exam.questions)),
        );
      }
      throw new BadRequestException('Attempt cannot be submitted');
    }

    const mergedAnswers = {
      ...this.parseAnswers(attempt.answers),
      ...(dto ? this.sanitizeAnswers(dto.answers) : {}),
    };
    // EXAM-3: grade against the pinned snapshot (fallback to live for legacy
    // attempts created before snapshots existed).
    const questions = this.resolveAttemptQuestions(
      attempt.questions,
      parseQuestions(exam.questions),
    );

    let correct = 0;
    let points = 0;
    let total = 0;
    const details: CourseExamScoreDetail[] = questions.map((q) => {
      const response = mergedAnswers[q.id] as CourseExamResponse | undefined;
      const isCorrect = this.isCorrect(q, response);
      const qPoints = q.points ?? 1;
      total += qPoints;
      if (isCorrect) {
        correct += 1;
        points += qPoints;
      }
      return { questionId: q.id, correct: isCorrect, points: qPoints };
    });

    const score = total === 0 ? 0 : Math.round((points / total) * 100);
    const passed = score >= exam.passScore;

    await this.prisma.courseExamAttempt.update({
      where: { id: attempt.id },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        answers: mergedAnswers,
        score,
        passed,
      },
    });

    return {
      attemptId: attempt.id,
      examId: exam.id,
      examTitle: exam.title,
      courseSlug: exam.course.slug,
      score,
      passed,
      passScore: exam.passScore,
      correctCount: correct,
      totalCount: questions.length,
      details,
      submittedAt: new Date().toISOString(),
    };
  }

  async getAttemptResult(userId: string, attemptId: string): Promise<CourseExamSubmitResult> {
    const attempt = await this.assertOwnAttempt(userId, attemptId);
    const exam = await this.prisma.courseExam.findUnique({
      where: { id: attempt.examId },
      include: { course: { select: { slug: true } } },
    });
    if (!exam) throw new NotFoundException('Course exam not found');
    if (attempt.status !== 'SUBMITTED' || attempt.score === null) {
      throw new BadRequestException('Attempt has not been submitted');
    }
    return this.toSubmitResult(
      exam,
      attempt,
      this.resolveAttemptQuestions(attempt.questions, parseQuestions(exam.questions)),
    );
  }


  // ---------- helpers ----------

  /**
   * EXAM-3: prefer the attempt's pinned question snapshot so grading is immune
   * to admin edits; legacy rows without a snapshot fall back to the live payload
   * (previous behavior).
   */
  private resolveAttemptQuestions(
    snapshot: Prisma.JsonValue | null,
    live: CourseExamQuestion[],
  ): CourseExamQuestion[] {
    return Array.isArray(snapshot) && snapshot.length > 0
      ? (snapshot as unknown as CourseExamQuestion[])
      : live;
  }

  private isCorrect(q: CourseExamQuestion, response: CourseExamResponse | undefined): boolean {
    if (!response || response.type !== q.type) return false;
    if (q.type === 'single_choice') {
      const answer = typeof q.answer === 'string' ? q.answer : q.answer[0];
      return response.type === 'single_choice' && response.optionId === answer;
    }
    const sort = (arr: string[]) => [...arr].sort();
    const expected = sort(Array.isArray(q.answer) ? q.answer : [q.answer]);
    const got = response.type === 'multi_choice' ? sort(response.optionIds) : [];
    return expected.length === got.length && expected.every((id, i) => id === got[i]);
  }

  private toSubmitResult(
    exam: {
      id: string;
      title: string;
      passScore: number;
      questions: Prisma.JsonValue;
      course: { slug: string };
    },
    attempt: {
      id: string;
      score: number | null;
      passed: boolean | null;
      submittedAt: Date | null;
      answers: Prisma.JsonValue | null;
    },
    questions: CourseExamQuestion[],
  ): CourseExamSubmitResult {
    const answers = this.parseAnswers(attempt.answers);
    let correct = 0;
    const details: CourseExamScoreDetail[] = questions.map((q) => {
      const isCorrect = this.isCorrect(q, answers[q.id] as CourseExamResponse | undefined);
      if (isCorrect) correct += 1;
      return { questionId: q.id, correct: isCorrect, points: q.points ?? 1 };
    });
    return {
      attemptId: attempt.id,
      examId: exam.id,
      examTitle: exam.title,
      courseSlug: exam.course.slug,
      score: attempt.score ?? 0,
      passed: attempt.passed ?? false,
      passScore: exam.passScore,
      correctCount: correct,
      totalCount: questions.length,
      details,
      submittedAt: attempt.submittedAt?.toISOString() ?? new Date().toISOString(),
    };
  }

  private toDbKind(kind: CourseExamKind | undefined): 'MIDTERM' | 'FINAL' {
    return kind === 'MIDTERM' ? 'MIDTERM' : 'FINAL';
  }

  private parseAnswers(raw: Prisma.JsonValue | null): Record<string, CourseExamResponse> {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    return raw as Record<string, CourseExamResponse>;
  }

  private sanitizeAnswers(input: Record<string, unknown>): Record<string, CourseExamResponse> {
    const out: Record<string, CourseExamResponse> = {};
    for (const [id, value] of Object.entries(input)) {
      if (!value || typeof value !== 'object') continue;
      const v = value as { type?: string };
      if (v.type === 'single_choice') {
        const optionId = (v as { optionId?: unknown }).optionId;
        if (typeof optionId === 'string' && optionId.length <= 200) {
          out[id] = { type: 'single_choice', optionId };
        }
      } else if (v.type === 'multi_choice') {
        const ids = (v as { optionIds?: unknown }).optionIds;
        if (Array.isArray(ids) && ids.every((i) => typeof i === 'string')) {
          out[id] = { type: 'multi_choice', optionIds: (ids as string[]).slice(0, 50) };
        }
      }
    }
    return out;
  }

  private async assertOwnAttempt(userId: string, attemptId: string) {
    const attempt = await this.prisma.courseExamAttempt.findFirst({
      where: { id: attemptId, userId },
    });
    if (!attempt) throw new NotFoundException('Course exam attempt not found');
    return attempt;
  }


  private async assertEnrolled(userId: string, courseId: string): Promise<void> {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { userId, courseId },
    });
    if (!enrollment) {
      throw new ForbiddenException('Enroll in the course to take its exams');
    }
  }

  private async ensureCourseBySlug(slug: string) {
    const course = await this.prisma.course.findUnique({ where: { slug } });
    if (!course) throw new NotFoundException(`Course ${slug} not found`);
    return course;
  }

  private async ensureExamForCourse(courseSlug: string, examId: string) {
    const course = await this.ensureCourseBySlug(courseSlug);
    const exam = await this.prisma.courseExam.findFirst({
      where: { id: examId, courseId: course.id },
    });
    if (!exam) throw new NotFoundException('Course exam not found');
    return { ...exam, course };
  }

  private toSummary(row: CourseExamRow): CourseExamSummary {
    const courseId = (row as unknown as { courseId: string }).courseId ?? '';
    const kind: CourseExamKind =
      row.kind === 'MIDTERM' ? 'MIDTERM' : row.kind === 'FINAL' ? 'FINAL' : 'FINAL';
    return {
      id: row.id,
      courseId,
      courseSlug: row.course.slug,
      courseTitle: row.course.title,
      title: row.title,
      description: row.description,
      passScore: row.passScore,
      durationMin: row.durationMin,
      maxAttempts: row.maxAttempts,
      published: row.published,
      sortOrder: row.sortOrder,
      kind,
      afterLessonId: row.afterLessonId,
      afterLessonSlug: row.afterLesson?.slug ?? null,
      questionCount: parseQuestions(row.questions).length,
    };
  }

  private toAdminExam(row: CourseExamRow): AdminCourseExam {
    const courseId = (row as unknown as { courseId: string }).courseId ?? '';
    const kind: CourseExamKind =
      row.kind === 'MIDTERM' ? 'MIDTERM' : row.kind === 'FINAL' ? 'FINAL' : 'FINAL';
    return {
      id: row.id,
      courseId,
      courseSlug: row.course.slug,
      courseTitle: row.course.title,
      title: row.title,
      description: row.description,
      passScore: row.passScore,
      durationMin: row.durationMin,
      maxAttempts: row.maxAttempts,
      published: row.published,
      sortOrder: row.sortOrder,
      kind,
      afterLessonId: row.afterLessonId,
      afterLessonSlug: row.afterLesson?.slug ?? null,
      questions: parseQuestions(row.questions),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

