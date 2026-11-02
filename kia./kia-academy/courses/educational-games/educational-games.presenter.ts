import type {
  EducationalGameType,
  GameDifficulty,
  JsonRecord,
  LearnerEducationalGame,
  LearnerGameProgress,
  LearnerGameStage,
  UserGameStatus,
} from '@kia./shared';

const SECRET_KEYS = new Set([
  'answer',
  'answers',
  'correct',
  'correctIds',
  'expected',
  'expectedOutput',
  'order',
  'pairs',
  'placements',
  'grading',
  'gradingConfig',
  'strategy',
  'mustMatch',
  'mustNotMatch',
  'mustDeclareFunctions',
  'mustCall',
  'forbid',
  'testCases',
  'cases',
  'checks',
  'blanks',
  'isCorrect',
]);

export function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {};
}

export function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function asHints(value: unknown): string[] {
  return asStringArray(value);
}

/** Drop answer keys from anything that might be sent to a learner. */
export function sanitizeChallenge(value: unknown): JsonRecord {
  const cleaned = sanitizeNode(value);
  return asRecord(cleaned);
}

function sanitizeNode(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => sanitizeNode(item));
  if (!value || typeof value !== 'object') return value;
  const out: JsonRecord = {};
  for (const [key, child] of Object.entries(value as JsonRecord)) {
    if (SECRET_KEYS.has(key)) continue;
    out[key] = sanitizeNode(child);
  }
  return out;
}

export function passScorePct(settings: unknown): number {
  const raw = Number(asRecord(settings).passScorePct);
  if (!Number.isFinite(raw)) return 100;
  return Math.min(100, Math.max(1, Math.round(raw)));
}

export function hintPenalty(settings: unknown): number {
  const raw = Number(asRecord(settings).hintPenalty);
  if (!Number.isFinite(raw) || raw < 0) return 0;
  return Math.min(1000, Math.round(raw));
}

export type ProgressRow = {
  status: UserGameStatus;
  currentStageOrder: number;
  completedStageIds: unknown;
  score: number;
  bestScore: number;
  attemptsCount: number;
  correctCount: number;
  gradedCount: number;
  timeSpentSec: number;
  everCompleted: boolean;
  hintsByStage: unknown;
  startedAt: Date | null;
  completedAt: Date | null;
};

export function emptyProgress(): LearnerGameProgress {
  return {
    status: 'NOT_STARTED',
    currentStageId: null,
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
  };
}

export function toProgress(row: ProgressRow | null, currentStageId: string | null): LearnerGameProgress {
  if (!row) return { ...emptyProgress(), currentStageId };
  return {
    status: row.status,
    currentStageId,
    completedStageIds: asStringArray(row.completedStageIds),
    score: row.score,
    bestScore: row.bestScore,
    attemptsCount: row.attemptsCount,
    correctCount: row.correctCount,
    gradedCount: row.gradedCount,
    timeSpentSec: row.timeSpentSec,
    everCompleted: row.everCompleted,
    startedAt: row.startedAt ? row.startedAt.toISOString() : null,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
  };
}

export type StageRow = {
  id: string;
  title: string;
  description: string;
  mission: string;
  sortOrder: number;
  challengeType: string;
  challengeConfig: unknown;
  hints: unknown;
  points: number;
  timeLimitSec: number | null;
};

export function toLearnerStage(stage: StageRow, hintsRevealed = 0): LearnerGameStage {
  return {
    id: stage.id,
    title: stage.title,
    description: stage.description,
    mission: stage.mission,
    sortOrder: stage.sortOrder,
    challengeType: stage.challengeType,
    challengeConfig: sanitizeChallenge(stage.challengeConfig),
    hintsAvailable: asHints(stage.hints).length,
    hintsRevealed,
    points: stage.points,
    timeLimitSec: stage.timeLimitSec,
  };
}

export type GameRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  learningGoal: string;
  type: EducationalGameType;
  difficulty: GameDifficulty;
  estimatedMin: number;
  points: number;
  required: boolean;
  sortOrder: number;
  lessonId: string;
  stages: StageRow[];
};

export function toLearnerGame(input: {
  game: GameRow;
  lesson: { slug: string; title: string };
  course: { slug: string; title: string };
  nextLessonSlug: string | null;
  progress: ProgressRow | null;
  locked: boolean;
  lockReason: string | null;
  includeStages: boolean;
}): LearnerEducationalGame {
  const completed = new Set(asStringArray(input.progress?.completedStageIds));
  const ordered = [...input.game.stages].sort((a, b) => a.sortOrder - b.sortOrder);
  const current = ordered.find((stage) => !completed.has(stage.id)) ?? null;
  const hintsByStage = asRecord(input.progress?.hintsByStage);
  const payload: LearnerEducationalGame = {
    id: input.game.id,
    slug: input.game.slug,
    title: input.game.title,
    description: input.game.description,
    learningGoal: input.game.learningGoal,
    type: input.game.type,
    difficulty: input.game.difficulty,
    estimatedMin: input.game.estimatedMin,
    points: input.game.points,
    required: input.game.required,
    sortOrder: input.game.sortOrder,
    stageCount: ordered.length,
    locked: input.locked,
    lockReason: input.lockReason,
    lessonId: input.game.lessonId,
    lessonSlug: input.lesson.slug,
    lessonTitle: input.lesson.title,
    courseSlug: input.course.slug,
    courseTitle: input.course.title,
    nextLessonSlug: input.nextLessonSlug,
    progress: toProgress(input.progress, current?.id ?? null),
  };
  if (input.includeStages) {
    payload.stages = ordered.map((stage) =>
      toLearnerStage(stage, Number(hintsByStage[stage.id] ?? 0) || 0),
    );
  }
  return payload;
}
