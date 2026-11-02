import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@kia./platform';
import { PrismaService } from '@kia./platform';
import {
  EDUCATIONAL_GAME_TYPES,
  GRADING_STRATEGIES,
  isFreePreviewLessonIndex,
  type AdminEducationalGame,
  type AdminGameResults,
  type AdminGamesDashboard,
  type CourseGamesSummary,
  type EducationalGameType,
  type GameCatalogCourse,
  type GameCompletionSummary,
  type GameHintResult,
  type GameLeaderboardEntry,
  type GamePlaySession,
  type GameSubmitResult,
  type LearnerEducationalGame,
  type LearnerGameStatsView,
  type LessonGamesResponse,
} from '@kia./shared';
import {
  CreateChapterDto,
  GameStageDto,
  ReorderGamesDto,
  UpdateEducationalGameDto,
  UpsertEducationalGameDto,
} from './dto/educational-game.dto';
import { gradeSubmission } from './grading/grade';
import {
  asHints,
  asRecord,
  asStringArray,
  hintPenalty,
  passScorePct,
  toLearnerGame,
  type GameRow,
  type ProgressRow,
  type StageRow,
} from './educational-games.presenter';
import { achievementMet, isUniqueViolation, levelForXp, nextStreak, tehranDateKey } from './educational-games.xp';

type LessonAccess = {
  id: string;
  slug: string;
  title: string;
  sortOrder: number;
  comingSoon: boolean;
  chapterId: string | null;
  course: {
    id: string;
    slug: string;
    title: string;
    published: boolean;
    comingSoon: boolean;
    lessons: Array<{ id: string; slug: string; title: string; sortOrder: number; comingSoon: boolean }>;
  };
};

const stageSelect = {
  id: true,
  title: true,
  description: true,
  mission: true,
  sortOrder: true,
  challengeType: true,
  challengeConfig: true,
  hints: true,
  points: true,
  timeLimitSec: true,
} as const;

@Injectable()
export class EducationalGamesService {
  constructor(private readonly prisma: PrismaService) {}

  async listForLesson(userId: string, courseSlug: string, lessonSlug: string): Promise<LessonGamesResponse> {
    const lesson = await this.requireLesson(courseSlug, lessonSlug);
    await this.assertLessonPlayable(userId, lesson);
    const games = await this.prisma.educationalGame.findMany({
      where: { lessonId: lesson.id, publishStatus: 'PUBLISHED' },
      orderBy: { sortOrder: 'asc' },
      include: { stages: { orderBy: { sortOrder: 'asc' }, select: stageSelect } },
    });
    const progress = await this.progressMap(
      userId,
      games.map((game) => game.id),
    );
    return {
      lessonId: lesson.id,
      lessonSlug: lesson.slug,
      lessonTitle: lesson.title,
      courseSlug: lesson.course.slug,
      courseTitle: lesson.course.title,
      games: await Promise.all(
        games.map((game) => this.present(userId, game, lesson, progress.get(game.id) ?? null, false)),
      ),
    };
  }

  async courseSummary(userId: string, courseSlug: string): Promise<CourseGamesSummary> {
    const course = await this.prisma.course.findUnique({
      where: { slug: courseSlug },
      include: {
        lessons: {
          orderBy: { sortOrder: 'asc' },
          select: { id: true, slug: true, title: true, sortOrder: true, comingSoon: true },
        },
      },
    });
    if (!course || !course.published) throw new NotFoundException('Course not found');
    const entitled = await this.hasEntitlement(userId, course.slug);
    const games = await this.prisma.educationalGame.findMany({
      where: { publishStatus: 'PUBLISHED', lesson: { courseId: course.id } },
      orderBy: [{ lesson: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
      include: {
        lesson: { select: { id: true, slug: true, title: true, sortOrder: true } },
        stages: { select: { id: true } },
      },
    });
    const progress = await this.progressMap(
      userId,
      games.map((game) => game.id),
    );
    const stageIds = games.flatMap((game) => game.stages.map((stage) => stage.id));
    const xpRows = stageIds.length
      ? await this.prisma.userXpTransaction.findMany({
          where: { userId, sourceId: { in: [...stageIds, ...games.map((game) => game.id)] } },
          select: { amount: true },
        })
      : [];
    const stats = await this.prisma.learnerGameStats.findUnique({ where: { userId } });
    const items = games.map((game) => {
      const index = course.lessons.findIndex((lesson) => lesson.id === game.lesson.id);
      const locked = !entitled && !isFreePreviewLessonIndex(index);
      const row = progress.get(game.id);
      const status = locked ? 'LOCKED' : (row?.status ?? 'NOT_STARTED');
      return {
        id: game.id,
        title: game.title,
        type: game.type,
        difficulty: game.difficulty,
        estimatedMin: game.estimatedMin,
        points: game.points,
        required: game.required,
        status,
        locked,
        lessonSlug: game.lesson.slug,
        lessonTitle: game.lesson.title,
      } as const;
    });
    const completed = items.filter((item) => item.status === 'COMPLETED').length;
    return {
      gameCount: items.length,
      completed,
      remaining: items.length - completed,
      progressPct: items.length ? Math.round((completed / items.length) * 100) : 0,
      xpEarned: xpRows.reduce((sum, row) => sum + row.amount, 0),
      level: stats?.level ?? 1,
      streakDays: stats?.streakDays ?? 0,
      games: items.map((item) => ({ ...item })),
    };
  }

  async getForLearner(userId: string, gameId: string): Promise<LearnerEducationalGame> {
    const game = await this.loadPublished(gameId);
    const lesson = await this.requireLesson(game.lesson.course.slug, game.lesson.slug);
    await this.assertLessonPlayable(userId, lesson);
    const progress = await this.prisma.userGameProgress.findUnique({
      where: { userId_gameId: { userId, gameId } },
    });
    return this.present(userId, game, lesson, progress, true);
  }

  async start(userId: string, gameId: string): Promise<GamePlaySession> {
    return this.open(userId, gameId, false);
  }

  async resume(userId: string, gameId: string): Promise<GamePlaySession> {
    return this.open(userId, gameId, false);
  }

  async restart(userId: string, gameId: string): Promise<GamePlaySession> {
    return this.open(userId, gameId, true);
  }

  async submit(
    userId: string,
    gameId: string,
    stageId: string,
    answer: unknown,
  ): Promise<GameSubmitResult> {
    this.assertAnswer(answer);
    const game = await this.loadPublished(gameId);
    const lesson = await this.requireLesson(game.lesson.course.slug, game.lesson.slug);
    await this.assertLessonPlayable(userId, lesson);
    const lock = await this.lockReason(userId, game.prerequisiteGameId);
    if (lock) throw new ForbiddenException(lock);

    const progress = await this.prisma.userGameProgress.findUnique({
      where: { userId_gameId: { userId, gameId } },
    });
    if (!progress || progress.status === 'NOT_STARTED') {
      throw new BadRequestException('Start the game before submitting');
    }
    if (progress.status === 'COMPLETED') {
      throw new BadRequestException('Restart the game to play again');
    }

    const ordered = [...game.stages].sort((a, b) => a.sortOrder - b.sortOrder);
    const completed = new Set(asStringArray(progress.completedStageIds));
    const current = ordered.find((stage) => !completed.has(stage.id));
    if (!current || current.id !== stageId) throw new BadRequestException('Stage is not the current mission');

    const stage = await this.prisma.gameStage.findFirst({ where: { id: stageId, gameId } });
    if (!stage) throw new NotFoundException('Stage not found');

    const graded = gradeSubmission({
      challengeType: stage.challengeType,
      gradingConfig: stage.gradingConfig,
      answer,
      stagePoints: stage.points,
      passScorePct: passScorePct(game.settings),
    });
    const hintsUsed = Number(asRecord(progress.hintsByStage)[stage.id] ?? 0) || 0;
    const penalty = hintsUsed * hintPenalty(game.settings);
    const awardedPoints = graded.passed ? Math.max(0, graded.points - penalty) : 0;
    const attemptNumber =
      (await this.prisma.gameAttempt.count({ where: { userId, stageId } })) + 1;
    const now = new Date();
    const anchor = progress.updatedAt ?? progress.startedAt ?? now;
    const delta = Math.min(30 * 60, Math.max(1, Math.round((now.getTime() - anchor.getTime()) / 1000)));

    const attempt = await this.prisma.gameAttempt.create({
      data: {
        userId,
        gameId,
        stageId,
        attemptNumber,
        submittedAnswer: answer as Prisma.InputJsonValue,
        gradingResult: {
          code: graded.code,
          feedback: graded.feedback,
          passed: graded.passed,
          pendingManual: graded.pendingManual,
        } as Prisma.InputJsonValue,
        score: awardedPoints,
        passed: graded.passed,
        startedAt: anchor,
        finishedAt: now,
      },
    });

    const completedIds = [...completed];
    let score = progress.score;
    let correctCount = progress.correctCount;
    let status: 'IN_PROGRESS' | 'COMPLETED' = 'IN_PROGRESS';
    const everCompleted = progress.everCompleted;
    let completedAt = progress.completedAt;
    let xpAwarded = 0;
    const firstClear = graded.passed && !completed.has(stage.id);
    if (graded.passed && !completed.has(stage.id)) {
      completedIds.push(stage.id);
      score += awardedPoints;
    }
    if (graded.passed) correctCount += 1;
    const allDone = ordered.every((item) => completedIds.includes(item.id));
    if (allDone && graded.passed) {
      status = 'COMPLETED';
      completedAt = now;
    }

    await this.prisma.userGameProgress.update({
      where: { id: progress.id },
      data: {
        status,
        completedStageIds: completedIds,
        score,
        bestScore: Math.max(progress.bestScore, score),
        attemptsCount: progress.attemptsCount + 1,
        correctCount,
        gradedCount: progress.gradedCount + 1,
        timeSpentSec: progress.timeSpentSec + delta,
        everCompleted: everCompleted || status === 'COMPLETED',
        completedAt,
        currentStageOrder: ordered.findIndex((item) => !completedIds.includes(item.id)),
      },
    });

    if (firstClear) {
      await this.touchStreak(userId);
      xpAwarded += await this.awardXp(userId, 'GAME_STAGE', stage.id, awardedPoints);
    }
    if (status === 'COMPLETED' && !everCompleted) {
      await this.prisma.learnerGameStats.upsert({
        where: { userId },
        create: { userId, xp: 0, level: 1, gamesCompleted: 1, streakDays: 0 },
        update: { gamesCompleted: { increment: 1 } },
      });
      xpAwarded += await this.awardXp(userId, 'GAME_COMPLETE', game.id, game.points);
    }
    const achievements = graded.passed ? await this.syncAchievements(userId) : [];
    const fresh = await this.prisma.userGameProgress.findUnique({ where: { id: progress.id } });
    const presented = await this.present(userId, game, lesson, fresh, false);
    return {
      attemptId: attempt.id,
      passed: graded.passed,
      code: graded.code,
      feedback: graded.feedback,
      score: awardedPoints,
      stageCompleted: firstClear,
      gameCompleted: status === 'COMPLETED',
      xpAwarded,
      achievements,
      progress: presented.progress,
      result: status === 'COMPLETED' ? await this.completion(userId, game.id, ordered.length) : null,
    };
  }

  async hint(userId: string, gameId: string, stageId: string, index: number): Promise<GameHintResult> {
    const game = await this.loadPublished(gameId);
    const lesson = await this.requireLesson(game.lesson.course.slug, game.lesson.slug);
    await this.assertLessonPlayable(userId, lesson);
    const stage = game.stages.find((item) => item.id === stageId);
    if (!stage) throw new NotFoundException('Stage not found');
    const hints = asHints(stage.hints);
    const progress = await this.prisma.userGameProgress.findUnique({
      where: { userId_gameId: { userId, gameId } },
    });
    if (!progress || progress.status === 'COMPLETED') throw new BadRequestException('No active stage');
    const revealedMap = asRecord(progress.hintsByStage);
    const revealed = Number(revealedMap[stageId] ?? 0) || 0;
    if (index > revealed || index >= hints.length) throw new BadRequestException('Hint is not available');
    if (index === revealed) {
      revealedMap[stageId] = revealed + 1;
      await this.prisma.userGameProgress.update({
        where: { id: progress.id },
        data: { hintsByStage: revealedMap as Prisma.InputJsonValue },
      });
    }
    return {
      hint: hints[index] ?? '',
      index,
      hintsAvailable: hints.length,
      hintsRevealed: index === revealed ? revealed + 1 : revealed,
    };
  }

  async progress(userId: string, gameId: string) {
    const game = await this.loadPublished(gameId);
    const row = await this.prisma.userGameProgress.findUnique({
      where: { userId_gameId: { userId, gameId } },
    });
    const ordered = [...game.stages].sort((a, b) => a.sortOrder - b.sortOrder);
    const completed = new Set(asStringArray(row?.completedStageIds));
    const current = ordered.find((stage) => !completed.has(stage.id)) ?? null;
    return {
      gameId,
      progress: {
        status: row?.status ?? 'NOT_STARTED',
        currentStageId: current?.id ?? null,
        completedStageIds: [...completed],
        score: row?.score ?? 0,
        bestScore: row?.bestScore ?? 0,
        attemptsCount: row?.attemptsCount ?? 0,
        correctCount: row?.correctCount ?? 0,
        gradedCount: row?.gradedCount ?? 0,
        timeSpentSec: row?.timeSpentSec ?? 0,
        everCompleted: row?.everCompleted ?? false,
        startedAt: row?.startedAt?.toISOString() ?? null,
        completedAt: row?.completedAt?.toISOString() ?? null,
      },
    };
  }

  async history(userId: string) {
    const rows = await this.prisma.gameAttempt.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      take: 40,
      include: { stage: { select: { title: true } }, game: { select: { title: true, id: true } } },
    });
    return rows.map((row) => ({
      id: row.id,
      gameId: row.gameId,
      gameTitle: row.game.title,
      stageTitle: row.stage.title,
      score: row.score,
      passed: row.passed,
      startedAt: row.startedAt.toISOString(),
      finishedAt: row.finishedAt?.toISOString() ?? null,
    }));
  }

  async getAttempt(
    userId: string,
    attemptId: string,
  ): Promise<{
    id: string;
    gameId: string;
    gameTitle: string;
    stageTitle: string;
    attemptNumber: number;
    submittedAnswer: unknown;
    score: number;
    passed: boolean;
    code: string | null;
    feedback: string;
    startedAt: string;
    finishedAt: string | null;
  }> {
    const row = await this.prisma.gameAttempt.findFirst({
      where: { id: attemptId, userId },
      include: { stage: { select: { title: true } }, game: { select: { title: true } } },
    });
    if (!row) throw new NotFoundException('Attempt not found');
    const result = asRecord(row.gradingResult);
    const code = result.code;
    const feedback = result.feedback;
    return {
      id: row.id,
      gameId: row.gameId,
      gameTitle: row.game.title,
      stageTitle: row.stage.title,
      attemptNumber: row.attemptNumber,
      submittedAnswer: row.submittedAnswer,
      score: row.score,
      passed: row.passed,
      code: typeof code === 'string' ? code : null,
      feedback: typeof feedback === 'string' ? feedback : '',
      startedAt: row.startedAt.toISOString(),
      finishedAt: row.finishedAt?.toISOString() ?? null,
    };
  }

  async stats(userId: string): Promise<LearnerGameStatsView> {
    const stats = await this.prisma.learnerGameStats.findUnique({ where: { userId } });
    const awards = await this.prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
      orderBy: { earnedAt: 'asc' },
    });
    return {
      xp: stats?.xp ?? 0,
      level: stats?.level ?? 1,
      streakDays: stats?.streakDays ?? 0,
      gamesCompleted: stats?.gamesCompleted ?? 0,
      achievements: awards.map((award) => ({
        key: award.achievement.key,
        title: award.achievement.title,
        description: award.achievement.description,
        earnedAt: award.earnedAt.toISOString(),
      })),
    };
  }

  async leaderboard(): Promise<GameLeaderboardEntry[]> {
    const rows = await this.prisma.learnerGameStats.findMany({
      orderBy: [{ xp: 'desc' }, { gamesCompleted: 'desc' }],
      take: 20,
      include: { user: { select: { name: true, firstName: true, lastName: true } } },
    });
    return rows.map((row, index) => ({
      rank: index + 1,
      name: displayName(row.user),
      xp: row.xp,
      level: row.level,
      gamesCompleted: row.gamesCompleted,
    }));
  }

  async dashboard(): Promise<AdminGamesDashboard> {
    const [total, published, drafts, archived, participants, completions, scoreAgg, popular, lessons] =
      await Promise.all([
        this.prisma.educationalGame.count(),
        this.prisma.educationalGame.count({ where: { publishStatus: 'PUBLISHED' } }),
        this.prisma.educationalGame.count({ where: { publishStatus: 'DRAFT' } }),
        this.prisma.educationalGame.count({ where: { publishStatus: 'ARCHIVED' } }),
        this.prisma.userGameProgress.groupBy({ by: ['userId'] }).then((rows) => rows.length),
        this.prisma.userGameProgress.count({ where: { status: 'COMPLETED' } }),
        this.prisma.userGameProgress.aggregate({
          where: { status: 'COMPLETED' },
          _avg: { bestScore: true },
        }),
        this.prisma.educationalGame.findMany({
          where: { publishStatus: 'PUBLISHED' },
          include: { _count: { select: { progress: true } } },
        }),
        this.prisma.lesson.findMany({
          where: { games: { none: {} }, course: { published: true } },
          take: 12,
          orderBy: [{ course: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
          select: {
            id: true,
            title: true,
            course: { select: { title: true, slug: true } },
          },
        }),
      ]);
    return {
      total,
      published,
      drafts,
      archived,
      participants,
      completions,
      averageScore: Math.round(scoreAgg._avg.bestScore ?? 0),
      popular: [...popular]
        .sort((a, b) => b._count.progress - a._count.progress)
        .slice(0, 5)
        .map((game) => ({
          id: game.id,
          title: game.title,
          participants: game._count.progress,
        })),
      lessonsWithoutGames: lessons.map((lesson) => ({
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        courseTitle: lesson.course.title,
        courseSlug: lesson.course.slug,
      })),
    };
  }

  async catalog(): Promise<GameCatalogCourse[]> {
    const courses = await this.prisma.course.findMany({
      where: { published: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        chapters: { orderBy: { sortOrder: 'asc' } },
        lessons: { orderBy: { sortOrder: 'asc' } },
      },
    });
    return courses.map((course) => ({
      id: course.id,
      title: course.title,
      slug: course.slug,
      chapters: course.chapters.map((chapter) => ({
        id: chapter.id,
        title: chapter.title,
        sortOrder: chapter.sortOrder,
        lessons: course.lessons
          .filter((lesson) => lesson.chapterId === chapter.id)
          .map(toCatalogLesson),
      })),
      unassignedLessons: course.lessons.filter((lesson) => !lesson.chapterId).map(toCatalogLesson),
    }));
  }

  async listAdmin(query: { status?: string; type?: string; q?: string; lessonId?: string; courseId?: string }) {
    const games = await this.prisma.educationalGame.findMany({
      where: {
        publishStatus: isStatus(query.status) ? query.status : undefined,
        type: isType(query.type) ? query.type : undefined,
        lessonId: query.lessonId || undefined,
        lesson: query.courseId ? { courseId: query.courseId } : undefined,
        OR: query.q
          ? [
              { title: { contains: query.q, mode: 'insensitive' } },
              { description: { contains: query.q, mode: 'insensitive' } },
            ]
          : undefined,
      },
      orderBy: [{ updatedAt: 'desc' }],
      include: adminInclude,
    });
    return games.map(toAdmin);
  }

  async getAdmin(id: string): Promise<AdminEducationalGame> {
    const game = await this.prisma.educationalGame.findUnique({ where: { id }, include: adminInclude });
    if (!game) throw new NotFoundException('Game not found');
    return toAdmin(game);
  }

  async create(dto: UpsertEducationalGameDto): Promise<AdminEducationalGame> {
    await this.assertLessonExists(dto.lessonId);
    this.assertStages(dto.stages ?? [], dto.publishStatus ?? 'DRAFT');
    await this.assertPrerequisite(dto.prerequisiteGameId, null);
    const slug = await this.uniqueSlug(dto.lessonId, slugify(dto.slug || dto.title));
    const game = await this.prisma.educationalGame.create({
      data: {
        lessonId: dto.lessonId,
        slug,
        title: dto.title.trim(),
        description: dto.description?.trim() ?? '',
        learningGoal: dto.learningGoal?.trim() ?? '',
        type: dto.type,
        difficulty: dto.difficulty ?? 'BEGINNER',
        estimatedMin: dto.estimatedMin ?? 10,
        points: dto.points ?? 50,
        required: dto.required ?? false,
        prerequisiteGameId: dto.prerequisiteGameId || null,
        settings: (dto.settings ?? {}) as Prisma.InputJsonValue,
        publishStatus: dto.publishStatus ?? 'DRAFT',
        stages: { create: (dto.stages ?? []).map((stage, index) => stageCreate(stage, index)) },
      },
      include: adminInclude,
    });
    return toAdmin(game);
  }

  async update(id: string, dto: UpdateEducationalGameDto): Promise<AdminEducationalGame> {
    const existing = await this.prisma.educationalGame.findUnique({
      where: { id },
      include: { stages: true },
    });
    if (!existing) throw new NotFoundException('Game not found');
    const lessonId = dto.lessonId ?? existing.lessonId;
    if (dto.lessonId) await this.assertLessonExists(lessonId);
    if (dto.stages) this.assertStages(dto.stages, dto.publishStatus ?? existing.publishStatus);
    if (dto.prerequisiteGameId !== undefined) await this.assertPrerequisite(dto.prerequisiteGameId, id);
    const slug =
      dto.slug || dto.title
        ? await this.uniqueSlug(lessonId, slugify(dto.slug || dto.title || existing.slug), id)
        : undefined;
    await this.prisma.educationalGame.update({
      where: { id },
      data: {
        lessonId,
        slug,
        title: dto.title?.trim(),
        description: dto.description?.trim(),
        learningGoal: dto.learningGoal?.trim(),
        type: dto.type,
        difficulty: dto.difficulty,
        estimatedMin: dto.estimatedMin,
        points: dto.points,
        required: dto.required,
        prerequisiteGameId:
          dto.prerequisiteGameId === undefined ? undefined : dto.prerequisiteGameId || null,
        settings: dto.settings ? (dto.settings as Prisma.InputJsonValue) : undefined,
        publishStatus: dto.publishStatus,
      },
    });
    if (dto.stages) await this.replaceStages(id, existing.stages.map((stage) => stage.id), dto.stages);
    return this.getAdmin(id);
  }

  async duplicate(id: string): Promise<AdminEducationalGame> {
    const existing = await this.getAdmin(id);
    return this.create({
      lessonId: existing.lessonId,
      title: `${existing.title} (کپی)`,
      description: existing.description,
      learningGoal: existing.learningGoal,
      type: existing.type,
      difficulty: existing.difficulty,
      estimatedMin: existing.estimatedMin,
      points: existing.points,
      required: existing.required,
      settings: existing.settings,
      publishStatus: 'DRAFT',
      stages: existing.stages.map((stage) => ({
        title: stage.title,
        description: stage.description,
        mission: stage.mission,
        sortOrder: stage.sortOrder,
        challengeType: stage.challengeType,
        challengeConfig: stage.challengeConfig ?? {},
        gradingConfig: stage.gradingConfig ?? {},
        hints: stage.hints,
        points: stage.points,
        timeLimitSec: stage.timeLimitSec,
      })),
    });
  }

  async setPublished(id: string, published: boolean): Promise<AdminEducationalGame> {
    const game = await this.prisma.educationalGame.findUnique({
      where: { id },
      include: { stages: { select: { id: true } } },
    });
    if (!game) throw new NotFoundException('Game not found');
    if (published && game.stages.length === 0) {
      throw new BadRequestException('Add at least one stage before publishing');
    }
    await this.prisma.educationalGame.update({
      where: { id },
      data: { publishStatus: published ? 'PUBLISHED' : 'DRAFT' },
    });
    return this.getAdmin(id);
  }

  async remove(id: string): Promise<{ archived: boolean; deleted: boolean }> {
    const attempts = await this.prisma.gameAttempt.count({ where: { gameId: id } });
    if (attempts > 0) {
      await this.prisma.educationalGame.update({
        where: { id },
        data: { publishStatus: 'ARCHIVED' },
      });
      return { archived: true, deleted: false };
    }
    await this.prisma.educationalGame.delete({ where: { id } });
    return { archived: false, deleted: true };
  }

  async reorder(dto: ReorderGamesDto): Promise<{ ok: true }> {
    await this.prisma.$transaction(
      dto.ids.map((id, index) =>
        this.prisma.educationalGame.updateMany({
          where: { id, lessonId: dto.lessonId },
          data: { sortOrder: index },
        }),
      ),
    );
    return { ok: true };
  }

  async results(id: string): Promise<AdminGameResults> {
    const game = await this.prisma.educationalGame.findUnique({
      where: { id },
      include: { stages: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!game) throw new NotFoundException('Game not found');
    const [participants, completed, inProgress, attempts, progressAgg] = await Promise.all([
      this.prisma.userGameProgress.count({ where: { gameId: id } }),
      this.prisma.userGameProgress.count({ where: { gameId: id, status: 'COMPLETED' } }),
      this.prisma.userGameProgress.count({ where: { gameId: id, status: 'IN_PROGRESS' } }),
      this.prisma.gameAttempt.findMany({
        where: { gameId: id },
        select: { stageId: true, passed: true, submittedAnswer: true, startedAt: true, finishedAt: true },
      }),
      this.prisma.userGameProgress.aggregate({
        where: { gameId: id, status: 'COMPLETED' },
        _avg: { bestScore: true, timeSpentSec: true },
      }),
    ]);
    const hardStages = game.stages.map((stage) => {
      const rows = attempts.filter((attempt) => attempt.stageId === stage.id);
      const fails = rows.filter((attempt) => !attempt.passed).length;
      return {
        stageId: stage.id,
        title: stage.title,
        attempts: rows.length,
        failRate: rows.length ? Math.round((fails / rows.length) * 100) : 0,
      };
    });
    const wrongCounts = new Map<string, { stageId: string; stageTitle: string; preview: string; count: number }>();
    for (const attempt of attempts) {
      if (attempt.passed) continue;
      const stage = game.stages.find((item) => item.id === attempt.stageId);
      const preview = JSON.stringify(attempt.submittedAnswer).slice(0, 80);
      const key = `${attempt.stageId}:${preview}`;
      const current = wrongCounts.get(key);
      if (current) current.count += 1;
      else wrongCounts.set(key, { stageId: attempt.stageId, stageTitle: stage?.title ?? '', preview, count: 1 });
    }
    return {
      gameId: id,
      title: game.title,
      participants,
      completed,
      inProgress,
      attempts: attempts.length,
      averageScore: Math.round(progressAgg._avg.bestScore ?? 0),
      averageTimeSec: Math.round(progressAgg._avg.timeSpentSec ?? 0),
      hardStages: hardStages.sort((a, b) => b.failRate - a.failRate).slice(0, 5),
      commonWrong: [...wrongCounts.values()].sort((a, b) => b.count - a.count).slice(0, 8),
    };
  }

  async createChapter(dto: CreateChapterDto) {
    const course = await this.prisma.course.findUnique({ where: { id: dto.courseId } });
    if (!course) throw new NotFoundException('Course not found');
    return this.prisma.chapter.create({
      data: {
        courseId: dto.courseId,
        title: dto.title.trim(),
        description: dto.description?.trim() ?? '',
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async assignChapter(lessonId: string, chapterId: string | null) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('Lesson not found');
    if (chapterId) {
      const chapter = await this.prisma.chapter.findUnique({ where: { id: chapterId } });
      if (!chapter || chapter.courseId !== lesson.courseId) {
        throw new BadRequestException('Chapter does not belong to this course');
      }
    }
    return this.prisma.lesson.update({
      where: { id: lessonId },
      data: { chapterId },
      select: { id: true, chapterId: true },
    });
  }

  private async open(userId: string, gameId: string, restart: boolean): Promise<GamePlaySession> {
    const game = await this.loadPublished(gameId);
    const lesson = await this.requireLesson(game.lesson.course.slug, game.lesson.slug);
    await this.assertLessonPlayable(userId, lesson);
    const lock = await this.lockReason(userId, game.prerequisiteGameId);
    if (lock) throw new ForbiddenException(lock);
    let progress = await this.prisma.userGameProgress.findUnique({
      where: { userId_gameId: { userId, gameId } },
    });
    if (!progress) {
      try {
        progress = await this.prisma.userGameProgress.create({
          data: { userId, gameId, status: 'IN_PROGRESS', startedAt: new Date() },
        });
      } catch (error) {
        if (!isUniqueViolation(error)) {
          throw new InternalServerErrorException('Could not start the game');
        }
        progress = await this.prisma.userGameProgress.findUnique({
          where: { userId_gameId: { userId, gameId } },
        });
        if (!progress) throw new InternalServerErrorException('Could not start the game');
      }
    }
    if (restart || progress.status === 'NOT_STARTED') {
      progress = await this.prisma.userGameProgress.update({
        where: { id: progress.id },
        data: restart
          ? {
              status: 'IN_PROGRESS',
              currentStageOrder: 0,
              completedStageIds: [],
              score: 0,
              correctCount: 0,
              gradedCount: 0,
              hintsByStage: {},
              startedAt: new Date(),
              completedAt: null,
            }
          : { status: 'IN_PROGRESS', startedAt: progress.startedAt ?? new Date() },
      });
    }
    const presented = await this.present(userId, game, lesson, progress, true);
    return { game: presented, alreadyCompleted: progress.status === 'COMPLETED' && !restart };
  }

  private async present(
    userId: string,
    game: {
      id: string;
      slug: string;
      title: string;
      description: string;
      learningGoal: string;
      type: EducationalGameType;
      difficulty: GameRow['difficulty'];
      estimatedMin: number;
      points: number;
      required: boolean;
      sortOrder: number;
      lessonId: string;
      prerequisiteGameId: string | null;
      stages: StageRow[];
    },
    lesson: LessonAccess,
    progress: ProgressRow | null,
    includeStages: boolean,
  ): Promise<LearnerEducationalGame> {
    const ordered = [...lesson.course.lessons].sort((a, b) => a.sortOrder - b.sortOrder);
    const index = ordered.findIndex((item) => item.id === lesson.id);
    const next = ordered.slice(index + 1).find((item) => !item.comingSoon);
    const lock = await this.lockReason(userId, game.prerequisiteGameId);
    return toLearnerGame({
      game,
      lesson,
      course: lesson.course,
      nextLessonSlug: next?.slug ?? null,
      progress,
      locked: Boolean(lock),
      lockReason: lock,
      includeStages,
    });
  }

  private async completion(userId: string, gameId: string, stageCount: number): Promise<GameCompletionSummary> {
    const progress = await this.prisma.userGameProgress.findUnique({
      where: { userId_gameId: { userId, gameId } },
    });
    const badges = await this.prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
    });
    const graded = progress?.gradedCount ?? 0;
    return {
      score: progress?.score ?? 0,
      bestScore: progress?.bestScore ?? 0,
      timeSpentSec: progress?.timeSpentSec ?? 0,
      attempts: progress?.attemptsCount ?? 0,
      stagesCompleted: asStringArray(progress?.completedStageIds).length,
      stageCount,
      accuracy: graded ? Math.round(((progress?.correctCount ?? 0) / graded) * 100) : 0,
      badges: badges.map((badge) => ({
        key: badge.achievement.key,
        title: badge.achievement.title,
        description: badge.achievement.description,
      })),
    };
  }

  private async loadPublished(gameId: string) {
    const game = await this.prisma.educationalGame.findUnique({
      where: { id: gameId },
      include: {
        stages: { orderBy: { sortOrder: 'asc' }, select: stageSelect },
        lesson: { select: { slug: true, course: { select: { slug: true } } } },
      },
    });
    if (!game || game.publishStatus !== 'PUBLISHED') throw new NotFoundException('Game not found');
    return game;
  }

  private async requireLesson(courseSlug: string, lessonSlug: string): Promise<LessonAccess> {
    const lesson = await this.prisma.lesson.findFirst({
      where: { slug: lessonSlug, course: { slug: courseSlug } },
      include: {
        course: {
          include: {
            lessons: {
              orderBy: { sortOrder: 'asc' },
              select: { id: true, slug: true, title: true, sortOrder: true, comingSoon: true },
            },
          },
        },
      },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');
    return lesson;
  }

  private async assertLessonPlayable(userId: string, lesson: LessonAccess) {
    if (!lesson.course.published) throw new NotFoundException('Course not found');
    if (lesson.comingSoon || lesson.course.comingSoon) {
      throw new ForbiddenException('This course is coming soon');
    }
    const index = lesson.course.lessons.findIndex((item) => item.id === lesson.id);
    if (!isFreePreviewLessonIndex(index)) {
      if (!(await this.hasEntitlement(userId, lesson.course.slug))) {
        throw new ForbiddenException('Purchase this course to access lessons');
      }
    }
  }

  private async hasEntitlement(userId: string, courseSlug: string) {
    const row = await this.prisma.entitlement.findFirst({
      where: { userId, resourceType: 'course', resourceId: courseSlug },
    });
    return Boolean(row);
  }

  private async lockReason(userId: string, prerequisiteGameId: string | null): Promise<string | null> {
    if (!prerequisiteGameId) return null;
    const row = await this.prisma.userGameProgress.findUnique({
      where: { userId_gameId: { userId, gameId: prerequisiteGameId } },
    });
    if (row?.everCompleted || row?.status === 'COMPLETED') return null;
    return 'Complete the prerequisite game first';
  }

  private async progressMap(userId: string, gameIds: string[]) {
    if (!gameIds.length) return new Map<string, ProgressRow>();
    const rows = await this.prisma.userGameProgress.findMany({
      where: { userId, gameId: { in: gameIds } },
    });
    return new Map(rows.map((row) => [row.gameId, row]));
  }

  private assertAnswer(answer: unknown) {
    let encoded: string;
    try {
      encoded = JSON.stringify(answer) ?? '';
    } catch {
      throw new BadRequestException('Answer could not be read');
    }
    if (!encoded || encoded === 'null') throw new BadRequestException('Answer is required');
    if (encoded.length > 40_000) throw new BadRequestException('Answer is too large');
  }

  private async awardXp(userId: string, sourceType: string, sourceId: string, amount: number) {
    const xp = Math.max(0, Math.round(amount));
    if (!xp) return 0;
    try {
      await this.prisma.userXpTransaction.create({
        data: { userId, sourceType, sourceId, amount: xp, transactionType: 'EARN' },
      });
    } catch (error) {
      if (isUniqueViolation(error)) return 0;
      throw error;
    }
    const stats = await this.prisma.learnerGameStats.upsert({
      where: { userId },
      create: { userId, xp, level: levelForXp(xp), streakDays: 0, gamesCompleted: 0 },
      update: { xp: { increment: xp } },
    });
    const level = levelForXp(stats.xp);
    if (stats.level !== level) {
      await this.prisma.learnerGameStats.update({ where: { userId }, data: { level } });
    }
    return xp;
  }

  private async touchStreak(userId: string) {
    const today = tehranDateKey();
    const stats = await this.prisma.learnerGameStats.findUnique({ where: { userId } });
    if (!stats) {
      await this.prisma.learnerGameStats.create({
        data: { userId, xp: 0, level: 1, streakDays: 1, lastActiveKey: today, gamesCompleted: 0 },
      });
      return;
    }
    if (stats.lastActiveKey === today) return;
    await this.prisma.learnerGameStats.update({
      where: { userId },
      data: { streakDays: nextStreak(stats.lastActiveKey, stats.streakDays, today), lastActiveKey: today },
    });
  }

  private async syncAchievements(userId: string) {
    const earned: Array<{ key: string; title: string }> = [];
    for (let pass = 0; pass < 2; pass += 1) {
      const stats = await this.prisma.learnerGameStats.findUnique({ where: { userId } });
      if (!stats) break;
      const [all, owned] = await Promise.all([
        this.prisma.achievement.findMany(),
        this.prisma.userAchievement.findMany({ where: { userId }, select: { achievementId: true } }),
      ]);
      const have = new Set(owned.map((row) => row.achievementId));
      let added = 0;
      for (const achievement of all) {
        if (have.has(achievement.id)) continue;
        if (!achievementMet(achievement.rule, stats)) continue;
        try {
          await this.prisma.userAchievement.create({
            data: { userId, achievementId: achievement.id },
          });
        } catch (error) {
          if (isUniqueViolation(error)) continue;
          throw error;
        }
        await this.awardXp(userId, 'ACHIEVEMENT', achievement.id, achievement.xp);
        earned.push({ key: achievement.key, title: achievement.title });
        added += 1;
      }
      if (!added) break;
    }
    return earned;
  }

  private assertStages(stages: GameStageDto[], status: string) {
    if (status === 'PUBLISHED' && stages.length === 0) {
      throw new BadRequestException('Add at least one stage before publishing');
    }
    for (const stage of stages) {
      const strategy = String(asRecord(stage.gradingConfig).strategy ?? stage.challengeType);
      if (!GRADING_STRATEGIES.includes(strategy as (typeof GRADING_STRATEGIES)[number])) {
        throw new BadRequestException(`Unknown grading strategy: ${strategy}`);
      }
    }
  }

  private async assertLessonExists(lessonId: string) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId }, select: { id: true } });
    if (!lesson) throw new NotFoundException('Lesson not found');
  }

  private async assertPrerequisite(prerequisiteGameId: string | null | undefined, selfId: string | null) {
    if (!prerequisiteGameId) return;
    if (prerequisiteGameId === selfId) throw new BadRequestException('A game cannot require itself');
    const row = await this.prisma.educationalGame.findUnique({
      where: { id: prerequisiteGameId },
      select: { id: true, prerequisiteGameId: true },
    });
    if (!row) throw new BadRequestException('Prerequisite game was not found');
    if (row.prerequisiteGameId && row.prerequisiteGameId === selfId) {
      throw new BadRequestException('Prerequisite cycle');
    }
  }

  private async uniqueSlug(lessonId: string, base: string, ignoreId?: string) {
    let slug = base || 'game';
    let n = 2;
    while (n < 50) {
      const existing = await this.prisma.educationalGame.findUnique({
        where: { lessonId_slug: { lessonId, slug } },
        select: { id: true },
      });
      if (!existing || existing.id === ignoreId) return slug;
      slug = `${base}-${n}`;
      n += 1;
    }
    return `${base}-${Date.now().toString(36)}`;
  }

  private async replaceStages(gameId: string, existingIds: string[], stages: GameStageDto[]) {
    const kept = new Set(stages.map((stage) => stage.id).filter((id): id is string => Boolean(id)));
    for (const id of existingIds) {
      if (kept.has(id)) continue;
      const attempts = await this.prisma.gameAttempt.count({ where: { stageId: id } });
      if (attempts > 0) throw new BadRequestException('A stage with attempts cannot be removed');
      await this.prisma.gameStage.delete({ where: { id } });
    }
    for (const [index, stage] of stages.entries()) {
      const data = stageCreate(stage, index);
      if (stage.id && existingIds.includes(stage.id)) {
        await this.prisma.gameStage.update({ where: { id: stage.id }, data });
      } else {
        await this.prisma.gameStage.create({ data: { ...data, gameId } });
      }
    }
  }
}

const adminInclude = {
  stages: { orderBy: { sortOrder: 'asc' as const } },
  lesson: {
    select: {
      id: true,
      title: true,
      slug: true,
      chapterId: true,
      chapter: { select: { title: true } },
      course: { select: { id: true, slug: true, title: true } },
    },
  },
};

type AdminRow = {
  id: string;
  lessonId: string;
  slug: string;
  title: string;
  description: string;
  learningGoal: string;
  type: EducationalGameType;
  difficulty: AdminEducationalGame['difficulty'];
  estimatedMin: number;
  points: number;
  publishStatus: AdminEducationalGame['publishStatus'];
  sortOrder: number;
  required: boolean;
  prerequisiteGameId: string | null;
  settings: unknown;
  createdAt: Date;
  updatedAt: Date;
  stages: Array<{
    id: string;
    title: string;
    description: string;
    mission: string;
    sortOrder: number;
    challengeType: string;
    challengeConfig: unknown;
    gradingConfig: unknown;
    hints: unknown;
    points: number;
    timeLimitSec: number | null;
  }>;
  lesson: {
    title: string;
    slug: string;
    chapterId: string | null;
    chapter: { title: string } | null;
    course: { id: string; slug: string; title: string };
  };
};

function toAdmin(game: AdminRow): AdminEducationalGame {
  return {
    id: game.id,
    lessonId: game.lessonId,
    lessonTitle: game.lesson.title,
    lessonSlug: game.lesson.slug,
    courseId: game.lesson.course.id,
    courseSlug: game.lesson.course.slug,
    courseTitle: game.lesson.course.title,
    chapterId: game.lesson.chapterId,
    chapterTitle: game.lesson.chapter?.title ?? null,
    slug: game.slug,
    title: game.title,
    description: game.description,
    learningGoal: game.learningGoal,
    type: game.type,
    difficulty: game.difficulty,
    estimatedMin: game.estimatedMin,
    points: game.points,
    publishStatus: game.publishStatus,
    sortOrder: game.sortOrder,
    required: game.required,
    prerequisiteGameId: game.prerequisiteGameId,
    settings: asRecord(game.settings),
    stages: game.stages.map((stage) => ({
      id: stage.id,
      title: stage.title,
      description: stage.description,
      mission: stage.mission,
      sortOrder: stage.sortOrder,
      challengeType: stage.challengeType,
      challengeConfig: asRecord(stage.challengeConfig),
      gradingConfig: asRecord(stage.gradingConfig),
      hints: asHints(stage.hints),
      points: stage.points,
      timeLimitSec: stage.timeLimitSec,
    })),
    createdAt: game.createdAt.toISOString(),
    updatedAt: game.updatedAt.toISOString(),
  };
}

function stageCreate(stage: GameStageDto, index: number): Prisma.GameStageCreateWithoutGameInput {
  return {
    title: stage.title.trim(),
    description: stage.description?.trim() ?? '',
    mission: stage.mission?.trim() ?? '',
    sortOrder: stage.sortOrder ?? index,
    challengeType: stage.challengeType,
    challengeConfig: stage.challengeConfig as Prisma.InputJsonValue,
    gradingConfig: {
      ...stage.gradingConfig,
      strategy: stage.gradingConfig.strategy ?? stage.challengeType,
    } as Prisma.InputJsonValue,
    hints: (stage.hints ?? []) as Prisma.InputJsonValue,
    points: stage.points ?? 10,
    timeLimitSec: stage.timeLimitSec ?? null,
  };
}

function toCatalogLesson(lesson: { id: string; title: string; slug: string; sortOrder: number }) {
  return { id: lesson.id, title: lesson.title, slug: lesson.slug, sortOrder: lesson.sortOrder };
}

function slugify(input: string): string {
  const base = input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return base || 'game';
}

function displayName(user: { name: string; firstName: string | null; lastName: string | null }) {
  const full = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return full || user.name || 'یادگیرنده';
}

function isStatus(value: string | undefined): value is 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' {
  return value === 'DRAFT' || value === 'PUBLISHED' || value === 'ARCHIVED';
}

function isType(value: string | undefined): value is EducationalGameType {
  return EDUCATIONAL_GAME_TYPES.includes(value as EducationalGameType);
}
