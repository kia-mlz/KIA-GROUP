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
import { buildCoverGameForLesson } from '@kia./shared';
import { ApiError } from '@/lib/apiError';
import { courseCatalog } from '@/lib/courseCatalog';
import { STATIC_COURSE_LESSONS } from '@/lib/staticPaths';

/**
 * Published demo games for the GitHub Pages export.
 * One cover game per static lesson (same blueprints as production seed).
 */

type DemoStage = {
  id: string;
  title: string;
  description: string;
  mission: string;
  sortOrder: number;
  challengeType: string;
  challengeConfig: JsonRecord;
  gradingConfig: JsonRecord;
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

const BRANDING_TITLES: Record<string, string> = {
  'portfolio-story': 'Portfolio Story',
  'interview-framework': 'Interview Framework',
};

function courseTitleFor(slug: string): string {
  if (slug === 'interview-branding') return 'Interview & Personal Branding';
  return courseCatalog.find((course) => course.slug === slug)?.title ?? slug;
}

function lessonsForCourse(courseSlug: string): Array<{ slug: string; title: string }> {
  if (courseSlug === 'interview-branding') {
    return Object.entries(BRANDING_TITLES).map(([slug, title]) => ({ slug, title }));
  }
  return (
    courseCatalog.find((course) => course.slug === courseSlug)?.lessons.map((lesson) => ({
      slug: lesson.slug,
      title: lesson.title,
    })) ?? []
  );
}

function buildDemoGames(): DemoGame[] {
  const byCourse = new Map<string, Array<{ slug: string; title: string }>>();
  for (const entry of STATIC_COURSE_LESSONS) {
    const list = byCourse.get(entry.courseSlug) ?? [];
    if (!list.some((lesson) => lesson.slug === entry.lessonSlug)) {
      const known = lessonsForCourse(entry.courseSlug).find((lesson) => lesson.slug === entry.lessonSlug);
      list.push({ slug: entry.lessonSlug, title: known?.title ?? entry.lessonSlug });
    }
    byCourse.set(entry.courseSlug, list);
  }

  const games: DemoGame[] = [];
  for (const [courseSlug, lessons] of byCourse) {
    const courseTitle = courseTitleFor(courseSlug);
    for (const [lessonIndex, lesson] of lessons.entries()) {
      const blueprint = buildCoverGameForLesson({
        courseSlug,
        lessonSlug: lesson.slug,
        lessonTitle: lesson.title,
        lessonIndex,
      });
      const id = `demo-game-${courseSlug}-${lesson.slug}`;
      const next = lessons[lessonIndex + 1] ?? null;
      games.push({
        id,
        slug: blueprint.slug,
        title: blueprint.title,
        description: blueprint.description,
        learningGoal: blueprint.learningGoal,
        type: blueprint.type,
        difficulty: blueprint.difficulty,
        estimatedMin: blueprint.estimatedMin,
        points: blueprint.points,
        required: blueprint.required,
        sortOrder: 0,
        publishStatus: blueprint.publishStatus === 'ARCHIVED' ? 'ARCHIVED' : blueprint.publishStatus,
        lessonId: `lesson-${courseSlug}-${lesson.slug}`,
        lessonSlug: lesson.slug,
        lessonTitle: lesson.title,
        courseId: `course-${courseSlug}`,
        courseSlug,
        courseTitle,
        nextLessonSlug: next?.slug ?? null,
        chapterId: null,
        chapterTitle: null,
        settings: { passScorePct: 100, hintPenalty: 0 },
        stages: blueprint.stages.map((stage, stageIndex) => ({
          id: `${id}-stage-${stageIndex + 1}`,
          title: stage.title,
          description: stage.description ?? '',
          mission: stage.mission,
          sortOrder: stage.sortOrder,
          challengeType: stage.challengeType,
          challengeConfig: stage.challengeConfig,
          gradingConfig: stage.gradingConfig,
          hints: stage.hints ?? [],
          points: stage.points,
          timeLimitSec: stage.timeLimitSec ?? null,
        })),
      });
    }
  }
  return games;
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

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function stringsOf(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (value === undefined || value === null) return [];
  return [String(value)];
}

function normalizeText(value: string): string {
  return value.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim().toLowerCase();
}

function answerRecord(answer: unknown): JsonRecord {
  if (typeof answer === 'string' || typeof answer === 'number' || typeof answer === 'boolean') {
    return { value: String(answer) };
  }
  return asRecord(answer);
}

function codeOf(answer: unknown): string {
  const record = answerRecord(answer);
  const code = record.code ?? record.value ?? record.html ?? '';
  return typeof code === 'string' ? code : '';
}

function mapsEqual(expectedRaw: unknown, gotRaw: unknown): boolean {
  const expected = asRecord(expectedRaw);
  const got = asRecord(gotRaw);
  const keys = Object.keys(expected);
  if (!keys.length) return false;
  return keys.every((key) => String(got[key] ?? '') === String(expected[key] ?? ''));
}

function patternsPass(source: string, config: JsonRecord): boolean {
  const mustMatch = stringsOf(config.mustMatch);
  const mustNotMatch = stringsOf(config.mustNotMatch);
  for (const pattern of mustMatch) {
    try {
      if (!new RegExp(pattern, 'i').test(source)) return false;
    } catch {
      return false;
    }
  }
  for (const pattern of mustNotMatch) {
    try {
      if (new RegExp(pattern, 'i').test(source)) return false;
    } catch {
      return false;
    }
  }
  return mustMatch.length > 0 || mustNotMatch.length > 0;
}

function tagCount(html: string, tag: string): number {
  const re = new RegExp(`<${tag}\\b`, 'gi');
  return (html.match(re) ?? []).length;
}

function domChecksPass(html: string, checks: unknown): boolean {
  if (!Array.isArray(checks) || !checks.length) return false;
  for (const raw of checks) {
    const check = asRecord(raw);
    const tag = String(check.tag ?? '');
    if (!tag) return false;
    const min = Number(check.min ?? 1);
    if (tagCount(html, tag) < min) return false;
    const textIncludes = check.textIncludes;
    if (typeof textIncludes === 'string' && textIncludes) {
      const block = html.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
      if (!block?.[1]?.includes(textIncludes)) return false;
    }
  }
  return true;
}

function isStageCorrect(stage: DemoStage, answer: unknown): boolean {
  const config = asRecord(stage.gradingConfig);
  const strategy = String(config.strategy ?? stage.challengeType ?? '').toLowerCase();
  const submitted = answerRecord(answer);

  switch (strategy) {
    case 'mcq': {
      const expected = new Set(stringsOf(config.correctIds));
      const selected = new Set(stringsOf(submitted.selected));
      if (!expected.size) return false;
      if (selected.size !== expected.size) return false;
      for (const id of expected) if (!selected.has(id)) return false;
      return true;
    }
    case 'drag_drop':
      return mapsEqual(config.placements, submitted.placements);
    case 'matching':
      return mapsEqual(config.pairs, submitted.pairs);
    case 'output': {
      const expected = stringsOf(config.expected ?? config.value).map(normalizeText);
      return expected.includes(normalizeText(String(submitted.value ?? '')));
    }
    case 'exact': {
      if (Array.isArray(config.order)) {
        const expected = config.order.map((item) => String(item));
        const got = Array.isArray(submitted.order) ? submitted.order.map((item) => String(item)) : [];
        return expected.length === got.length && expected.every((item, index) => item === got[index]);
      }
      if (config.blanks && typeof config.blanks === 'object') {
        const expected = asRecord(config.blanks);
        const got = asRecord(submitted.blanks);
        const keys = Object.keys(expected);
        if (!keys.length) return false;
        return keys.every((key) => {
          const alts = stringsOf(expected[key]).map(normalizeText);
          return alts.includes(normalizeText(String(got[key] ?? '')));
        });
      }
      if (config.choices && typeof config.choices === 'object') {
        return mapsEqual(config.choices, submitted.choices);
      }
      const expectedValues = stringsOf(config.value ?? config.answer).map(normalizeText);
      return expectedValues.includes(normalizeText(String(submitted.value ?? '')));
    }
    case 'pattern':
      return patternsPass(codeOf(answer), config);
    case 'dom':
      return domChecksPass(codeOf(answer), config.checks);
    case 'html': {
      const html = codeOf(answer);
      const required = stringsOf(config.requiredTags);
      if (!required.length) return false;
      return required.every((tag) => tagCount(html, tag) >= 1);
    }
    case 'test_cases':
    case 'unit': {
      const source = codeOf(answer);
      const fns = stringsOf(config.mustDeclareFunctions);
      for (const name of fns) {
        const re = new RegExp(
          `(?:function\\s+${name}\\b|(?:const|let|var)\\s+${name}\\s*=|async\\s+function\\s+${name}\\b)`,
        );
        if (!re.test(source)) return false;
      }
      const mustMatch = stringsOf(config.mustMatch);
      const mustNotMatch = stringsOf(config.mustNotMatch);
      for (const pattern of mustMatch) {
        try {
          if (!new RegExp(pattern, 'i').test(source)) return false;
        } catch {
          return false;
        }
      }
      for (const pattern of mustNotMatch) {
        try {
          if (new RegExp(pattern, 'i').test(source)) return false;
        } catch {
          return false;
        }
      }
      return fns.length > 0 || mustMatch.length > 0;
    }
    default:
      return false;
  }
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
  const lesson =
    course?.lessons.find((item) => item.slug === lessonSlug) ??
    (courseSlug === 'interview-branding'
      ? { slug: lessonSlug, title: BRANDING_TITLES[lessonSlug] ?? lessonSlug }
      : undefined);
  const games = publishedGames().filter(
    (game) => game.courseSlug === courseSlug && game.lessonSlug === lessonSlug,
  );
  return {
    lessonId: `lesson-${courseSlug}-${lessonSlug}`,
    lessonSlug,
    lessonTitle: lesson?.title ?? '',
    courseSlug,
    courseTitle: courseTitleFor(courseSlug),
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
  const covered = new Set(publishedGames().map((game) => `${game.courseSlug}::${game.lessonSlug}`));
  const lessonsWithoutGames = STATIC_COURSE_LESSONS.filter(
    (entry) => !covered.has(`${entry.courseSlug}::${entry.lessonSlug}`),
  ).map((entry) => ({
    lessonId: `lesson-${entry.courseSlug}-${entry.lessonSlug}`,
    lessonTitle: entry.lessonSlug,
    courseTitle: courseTitleFor(entry.courseSlug),
    courseSlug: entry.courseSlug,
  }));
  return {
    total: DEMO_GAMES.length,
    published,
    drafts,
    archived,
    participants: 0,
    completions: 0,
    averageScore: 0,
    popular: publishedGames()
      .slice(0, 8)
      .map((game) => ({ id: game.id, title: game.title, participants: 0 })),
    lessonsWithoutGames,
  };
}

export function demoAdminGamesCatalog(): GameCatalogCourse[] {
  const courses: GameCatalogCourse[] = [];
  for (const game of publishedGames()) {
    let course = courses.find((item) => item.id === game.courseId);
    if (!course) {
      course = {
        id: game.courseId,
        title: game.courseTitle,
        slug: game.courseSlug,
        chapters: [],
        unassignedLessons: [],
      };
      courses.push(course);
    }
    if (!course.unassignedLessons.some((lesson) => lesson.slug === game.lessonSlug)) {
      course.unassignedLessons.push({
        id: game.lessonId,
        title: game.lessonTitle,
        slug: game.lessonSlug,
        sortOrder: course.unassignedLessons.length,
      });
    }
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
      gradingConfig: stage.gradingConfig,
      hints: stage.hints,
      points: stage.points,
      timeLimitSec: stage.timeLimitSec,
    })),
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  };
}
