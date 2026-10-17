import type { AssessmentAnswers, ReadinessScores, RoadmapResponse } from '@kia./shared';

export interface CourseItem {
  id: string;
  icon: string;
  name: string;
  status: string;
  isNew?: boolean;
}

export interface ModalState {
  icon: string;
  title: string;
  body: string;
  confetti?: boolean;
  onClose?: () => void;
}

export interface PersistedAppState {
  hasRoadmap: boolean;
  answers: AssessmentAnswers;
  stageIndex: number;
  roadmap: RoadmapResponse | null;
  readinessScores: ReadinessScores;
  testCompleted: boolean;
  interviewUnlocked: boolean;
  courses: CourseItem[];
  readinessModuleIndex: number;
}

const STORAGE_KEY = 'kia-academy-app-state';

export const defaultAnswers: AssessmentAnswers = {
  goal: null,
  skills: {},
  personality: { teamwork: 50, pace: 50 },
  interests: [],
  style: null,
  hours: 10,
};

export const defaultCourses: CourseItem[] = [
  {
    id: 'roadmap',
    icon: '🌐',
    name: 'Front-End Development Roadmap',
    status: 'In progress',
  },
];

export function getDefaultState(): PersistedAppState {
  return {
    hasRoadmap: false,
    answers: defaultAnswers,
    stageIndex: 0,
    roadmap: null,
    readinessScores: {},
    testCompleted: false,
    interviewUnlocked: false,
    courses: defaultCourses,
    readinessModuleIndex: 0,
  };
}

export function loadAppState(): PersistedAppState {
  if (typeof window === 'undefined') return getDefaultState();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultState();
    const parsed = JSON.parse(raw) as Partial<PersistedAppState>;
    return {
      ...getDefaultState(),
      ...parsed,
      answers: { ...defaultAnswers, ...parsed.answers },
    };
  } catch {
    return getDefaultState();
  }
}

export function saveAppState(state: PersistedAppState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota errors */
  }
}
