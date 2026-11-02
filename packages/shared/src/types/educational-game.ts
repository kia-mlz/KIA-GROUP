export const EDUCATIONAL_GAME_TYPES = [
  'CODE_BUILDER',
  'CODE_EDITOR',
  'BUG_HUNTER',
  'DRAG_DROP',
  'QUIZ',
  'WEBSITE_BUILDER',
  'CODE_ADVENTURE',
  'MATCHING',
  'FILL_BLANKS',
  'OUTPUT_PREDICTION',
  'SIMULATION',
  'FINAL_PROJECT',
] as const;

export type EducationalGameType = (typeof EDUCATIONAL_GAME_TYPES)[number];

export const GAME_DIFFICULTIES = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const;
export type GameDifficulty = (typeof GAME_DIFFICULTIES)[number];

export const GAME_PUBLISH_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
export type GamePublishStatus = (typeof GAME_PUBLISH_STATUSES)[number];

export const USER_GAME_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'] as const;
export type UserGameStatus = (typeof USER_GAME_STATUSES)[number];

/** Backend grading strategies. New strategies register beside these. */
export const GRADING_STRATEGIES = [
  'exact',
  'mcq',
  'pattern',
  'html',
  'dom',
  'output',
  'unit',
  'test_cases',
  'drag_drop',
  'matching',
  'manual',
] as const;

export type GradingStrategy = (typeof GRADING_STRATEGIES)[number];

export type JsonRecord = Record<string, unknown>;

export interface LearnerGameProgress {
  status: UserGameStatus;
  currentStageId: string | null;
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
}

export interface LearnerGameStage {
  id: string;
  title: string;
  description: string;
  mission: string;
  sortOrder: number;
  challengeType: string;
  challengeConfig: JsonRecord;
  hintsAvailable: number;
  hintsRevealed: number;
  points: number;
  timeLimitSec: number | null;
}

export interface LearnerEducationalGame {
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
  stageCount: number;
  locked: boolean;
  lockReason: string | null;
  lessonId: string;
  lessonSlug: string;
  lessonTitle: string;
  courseSlug: string;
  courseTitle: string;
  nextLessonSlug: string | null;
  progress: LearnerGameProgress;
  stages?: LearnerGameStage[];
}

export interface LessonGamesResponse {
  lessonId: string;
  lessonSlug: string;
  lessonTitle: string;
  courseSlug: string;
  courseTitle: string;
  games: LearnerEducationalGame[];
}

export interface CourseGameListItem {
  id: string;
  title: string;
  type: EducationalGameType;
  difficulty: GameDifficulty;
  estimatedMin: number;
  points: number;
  required: boolean;
  status: UserGameStatus | 'LOCKED';
  locked: boolean;
  lessonSlug: string;
  lessonTitle: string;
}

export interface CourseGamesSummary {
  gameCount: number;
  completed: number;
  remaining: number;
  progressPct: number;
  xpEarned: number;
  level: number;
  streakDays: number;
  games: CourseGameListItem[];
}

export interface GameSubmitResult {
  attemptId: string;
  passed: boolean;
  code: 'correct' | 'incorrect' | 'partial' | 'pending' | 'invalid';
  feedback: string;
  score: number;
  stageCompleted: boolean;
  gameCompleted: boolean;
  xpAwarded: number;
  achievements: Array<{ key: string; title: string }>;
  progress: LearnerGameProgress;
  result: GameCompletionSummary | null;
}

export interface GameCompletionSummary {
  score: number;
  bestScore: number;
  timeSpentSec: number;
  attempts: number;
  stagesCompleted: number;
  stageCount: number;
  accuracy: number;
  badges: Array<{ key: string; title: string; description: string }>;
}

export interface GameHintResult {
  hint: string;
  index: number;
  hintsAvailable: number;
  hintsRevealed: number;
}

export interface LearnerGameStatsView {
  xp: number;
  level: number;
  streakDays: number;
  gamesCompleted: number;
  achievements: Array<{ key: string; title: string; description: string; earnedAt: string }>;
}

export interface GameLeaderboardEntry {
  rank: number;
  name: string;
  xp: number;
  level: number;
  gamesCompleted: number;
}

export interface AdminGameStageInput {
  id?: string;
  title: string;
  description?: string;
  mission?: string;
  sortOrder?: number;
  challengeType: string;
  challengeConfig: JsonRecord;
  gradingConfig: JsonRecord;
  hints?: string[];
  points?: number;
  timeLimitSec?: number | null;
}

export interface AdminEducationalGameInput {
  lessonId: string;
  slug?: string;
  title: string;
  description?: string;
  learningGoal?: string;
  type: EducationalGameType;
  difficulty?: GameDifficulty;
  estimatedMin?: number;
  points?: number;
  required?: boolean;
  prerequisiteGameId?: string | null;
  settings?: JsonRecord;
  publishStatus?: GamePublishStatus;
  stages?: AdminGameStageInput[];
}

export interface AdminGameStage extends AdminGameStageInput {
  id: string;
  sortOrder: number;
  points: number;
}

export interface AdminEducationalGame {
  id: string;
  lessonId: string;
  lessonTitle: string;
  lessonSlug: string;
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  chapterId: string | null;
  chapterTitle: string | null;
  slug: string;
  title: string;
  description: string;
  learningGoal: string;
  type: EducationalGameType;
  difficulty: GameDifficulty;
  estimatedMin: number;
  points: number;
  publishStatus: GamePublishStatus;
  sortOrder: number;
  required: boolean;
  prerequisiteGameId: string | null;
  settings: JsonRecord;
  stages: AdminGameStage[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminGamesDashboard {
  total: number;
  published: number;
  drafts: number;
  archived: number;
  participants: number;
  completions: number;
  averageScore: number;
  popular: Array<{ id: string; title: string; participants: number }>;
  lessonsWithoutGames: Array<{
    lessonId: string;
    lessonTitle: string;
    courseTitle: string;
    courseSlug: string;
  }>;
}

export interface AdminGameResults {
  gameId: string;
  title: string;
  participants: number;
  completed: number;
  inProgress: number;
  attempts: number;
  averageScore: number;
  averageTimeSec: number;
  hardStages: Array<{ stageId: string; title: string; failRate: number; attempts: number }>;
  commonWrong: Array<{ stageId: string; stageTitle: string; preview: string; count: number }>;
}

export interface GameCatalogLesson {
  id: string;
  title: string;
  slug: string;
  sortOrder: number;
}

export interface GameCatalogChapter {
  id: string;
  title: string;
  sortOrder: number;
  lessons: GameCatalogLesson[];
}

export interface GameCatalogCourse {
  id: string;
  title: string;
  slug: string;
  chapters: GameCatalogChapter[];
  unassignedLessons: GameCatalogLesson[];
}

export interface GamePlaySession {
  game: LearnerEducationalGame;
  alreadyCompleted: boolean;
}
