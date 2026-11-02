import type { AdminGameStage, EducationalGameType, JsonRecord } from '@kia./shared';

export type Choice = { id: string; text: string; correct: boolean };
export type Pair = { left: string; right: string };
export type Slot = { id: string; label: string; itemId: string };
export type Block = { id: string; code: string };
export type Step = { id: string; prompt: string; choices: Choice[] };

export type StageDraft = {
  id?: string;
  title: string;
  mission: string;
  points: number;
  timeLimit: string;
  hints: string;
  prompt: string;
  language: string;
  code: string;
  expected: string;
  template: string;
  functions: string;
  mustMatch: string;
  mustNotMatch: string;
  tags: string;
  options: Choice[];
  blocks: Block[];
  items: Choice[];
  slots: Slot[];
  pairs: Pair[];
  steps: Step[];
};

const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 7)}`;

export function emptyStage(type: EducationalGameType): StageDraft {
  return {
    title: 'مرحله ۱',
    mission: '',
    points: 10,
    timeLimit: '',
    hints: '',
    prompt: '',
    language: type === 'CODE_EDITOR' ? 'javascript' : 'html',
    code: '',
    expected: '',
    template: '',
    functions: '',
    mustMatch: '',
    mustNotMatch: '',
    tags: 'h1,p',
    options: [
      { id: uid('o'), text: '', correct: true },
      { id: uid('o'), text: '', correct: false },
    ],
    blocks: [
      { id: uid('b'), code: '' },
      { id: uid('b'), code: '' },
    ],
    items: [{ id: uid('i'), text: '', correct: false }],
    slots: [{ id: uid('s'), label: '', itemId: '' }],
    pairs: [{ left: '', right: '' }],
    steps: [{ id: uid('st'), prompt: '', choices: [{ id: uid('c'), text: '', correct: true }] }],
  };
}

function lines(value: string) {
  return value.split('\n').map((line) => line.trim()).filter(Boolean);
}

export function compileStage(type: EducationalGameType, draft: StageDraft, index: number) {
  const hints = lines(draft.hints);
  const base = {
    id: draft.id,
    title: draft.title || `مرحله ${index + 1}`,
    mission: draft.mission,
    points: draft.points,
    timeLimitSec: draft.timeLimit ? Number(draft.timeLimit) : null,
    hints,
    sortOrder: index,
  };
  const ui = uiOf(type);
  if (type === 'QUIZ' || ui === 'quiz') {
    return {
      ...base,
      challengeType: 'mcq',
      challengeConfig: {
        ui: 'quiz',
        prompt: draft.prompt || draft.mission,
        options: draft.options.map((option) => ({ id: option.id, text: option.text })),
      },
      gradingConfig: { strategy: 'mcq', correctIds: draft.options.filter((option) => option.correct).map((option) => option.id) },
    };
  }
  if (type === 'DRAG_DROP') {
    return {
      ...base,
      challengeType: 'drag_drop',
      challengeConfig: {
        ui: 'drag',
        items: draft.items.map((item) => ({ id: item.id, label: item.text })),
        slots: draft.slots.map((slot) => ({ id: slot.id, label: slot.label })),
      },
      gradingConfig: {
        strategy: 'drag_drop',
        placements: Object.fromEntries(draft.slots.filter((slot) => slot.itemId).map((slot) => [slot.id, slot.itemId])),
      },
    };
  }
  if (type === 'MATCHING') {
    const left = draft.pairs.map((pair, pairIndex) => ({ id: `l${pairIndex}`, label: pair.left }));
    const right = draft.pairs.map((pair, pairIndex) => ({ id: `r${pairIndex}`, label: pair.right }));
    return {
      ...base,
      challengeType: 'matching',
      challengeConfig: { ui: 'match', left, right },
      gradingConfig: { strategy: 'matching', pairs: Object.fromEntries(left.map((item, pairIndex) => [item.id, right[pairIndex].id])) },
    };
  }
  if (type === 'FILL_BLANKS') {
    const ids = draft.template.split('___').slice(0, -1).map((_, blankIndex) => `b${blankIndex}`);
    const answers = Object.fromEntries(ids.map((id, blankIndex) => [id, lines(draft.expected)[blankIndex] ?? '']));
    return {
      ...base,
      challengeType: 'exact',
      challengeConfig: { ui: 'blanks', template: draft.template, blankIds: ids },
      gradingConfig: { strategy: 'exact', blanks: answers },
    };
  }
  if (type === 'OUTPUT_PREDICTION') {
    return {
      ...base,
      challengeType: 'output',
      challengeConfig: { ui: 'output', code: draft.code, language: draft.language },
      gradingConfig: { strategy: 'output', expected: draft.expected },
    };
  }
  if (type === 'CODE_BUILDER') {
    return {
      ...base,
      challengeType: 'exact',
      challengeConfig: { ui: 'blocks', blocks: draft.blocks.map((block) => ({ id: block.id, code: block.code })) },
      gradingConfig: { strategy: 'exact', order: draft.blocks.map((block) => block.id) },
    };
  }
  if (type === 'SIMULATION') {
    return {
      ...base,
      challengeType: 'exact',
      challengeConfig: {
        ui: 'sim',
        steps: draft.steps.map((step) => ({
          id: step.id,
          prompt: step.prompt,
          choices: step.choices.map((choice) => ({ id: choice.id, label: choice.text })),
        })),
      },
      gradingConfig: {
        strategy: 'exact',
        choices: Object.fromEntries(
          draft.steps.map((step) => [step.id, step.choices.find((choice) => choice.correct)?.id ?? '']),
        ),
      },
    };
  }
  if (type === 'BUG_HUNTER') {
    return {
      ...base,
      challengeType: 'pattern',
      challengeConfig: { ui: 'bug', language: draft.language, buggyCode: draft.code, prompt: draft.prompt },
      gradingConfig: { strategy: 'pattern', mustMatch: lines(draft.mustMatch), mustNotMatch: lines(draft.mustNotMatch) },
    };
  }
  if (type === 'CODE_EDITOR' || type === 'CODE_ADVENTURE') {
    return {
      ...base,
      challengeType: 'test_cases',
      challengeConfig: { ui: 'code', language: draft.language, starter: draft.code, prompt: draft.prompt },
      gradingConfig: {
        strategy: 'test_cases',
        language: draft.language,
        mustDeclareFunctions: lines(draft.functions),
        mustMatch: lines(draft.mustMatch),
        mustNotMatch: lines(draft.mustNotMatch),
      },
    };
  }
  const tags = lines(draft.tags.replace(/,/g, '\n'));
  return {
    ...base,
    challengeType: 'dom',
    challengeConfig: { ui: 'website', language: 'html', starter: draft.code, prompt: draft.prompt },
    gradingConfig: {
      strategy: 'dom',
      checks: tags.map((tag) => ({ tag, min: 1 })),
    },
  };
}

function uiOf(type: EducationalGameType) {
  if (type === 'QUIZ') return 'quiz';
  return type;
}

export function hydrateStage(stage: AdminGameStage): StageDraft {
  const config = (stage.challengeConfig ?? {}) as JsonRecord;
  const grading = (stage.gradingConfig ?? {}) as JsonRecord;
  const draft = emptyStage('QUIZ');
  draft.id = stage.id;
  draft.title = stage.title;
  draft.mission = stage.mission ?? '';
  draft.points = stage.points;
  draft.timeLimit = stage.timeLimitSec ? String(stage.timeLimitSec) : '';
  draft.hints = (stage.hints ?? []).join('\n');
  draft.prompt = String(config.prompt ?? '');
  draft.language = String(config.language ?? 'html');
  draft.code = String(config.code ?? config.starter ?? config.buggyCode ?? '');
  draft.template = String(config.template ?? '');
  draft.expected = String(grading.expected ?? '');
  const options = Array.isArray(config.options) ? (config.options as Array<{ id: string; text: string }>) : [];
  const correct = new Set(Array.isArray(grading.correctIds) ? (grading.correctIds as string[]) : []);
  if (options.length) {
    draft.options = options.map((option) => ({ id: option.id, text: option.text, correct: correct.has(option.id) }));
  }
  return draft;
}
