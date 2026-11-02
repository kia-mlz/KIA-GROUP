import type {
  AdminEducationalGame,
  AdminGameResults,
  AdminGamesDashboard,
  CourseGamesSummary,
  GameCatalogCourse,
  GameHintResult,
  GamePlaySession,
  GameSubmitResult,
  JsonRecord,
  LearnerEducationalGame,
  LearnerGameProgress,
  LearnerGameStage,
  LessonGamesResponse,
  UserGameStatus,
} from '@kia./shared';
import { ApiError } from '@/lib/apiError';
import { courseCatalog } from '@/lib/courseCatalog';

/**
 * Published demo games for the GitHub Pages export.
 * Params must be known at build time, and the play page must render without a live API.
 */

type DemoStage = {
  id: string;
  title: string;
  description: string;
  mission: string;
  sortOrder: number;
  challengeType: string;
  challengeConfig: JsonRecord;
  grading: { strategy: string; correctIds: string[] };
  hints: string[];
  points: number;
  timeLimitSec: number | null;
};

type DemoGame = {
  id: string;
  slug: string;
  title: string;
  description: string;
  learningGoal: string;
  type: LearnerEducationalGame['type'];
  difficulty: LearnerEducationalGame['difficulty'];
  estimatedMin: number;
  points: number;
  required: boolean;
  sortOrder: number;
  publishStatus: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  lessonId: string;
  lessonSlug: string;
  lessonTitle: string;
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  nextLessonSlug: string | null;
  chapterId: string | null;
  chapterTitle: string | null;
  settings: JsonRecord;
  stages: DemoStage[];
};

type StoredProgress = {
  status: UserGameStatus;
  completedStageIds: string[];
  score: number;
  bestScore: number;
  attemptsCount: number;
  correctCount: number;
  gradedCount: number;
  timeSpentSec: number;
  everCompleted: boolean;
  startedAt: string | null;
  completedAt: string | null;
  hintsByStage: Record<string, number>;
};

const PROGRESS_KEY = 'kia-demo-educational-games';
const CREATED_AT = '2026-08-01T09:00:00.000Z';

function buildDemoGames(): DemoGame[] {
  const course =
    courseCatalog.find((item) => item.slug === 'html') ??
    courseCatalog.find((item) => item.lessons.length > 0);
  if (!course) return [];
  const lesson =
    course.lessons.find((item) => /heading/i.test(`${item.slug} ${item.title}`)) ??
    course.lessons[0];
  if (!lesson) return [];
  const lessonIndex = course.lessons.findIndex((item) => item.slug === lesson.slug);
  const next = course.lessons[lessonIndex + 1] ?? null;
  const id = `demo-game-${course.slug}-${lesson.slug}`;
  return [
    {
      id,
      slug: 'heading-quiz',
      title: 'عنوان صفحه را بشناس',
      description: 'میان برچسب‌های پایه HTML، عنوان اصلی را پیدا کن.',
      learningGoal: 'تشخیص برچسب عنوان سطح یک',
      type: 'QUIZ',
      difficulty: 'BEGINNER',
      estimatedMin: 8,
      points: 30,
      required: false,
      sortOrder: 0,
      publishStatus: 'PUBLISHED',
      lessonId: `lesson-${course.slug}-${lesson.slug}`,
      lessonSlug: lesson.slug,
      lessonTitle: lesson.title,
      courseId: `course-${course.slug}`,
      courseSlug: course.slug,
      courseTitle: course.title,
      nextLessonSlug: next?.slug ?? null,
      chapterId: null,
      chapterTitle: null,
      settings: { passScorePct: 100, hintPenalty: 0 },
      stages: [
        {
          id: `${id}-stage-1`,
          title: 'کدام برچسب عنوان اصلی است؟',
          description: '',
          mission: 'عنوان اصلی یک صفحه وب را انتخاب کن.',
          sortOrder: 0,
          challengeType: 'mcq',
          challengeConfig: {
            ui: 'quiz',
            prompt: 'کدام برچسب عنوان اصلی صفحه است؟',
            options: [
              { id: 'p', text: 'p' },
              { id: 'h1', text: 'h1' },
              { id: 'div', text: 'div' },
              { id: 'span', text: 'span' },
            ],
          },
          grading: { strategy: 'mcq', correctIds: ['h1'] },
          hints: ['عنوان‌ها با حرف h شروع می‌شوند.', 'سطح یک، مهم‌ترین عنوان است.'],
          points: 10,
          timeLimitSec: null,
        },
      ],
    },
  ];
}

const DEMO_GAMES = buildDemoGames();
const progressMemory = new Map<string, StoredProgress>();
let progressHydrated = false;

function publishedGames(): DemoGame[] {
  return DEMO_GAMES.filter((game) => game.publishStatus === 'PUBLISHED');
}

function emptyProgress(): StoredProgress {
  return {
    status: 'NOT_STARTED',
    completedStageIds: [],
    score: 0,
    bestScore: 0,
    attemptsCount: 0,
    correctCount: 0,
    gradedCount: 0,
    timeSpentSec: 0,
    everCompleted: false,
    startedAt: null,
    completedAt: null,
    hintsByStage: {},
  };
}

function hydrateProgress(): void {
  if (progressHydrated || typeof window === 'undefined') return;
  progressHydrated = true;
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, StoredProgress>;
    for (const [id, value] of Object.entries(parsed)) {
      if (!progressMemory.has(id)) progressMemory.set(id, value);
    }
  } catch {
    /* demo keeps the in-memory progress */
  }
}

function readProgress(gameId: string): StoredProgress {
  hydrateProgress();
  return progressMemory.get(gameId) ?? emptyProgress();
}

function writeProgress(gameId: string, progress: StoredProgress): void {
  progressMemory.set(gameId, progress);
  if (typeof window === 'undefined') return;
  try {
    const all: Record<string, StoredProgress> = {};
    for (const [id, value] of progressMemory) all[id] = value;
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
  } catch {
    /* storage full or unavailable */
  }
}

function requireGame(gameId: string): DemoGame {
  const game = publishedGames().find((item) => item.id === gameId);
  if (!game) throw new ApiError('Game not found', 404);
  return game;
}

function selectedIds(answer: unknown): string[] {
  if (!answer || typeof answer !== 'object' || Array.isArray(answer)) return [];
  const selected = (answer as JsonRecord).selected;
  if (Array.isArray(selected)) return selected.map((item) => String(item));
  if (typeof selected === 'string' && selected) return [selected];
  return [];
}

function isStageCorrect(stage: DemoStage, answer: unknown): boolean {
  const chosen = selectedIds(answer);
  const correct = stage.grading.correctIds;
  return correct.length > 0 && correct.every((id) => chosen.includes(id)) && chosen.length === correct.length;
}

function toProgress(game: DemoGame, stored: StoredProgress): LearnerGameProgress {
  const current = game.stages.find((stage) => !stored.completedStageIds.includes(stage.id));
  return {
    status: stored.status,
    currentStageId: stored.status === 'COMPLETED' ? null : (current?.id ?? null),
    completedStageIds: [...stored.completedStageIds],
    score: stored.score,
    bestScore: stored.bestScore,
    attemptsCount: stored.attemptsCount,
    correctCount: stored.correctCount,
    gradedCount: stored.gradedCount,
    timeSpentSec: stored.timeSpentSec,
    everCompleted: stored.everCompleted,
    startedAt: stored.startedAt,
    completedAt: stored.completedAt,
  };
}

function toStages(game: DemoGame, stored: StoredProgress): LearnerGameStage[] {
  return game.stages.map((stage) => ({
    id: stage.id,
    title: stage.title,
    description: stage.description,
    mission: stage.mission,
    sortOrder: stage.sortOrder,
    challengeType: stage.challengeType,
    challengeConfig: stage.challengeConfig,
    hintsAvailable: stage.hints.length,
    hintsRevealed: stored.hintsByStage[stage.id] ?? 0,
    points: stage.points,
    timeLimitSec: stage.timeLimitSec,
  }));
}

function toLearner(game: DemoGame, stored: StoredProgress, includeStages: boolean): LearnerEducationalGame {
  const payload: LearnerEducationalGame = {
    id: game.id,
    slug: game.slug,
    title: game.title,
    description: game.description,
    learningGoal: game.learningGoal,
    type: game.type,
    difficulty: game.difficulty,
    estimatedMin: game.estimatedMin,
    points: game.points,
    required: game.required,
    sortOrder: game.sortOrder,
    stageCount: game.stages.length,
    locked: false,
    lockReason: null,
    lessonId: game.lessonId,
    lessonSlug: game.lessonSlug,
    lessonTitle: game.lessonTitle,
    courseSlug: game.courseSlug,
    courseTitle: game.courseTitle,
    nextLessonSlug: game.nextLessonSlug,
    progress: toProgress(game, stored),
  };
  if (includeStages) payload.stages = toStages(game, stored);
  return payload;
}

function toSession(game: DemoGame, stored: StoredProgress): GamePlaySession {
  return {
    game: toLearner(game, stored, true),
    alreadyCompleted: stored.status === 'COMPLETED',
  };
}

function markStarted(stored: StoredProgress): StoredProgress {
  if (stored.status !== 'NOT_STARTED') return stored;
  return {
    ...stored,
    status: 'IN_PROGRESS',
    startedAt: stored.startedAt ?? new Date().toISOString(),
  };
}

/** One entry per published demo game. Every object has courseSlug, lessonSlug, and gameId. */
export function demoPlayGameStaticParams(): Array<{
  courseSlug: string;
  lessonSlug: string;
  gameId: string;
}> {
  return publishedGames().map((game) => ({
    courseSlug: game.courseSlug,
    lessonSlug: game.lessonSlug,
    gameId: game.id,
  }));
}

export function demoAdminGameStaticParams(): Array<{ id: string }> {
  return publishedGames().map((game) => ({ id: game.id }));
}

export function demoLessonGames(courseSlug: string, lessonSlug: string): LessonGamesResponse {
  const course = courseCatalog.find((item) => item.slug === courseSlug);
  const lesson = course?.lessons.find((item) => item.slug === lessonSlug);
  const games = publishedGames().filter(
    (game) => game.courseSlug === courseSlug && game.lessonSlug === lessonSlug,
  );
  return {
    lessonId: lesson ? `lesson-${courseSlug}-${lessonSlug}` : courseSlug,
    lessonSlug,
    lessonTitle: lesson?.title ?? '',
    courseSlug,
    courseTitle: course?.title ?? '',
    games: games.map((game) => toLearner(game, readProgress(game.id), false)),
  };
}

export function demoCourseGamesSummary(courseSlug: string): CourseGamesSummary {
  const games = publishedGames().filter((game) => game.courseSlug === courseSlug);
  const items = games.map((game) => {
    const stored = readProgress(game.id);
    return {
      id: game.id,
      title: game.title,
      type: game.type,
      difficulty: game.difficulty,
      estimatedMin: game.estimatedMin,
      points: game.points,
      required: game.required,
      status: stored.status,
      locked: false,
      lessonSlug: game.lessonSlug,
      lessonTitle: game.lessonTitle,
    };
  });
  const completed = items.filter((item) => item.status === 'COMPLETED').length;
  const xpEarned = games.reduce((sum, game) => {
    const stored = readProgress(game.id);
    return sum + (stored.status === 'COMPLETED' ? game.points : stored.score);
  }, 0);
  return {
    gameCount: items.length,
    completed,
    remaining: items.length - completed,
    progressPct: items.length ? Math.round((completed / items.length) * 100) : 0,
    xpEarned,
    level: 1,
    streakDays: 0,
    games: items,
  };
}

export function demoStartGame(gameId: string): GamePlaySession {
  return demoResumeGame(gameId);
}

export function demoResumeGame(gameId: string): GamePlaySession {
  const game = requireGame(gameId);
  const stored = markStarted(readProgress(gameId));
  writeProgress(gameId, stored);
  return toSession(game, stored);
}

export function demoRestartGame(gameId: string): GamePlaySession {
  const game = requireGame(gameId);
  const stored: StoredProgress = {
    ...emptyProgress(),
    status: 'IN_PROGRESS',
    startedAt: new Date().toISOString(),
  };
  writeProgress(gameId, stored);
  return toSession(game, stored);
}

export function demoSubmitStage(gameId: string, stageId: string, answer: unknown): GameSubmitResult {
  const game = requireGame(gameId);
  const stage = game.stages.find((item) => item.id === stageId);
  if (!stage) throw new ApiError('Stage not found', 404);
  const stored = markStarted(readProgress(gameId));
  const correct = isStageCorrect(stage, answer);
  stored.attemptsCount += 1;
  stored.gradedCount += 1;
  stored.timeSpentSec += 1;
  if (correct && !stored.completedStageIds.includes(stage.id)) {
    stored.completedStageIds = [...stored.completedStageIds, stage.id];
    stored.correctCount += 1;
    stored.score += stage.points;
    stored.bestScore = Math.max(stored.bestScore, stored.score);
  }
  const allDone = game.stages.every((item) => stored.completedStageIds.includes(item.id));
  let xpAwarded = 0;
  if (allDone) {
    if (!stored.everCompleted) xpAwarded = game.points;
    stored.everCompleted = true;
    stored.status = 'COMPLETED';
    stored.completedAt = stored.completedAt ?? new Date().toISOString();
  }
  writeProgress(gameId, stored);
  const progress = toProgress(game, stored);
  return {
    attemptId: `demo-attempt-${gameId}`,
    passed: correct,
    code: correct ? 'correct' : 'incorrect',
    feedback: correct ? 'آفرین، درست بود.' : 'این پاسخ درست نیست. یک بار دیگر امتحان کن.',
    score: stored.score,
    stageCompleted: correct,
    gameCompleted: allDone,
    xpAwarded,
    achievements: [],
    progress,
    result: allDone
      ? {
          score: stored.score,
          bestScore: stored.bestScore,
          timeSpentSec: stored.timeSpentSec,
          attempts: stored.attemptsCount,
          stagesCompleted: stored.completedStageIds.length,
          stageCount: game.stages.length,
          accuracy: stored.gradedCount ? Math.round((stored.correctCount / stored.gradedCount) * 100) : 0,
          badges: [],
        }
      : null,
  };
}

export function demoGameHint(gameId: string, stageId: string, index: number): GameHintResult {
  const game = requireGame(gameId);
  const stage = game.stages.find((item) => item.id === stageId);
  if (!stage) throw new ApiError('Stage not found', 404);
  const hint = stage.hints[index];
  if (hint == null) throw new ApiError('Hint not found', 404);
  const stored = markStarted(readProgress(gameId));
  const revealed = Math.max(stored.hintsByStage[stageId] ?? 0, index + 1);
  stored.hintsByStage = { ...stored.hintsByStage, [stageId]: revealed };
  writeProgress(gameId, stored);
  return {
    hint,
    index,
    hintsAvailable: stage.hints.length,
    hintsRevealed: revealed,
  };
}

export function demoAdminListGames(): AdminEducationalGame[] {
  return DEMO_GAMES.map(toAdmin);
}

export function demoAdminGetGame(id: string): AdminEducationalGame {
  const game = DEMO_GAMES.find((item) => item.id === id);
  if (!game) throw new ApiError('Game not found', 404);
  return toAdmin(game);
}

export function demoAdminGamesDashboard(): AdminGamesDashboard {
  const published = DEMO_GAMES.filter((game) => game.publishStatus === 'PUBLISHED').length;
  const drafts = DEMO_GAMES.filter((game) => game.publishStatus === 'DRAFT').length;
  const archived = DEMO_GAMES.filter((game) => game.publishStatus === 'ARCHIVED').length;
  return {
    total: DEMO_GAMES.length,
    published,
    drafts,
    archived,
    participants: 0,
    completions: 0,
    averageScore: 0,
    popular: publishedGames().map((game) => ({ id: game.id, title: game.title, participants: 0 })),
    lessonsWithoutGames: [],
  };
}

export function demoAdminGamesCatalog(): GameCatalogCourse[] {
  const courses: GameCatalogCourse[] = [];
  for (const game of publishedGames()) {
    if (courses.some((course) => course.id === game.courseId)) continue;
    const course = courseCatalog.find((item) => item.slug === game.courseSlug);
    const lesson = course?.lessons.find((item) => item.slug === game.lessonSlug);
    courses.push({
      id: game.courseId,
      title: game.courseTitle,
      slug: game.courseSlug,
      chapters: [],
      unassignedLessons: lesson
        ? [
            {
              id: game.lessonId,
              title: lesson.title,
              slug: lesson.slug,
              sortOrder: lesson.sortOrder,
            },
          ]
        : [],
    });
  }
  return courses;
}

export function demoAdminGameResults(gameId: string): AdminGameResults {
  const game = DEMO_GAMES.find((item) => item.id === gameId);
  if (!game) throw new ApiError('Game not found', 404);
  return {
    gameId: game.id,
    title: game.title,
    participants: 0,
    completed: 0,
    inProgress: 0,
    attempts: 0,
    averageScore: 0,
    averageTimeSec: 0,
    hardStages: [],
    commonWrong: [],
  };
}

function toAdmin(game: DemoGame): AdminEducationalGame {
  return {
    id: game.id,
    lessonId: game.lessonId,
    lessonTitle: game.lessonTitle,
    lessonSlug: game.lessonSlug,
    courseId: game.courseId,
    courseSlug: game.courseSlug,
    courseTitle: game.courseTitle,
    chapterId: game.chapterId,
    chapterTitle: game.chapterTitle,
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
    prerequisiteGameId: null,
    settings: game.settings,
    stages: game.stages.map((stage) => ({
      id: stage.id,
      title: stage.title,
      description: stage.description,
      mission: stage.mission,
      sortOrder: stage.sortOrder,
      challengeType: stage.challengeType,
      challengeConfig: stage.challengeConfig,
      gradingConfig: { strategy: stage.grading.strategy, correctIds: stage.grading.correctIds },
      hints: stage.hints,
      points: stage.points,
      timeLimitSec: stage.timeLimitSec,
    })),
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  };
}
