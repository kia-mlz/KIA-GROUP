import { NotFoundException } from '@nestjs/common';
import { EducationalGamesService } from './educational-games.service';

const lesson = {
  id: 'lesson1',
  slug: 'html-home',
  title: 'خانه',
  sortOrder: 0,
  comingSoon: false,
  chapterId: null,
  courseId: 'course1',
  course: {
    id: 'course1',
    slug: 'html',
    title: 'HTML',
    published: true,
    comingSoon: false,
    lessons: [
      { id: 'lesson1', slug: 'html-home', title: 'خانه', sortOrder: 0, comingSoon: false },
    ],
  },
};

function createPrisma() {
  const games: Array<Record<string, unknown>> = [];
  const stages: Array<Record<string, unknown>> = [];
  const progress: Array<Record<string, any>> = [];
  const attempts: Array<Record<string, any>> = [];
  const xp: Array<Record<string, any>> = [];
  const stats: Array<Record<string, any>> = [];
  const achievements = [
    {
      id: 'ach1',
      key: 'first-game',
      title: 'اولین بازی',
      description: 'یک بازی را تمام کن',
      xp: 10,
      rule: { kind: 'GAMES_COMPLETED', threshold: 1 },
    },
  ];
  const userAchievements: Array<Record<string, any>> = [];
  let n = 1;
  const nid = () => `id-${n++}`;

  function hydrate(game: Record<string, any>, include: any) {
    const owner = lesson.id === game.lessonId ? lesson : null;
    const gameStages = stages
      .filter((stage) => stage.gameId === game.id)
      .sort((a, b) => Number(a.sortOrder) - Number(b.sortOrder));
    const result: Record<string, any> = { ...game };
    if (include?.stages) {
      result.stages = include.stages.select
        ? gameStages.map((stage) => pick(stage, include.stages.select))
        : gameStages.map((stage) => ({ ...stage }));
    }
    if (include?.lesson) {
      const select = include.lesson.select ?? {};
      result.lesson = select.title
        ? {
            id: owner?.id,
            title: owner?.title,
            slug: owner?.slug,
            chapterId: null,
            chapter: null,
            course: { id: 'course1', slug: 'html', title: 'HTML' },
          }
        : { slug: owner?.slug, course: { slug: 'html' } };
    }
    return result;
  }

  const prisma = {
    lesson: {
      findUnique: async ({ where }: any) => (lesson.id === where.id ? { id: lesson.id } : null),
      findFirst: async ({ where }: any) =>
        lesson.slug === where.slug && lesson.course.slug === where.course.slug ? lesson : null,
    },
    educationalGame: {
      findUnique: async ({ where, select, include }: any) => {
        const row = where.lessonId_slug
          ? games.find(
              (game) =>
                game.lessonId === where.lessonId_slug.lessonId && game.slug === where.lessonId_slug.slug,
            )
          : games.find((game) => game.id === where.id);
        if (!row) return null;
        if (select && !include) return { id: row.id, prerequisiteGameId: row.prerequisiteGameId ?? null };
        if (include) return hydrate(row, include);
        return row;
      },
      findMany: async ({ where, include }: any) =>
        games
          .filter((game) => {
            if (where.lessonId && game.lessonId !== where.lessonId) return false;
            if (where.publishStatus && game.publishStatus !== where.publishStatus) return false;
            return true;
          })
          .sort((a, b) => Number(a.sortOrder) - Number(b.sortOrder))
          .map((game) => (include ? hydrate(game, include) : game)),
      create: async ({ data, include }: any) => {
        const id = nid();
        const now = new Date();
        const game = {
          id,
          lessonId: data.lessonId,
          slug: data.slug,
          title: data.title,
          description: data.description ?? '',
          learningGoal: data.learningGoal ?? '',
          type: data.type,
          difficulty: data.difficulty,
          estimatedMin: data.estimatedMin,
          points: data.points,
          required: data.required ?? false,
          prerequisiteGameId: data.prerequisiteGameId ?? null,
          settings: data.settings ?? {},
          publishStatus: data.publishStatus,
          sortOrder: 0,
          createdAt: now,
          updatedAt: now,
        };
        games.push(game);
        for (const stage of data.stages?.create ?? []) {
          stages.push({ ...stage, id: nid(), gameId: id, createdAt: now, updatedAt: now });
        }
        return include ? hydrate(game, include) : game;
      },
      update: async ({ where, data }: any) => {
        const game = games.find((item) => item.id === where.id);
        if (!game) return null;
        for (const [key, value] of Object.entries(data)) {
          if (value !== undefined) game[key] = value;
        }
        game.updatedAt = new Date();
        return game;
      },
    },
    gameStage: {
      findFirst: async ({ where }: any) =>
        stages.find((stage) => stage.id === where.id && stage.gameId === where.gameId) ?? null,
    },
    gameAttempt: {
      count: async ({ where }: any) =>
        attempts.filter((attempt) => attempt.userId === where.userId && attempt.stageId === where.stageId)
          .length,
      create: async ({ data }: any) => {
        const row = { ...data, id: nid() };
        attempts.push(row);
        return row;
      },
      findFirst: async ({ where, include }: any) => {
        const row = attempts.find(
          (attempt) => attempt.id === where.id && (!where.userId || attempt.userId === where.userId),
        );
        if (!row) return null;
        if (!include) return row;
        return {
          ...row,
          stage: { title: stages.find((stage) => stage.id === row.stageId)?.title ?? '' },
          game: { title: games.find((game) => game.id === row.gameId)?.title ?? '' },
        };
      },
    },
    userGameProgress: {
      findUnique: async ({ where }: any) => {
        if (where.userId_gameId) {
          return (
            progress.find(
              (row) => row.userId === where.userId_gameId.userId && row.gameId === where.userId_gameId.gameId,
            ) ?? null
          );
        }
        return progress.find((row) => row.id === where.id) ?? null;
      },
      findMany: async ({ where }: any) =>
        progress.filter((row) => row.userId === where.userId && where.gameId.in.includes(row.gameId)),
      create: async ({ data }: any) => {
        const row = {
          id: nid(),
          status: 'IN_PROGRESS',
          currentStageOrder: 0,
          completedStageIds: [],
          score: 0,
          bestScore: 0,
          attemptsCount: 0,
          correctCount: 0,
          gradedCount: 0,
          timeSpentSec: 0,
          everCompleted: false,
          hintsByStage: {},
          startedAt: new Date(),
          completedAt: null,
          updatedAt: new Date(),
          ...data,
        };
        progress.push(row);
        return row;
      },
      update: async ({ where, data }: any) => {
        const row = progress.find((item) => item.id === where.id);
        if (!row) throw new Error('missing progress');
        Object.assign(row, data, { updatedAt: new Date() });
        return row;
      },
    },
    userXpTransaction: {
      create: async ({ data }: any) => {
        const key = `${data.userId}:${data.sourceType}:${data.sourceId}:${data.transactionType}`;
        if (xp.some((row) => row.key === key)) {
          const error = new Error('unique') as Error & { code?: string };
          error.code = 'P2002';
          throw error;
        }
        const row = { ...data, id: nid(), key, createdAt: new Date() };
        xp.push(row);
        return row;
      },
    },
    learnerGameStats: {
      findUnique: async ({ where }: any) => stats.find((row) => row.userId === where.userId) ?? null,
      create: async ({ data }: any) => {
        const row = { xp: 0, level: 1, streakDays: 0, gamesCompleted: 0, lastActiveKey: null, ...data };
        stats.push(row);
        return row;
      },
      update: async ({ where, data }: any) => {
        const row = stats.find((item) => item.userId === where.userId);
        if (!row) throw new Error('missing stats');
        Object.assign(row, data);
        return row;
      },
      upsert: async ({ where, create, update }: any) => {
        const row = stats.find((item) => item.userId === where.userId);
        if (!row) {
          const created = {
            xp: 0,
            level: 1,
            streakDays: 0,
            gamesCompleted: 0,
            lastActiveKey: null,
            ...create,
          };
          stats.push(created);
          return created;
        }
        if (update.xp?.increment) row.xp += update.xp.increment;
        if (update.gamesCompleted?.increment) row.gamesCompleted += update.gamesCompleted.increment;
        return row;
      },
    },
    achievement: { findMany: async () => achievements },
    userAchievement: {
      findMany: async ({ where, include }: any) => {
        const rows = userAchievements.filter((row) => row.userId === where.userId);
        if (!include) return rows;
        return rows.map((row) => ({
          ...row,
          achievement: achievements.find((item) => item.id === row.achievementId),
        }));
      },
      create: async ({ data }: any) => {
        const row = { ...data, id: nid(), earnedAt: new Date() };
        userAchievements.push(row);
        return row;
      },
    },
    entitlement: { findFirst: async () => null },
  };

  return { prisma, games, attempts, xp, stats };
}

function pick(row: Record<string, unknown>, select: Record<string, boolean>) {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(select)) if (select[key]) out[key] = row[key];
  return out;
}

function stage(partial: Record<string, unknown>) {
  return {
    title: 'مرحله',
    mission: 'ماموریت',
    challengeType: 'mcq',
    challengeConfig: { ui: 'quiz', prompt: '؟', options: [{ id: 'a', text: 'الف' }] },
    gradingConfig: { strategy: 'mcq', correctIds: ['SECRET_SENTINEL'] },
    hints: ['به برچسب عنوان فکر کن'],
    points: 10,
    ...partial,
  };
}

describe('EducationalGamesService', () => {
  it('creates and updates a game for admins', async () => {
    const { prisma } = createPrisma();
    const service = new EducationalGamesService(prisma as never);
    const created = await service.create({
      lessonId: 'lesson1',
      title: 'آزمون عنوان',
      type: 'QUIZ',
      publishStatus: 'DRAFT',
      stages: [stage({})],
    });
    expect(created.publishStatus).toBe('DRAFT');
    expect(created.stages[0].gradingConfig).toMatchObject({ correctIds: ['SECRET_SENTINEL'] });
    const updated = await service.update(created.id, { title: 'آزمون عنوان صفحه' });
    expect(updated.title).toBe('آزمون عنوان صفحه');
  });

  it('hides unpublished games, grades a quiz once for XP, and blocks another user', async () => {
    const { prisma, attempts, xp, stats } = createPrisma();
    const service = new EducationalGamesService(prisma as never);
    const draft = await service.create({
      lessonId: 'lesson1',
      title: 'پیش‌نویس',
      type: 'QUIZ',
      publishStatus: 'DRAFT',
      stages: [stage({})],
    });
    const quiz = await service.create({
      lessonId: 'lesson1',
      title: 'عنوان صفحه',
      type: 'QUIZ',
      points: 50,
      publishStatus: 'PUBLISHED',
      stages: [stage({ title: 'سؤال' })],
    });
    const drag = await service.create({
      lessonId: 'lesson1',
      title: 'چینش',
      type: 'DRAG_DROP',
      points: 20,
      publishStatus: 'PUBLISHED',
      stages: [
        stage({
          title: 'جایگذاری',
          challengeType: 'drag_drop',
          challengeConfig: {
            ui: 'drag',
            items: [{ id: 'title', label: 'عنوان' }],
            slots: [{ id: 'h1', label: 'سرتیتر' }],
          },
          gradingConfig: { strategy: 'drag_drop', placements: { h1: 'SECRET_SENTINEL' } },
        }),
      ],
    });
    const code = await service.create({
      lessonId: 'lesson1',
      title: 'تابع',
      type: 'CODE_EDITOR',
      points: 20,
      publishStatus: 'PUBLISHED',
      stages: [
        stage({
          title: 'تعریف تابع',
          challengeType: 'test_cases',
          challengeConfig: { ui: 'code', language: 'javascript', starter: '' },
          gradingConfig: {
            strategy: 'test_cases',
            language: 'javascript',
            mustDeclareFunctions: ['greet'],
          },
          points: 15,
        }),
      ],
    });

    const listed = await service.listForLesson('user-a', 'html', 'html-home');
    expect(listed.games.map((game) => game.id)).not.toContain(draft.id);
    expect(JSON.stringify(listed)).not.toContain('SECRET_SENTINEL');

    await expect(service.getForLearner('user-a', draft.id)).rejects.toBeInstanceOf(NotFoundException);

    const started = await service.start('user-a', quiz.id);
    const resumed = await service.resume('user-a', quiz.id);
    expect(resumed.game.progress.status).toBe('IN_PROGRESS');
    expect(started.game.stages?.[0].challengeConfig).not.toHaveProperty('correctIds');

    const stageId = quiz.stages[0].id;
    const wrong = await service.submit('user-a', quiz.id, stageId, { selected: ['nope'] });
    expect(wrong.passed).toBe(false);
    expect(attempts).toHaveLength(1);

    const right = await service.submit('user-a', quiz.id, stageId, { selected: ['SECRET_SENTINEL'] });
    expect(right.passed).toBe(true);
    expect(right.gameCompleted).toBe(true);
    expect(right.xpAwarded).toBe(60);
    expect(right.achievements.map((item) => item.key)).toContain('first-game');
    expect(stats.find((row) => row.userId === 'user-a')?.xp).toBe(70);
    const saved = await service.progress('user-a', quiz.id);
    expect(saved.progress.status).toBe('COMPLETED');

    await service.restart('user-a', quiz.id);
    const replay = await service.submit('user-a', quiz.id, stageId, { selected: ['SECRET_SENTINEL'] });
    expect(replay.passed).toBe(true);
    expect(replay.xpAwarded).toBe(0);
    expect(stats.find((row) => row.userId === 'user-a')?.xp).toBe(70);
    expect(xp.filter((row) => row.sourceType === 'GAME_STAGE')).toHaveLength(1);

    await expect(service.getAttempt('user-b', right.attemptId)).rejects.toBeInstanceOf(NotFoundException);
    const own = await service.getAttempt('user-a', right.attemptId);
    expect('userId' in own).toBe(false);
    expect(JSON.stringify(own)).not.toContain('gradingConfig');

    const dragStart = await service.start('user-a', drag.id);
    const dragStage = dragStart.game.stages?.[0].id ?? '';
    const dropped = await service.submit('user-a', drag.id, dragStage, {
      placements: { h1: 'SECRET_SENTINEL' },
    });
    expect(dropped.passed).toBe(true);

    const codeStart = await service.start('user-a', code.id);
    const codeStage = codeStart.game.stages?.[0].id ?? '';
    const coded = await service.submit('user-a', code.id, codeStage, {
      code: 'function greet(){ return "سلام"; }',
    });
    expect(coded.passed).toBe(true);
    expect(coded.feedback).not.toContain('mustDeclareFunctions');
  });
});
