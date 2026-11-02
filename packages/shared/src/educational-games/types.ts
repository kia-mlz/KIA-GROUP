import type { EducationalGameType, GameDifficulty, GamePublishStatus } from '../types/educational-game';

export type LessonGameStageBlueprint = {
  title: string;
  description?: string;
  mission: string;
  sortOrder: number;
  challengeType: string;
  challengeConfig: Record<string, unknown>;
  gradingConfig: Record<string, unknown>;
  hints?: string[];
  points: number;
  timeLimitSec?: number | null;
};

export type LessonGameBlueprint = {
  /** Stable per-lesson slug used for idempotent seed upserts (`cover`). */
  slug: string;
  title: string;
  description: string;
  learningGoal: string;
  type: EducationalGameType;
  difficulty: GameDifficulty;
  estimatedMin: number;
  points: number;
  publishStatus: GamePublishStatus;
  required: boolean;
  stages: LessonGameStageBlueprint[];
};

export type LessonGameRef = {
  courseSlug: string;
  lessonSlug: string;
  lessonTitle: string;
  /** Zero-based index inside the course (drives type rotation). */
  lessonIndex: number;
};

export type TopicPack = {
  key: string;
  faLabel: string;
  concept: string;
  /** Short English/Latin token shown in code samples when useful. */
  token: string;
  quiz: {
    prompt: string;
    options: Array<{ id: string; text: string }>;
    correctId: string;
  };
  match: {
    left: Array<{ id: string; label: string }>;
    right: Array<{ id: string; label: string }>;
    pairs: Record<string, string>;
  };
  drag: {
    items: Array<{ id: string; label: string }>;
    slots: Array<{ id: string; label: string }>;
    placements: Record<string, string>;
  };
  blanks: {
    template: string;
    blankIds: string[];
    answers: Record<string, string[]>;
  };
  bug: {
    language: 'html' | 'css' | 'javascript';
    buggyCode: string;
    mustMatch: string[];
    mustNotMatch: string[];
    prompt: string;
  };
  output: {
    language: 'javascript' | 'css' | 'html';
    code: string;
    expected: string[];
  };
  blocks: {
    blocks: Array<{ id: string; code: string }>;
    order: string[];
  };
  code: {
    language: 'javascript' | 'python' | 'html' | 'css';
    prompt: string;
    starter: string;
    mustDeclareFunctions?: string[];
    mustMatch: string[];
    mustNotMatch?: string[];
  };
  html: {
    prompt: string;
    starter: string;
    checks: Array<Record<string, unknown>>;
  };
  sim: {
    steps: Array<{
      id: string;
      prompt: string;
      choices: Array<{ id: string; label: string }>;
    }>;
    choices: Record<string, string>;
  };
};
