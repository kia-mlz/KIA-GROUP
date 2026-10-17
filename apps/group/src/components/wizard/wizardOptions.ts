import type { AssessmentAnswers, Goal, Interest, LearningStyle, SkillLevel } from '@kia./shared';

export const SKILL_TOPIC_KEYS = [
  ['HTML/CSS', 'htmlCss'],
  ['JavaScript', 'javascript'],
  ['Python', 'python'],
] as const;

export const SKILL_LEVELS: SkillLevel[] = ['Never used', 'Beginner', 'Comfortable'];
export const HOURS_MIN = 3;
export const HOURS_MAX = 40;

/** Value key + icon only — display labels come from t() in stage components. */
export const GOAL_OPTIONS = [
  ['job', '💼'],
  ['startup', '🚀'],
  ['freelance', '🧭'],
  ['fun', '🎨'],
] as const satisfies ReadonlyArray<readonly [Goal, string]>;

export const INTEREST_OPTIONS = [
  ['web', '🌐'],
  ['ai', '🤖'],
  ['mobile', '📱'],
  ['game', '🎮'],
  ['data', '📊'],
  ['backend', '🛠️'],
] as const satisfies ReadonlyArray<readonly [Interest, string]>;

export const STYLE_OPTIONS = [
  ['video', '🎬'],
  ['reading', '📖'],
  ['building', '🧩'],
] as const satisfies ReadonlyArray<readonly [LearningStyle, string]>;

export function isWizardStageValid(
  stageIndex: number,
  answers: {
    goal: Goal | null;
    skills: Record<string, SkillLevel>;
    interests: Interest[];
    style: LearningStyle | null;
  },
  stageId?: string,
): boolean {
  const id = stageId ?? ['goal', 'skill', 'personality', 'interest', 'learningStyle', 'time'][stageIndex];
  if (id === 'goal') return !!answers.goal;
  if (id === 'skill') return Object.keys(answers.skills).length >= 3;
  if (id === 'interest') return answers.interests.length >= 1;
  if (id === 'learningStyle') return !!answers.style;
  return true;
}

export function isWizardAnswersValid(answers: AssessmentAnswers): boolean {
  return (
    !!answers.goal &&
    Object.keys(answers.skills).length >= 3 &&
    answers.interests.length >= 1 &&
    !!answers.style
  );
}
