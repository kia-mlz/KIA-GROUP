import type { EducationalGameType } from '../types/educational-game';
import { resolveTopic } from './topics';
import type { LessonGameBlueprint, LessonGameRef, LessonGameStageBlueprint, TopicPack } from './types';

const HTML_TYPES: EducationalGameType[] = [
  'QUIZ',
  'DRAG_DROP',
  'MATCHING',
  'FILL_BLANKS',
  'BUG_HUNTER',
  'WEBSITE_BUILDER',
  'CODE_BUILDER',
  'CODE_ADVENTURE',
  'SIMULATION',
  'FINAL_PROJECT',
];

const CSS_TYPES: EducationalGameType[] = [
  'MATCHING',
  'FILL_BLANKS',
  'BUG_HUNTER',
  'QUIZ',
  'DRAG_DROP',
  'CODE_BUILDER',
  'SIMULATION',
  'CODE_ADVENTURE',
  'WEBSITE_BUILDER',
  'FINAL_PROJECT',
];

const JS_TYPES: EducationalGameType[] = [
  'OUTPUT_PREDICTION',
  'CODE_BUILDER',
  'CODE_EDITOR',
  'QUIZ',
  'BUG_HUNTER',
  'FILL_BLANKS',
  'CODE_ADVENTURE',
  'MATCHING',
  'DRAG_DROP',
  'SIMULATION',
];

const BRANDING_TYPES: EducationalGameType[] = [
  'SIMULATION',
  'QUIZ',
  'MATCHING',
  'DRAG_DROP',
  'FILL_BLANKS',
  'CODE_ADVENTURE',
];

function typePool(courseSlug: string): EducationalGameType[] {
  if (courseSlug === 'css') return CSS_TYPES;
  if (courseSlug === 'javascript') return JS_TYPES;
  if (courseSlug === 'interview-branding') return BRANDING_TYPES;
  return HTML_TYPES;
}

export function pickCoverGameType(courseSlug: string, lessonIndex: number): EducationalGameType {
  const pool = typePool(courseSlug);
  return pool[lessonIndex % pool.length]!;
}

function stagePoints(type: EducationalGameType): number {
  if (type === 'FINAL_PROJECT' || type === 'WEBSITE_BUILDER') return 20;
  if (type === 'CODE_EDITOR' || type === 'CODE_ADVENTURE') return 12;
  return 10;
}

function quizStage(topic: TopicPack, sortOrder: number, points: number): LessonGameStageBlueprint {
  return {
    title: `شناخت ${topic.faLabel}`,
    mission: `گزینه درست درباره «${topic.faLabel}» را انتخاب کن.`,
    sortOrder,
    challengeType: 'mcq',
    points,
    hints: [`روی مفهوم «${topic.concept}» تمرکز کن.`, 'اگر شک داری، تعریف اصلی درس را مرور کن.'],
    challengeConfig: {
      ui: 'quiz',
      prompt: topic.quiz.prompt,
      options: topic.quiz.options,
    },
    gradingConfig: { strategy: 'mcq', correctIds: [topic.quiz.correctId] },
  };
}

function matchStage(topic: TopicPack, sortOrder: number, points: number): LessonGameStageBlueprint {
  return {
    title: `جفت‌سازی ${topic.faLabel}`,
    mission: 'هر مفهوم را به کاربرد درستش وصل کن.',
    sortOrder,
    challengeType: 'matching',
    points,
    hints: ['اول مفهوم‌های آشنا را وصل کن.', topic.concept],
    challengeConfig: {
      ui: 'match',
      left: topic.match.left,
      right: topic.match.right,
    },
    gradingConfig: { strategy: 'matching', pairs: topic.match.pairs },
  };
}

function dragStage(topic: TopicPack, sortOrder: number, points: number): LessonGameStageBlueprint {
  return {
    title: `چینش ${topic.faLabel}`,
    mission: 'هر قطعه را در جایگاه درست رها کن.',
    sortOrder,
    challengeType: 'drag_drop',
    points,
    hints: ['اول قطعه‌ها را بخوان، بعد جایگاه را انتخاب کن.'],
    challengeConfig: {
      ui: 'drag',
      items: topic.drag.items,
      slots: topic.drag.slots,
    },
    gradingConfig: { strategy: 'drag_drop', placements: topic.drag.placements },
  };
}

function blanksStage(topic: TopicPack, sortOrder: number, points: number): LessonGameStageBlueprint {
  return {
    title: `جای خالی ${topic.faLabel}`,
    mission: 'جای خالی را با مقدار درست پر کن.',
    sortOrder,
    challengeType: 'exact',
    points,
    hints: ['املای انگلیسی را دقیق بنویس.', 'فضای اضافه دو طرف را لازم نیست.'],
    challengeConfig: {
      ui: 'blanks',
      template: topic.blanks.template,
      blankIds: topic.blanks.blankIds,
    },
    gradingConfig: { strategy: 'exact', blanks: topic.blanks.answers },
  };
}

function bugStage(topic: TopicPack, sortOrder: number, points: number): LessonGameStageBlueprint {
  return {
    title: `شکار باگ ${topic.faLabel}`,
    mission: 'کد خراب را پیدا و اصلاح کن تا الگوهای لازم برقرار شوند.',
    sortOrder,
    challengeType: 'pattern',
    points,
    hints: ['تفاوت املایی کوچک را جدی بگیر.', topic.bug.prompt],
    challengeConfig: {
      ui: 'bug',
      language: topic.bug.language,
      prompt: topic.bug.prompt,
      buggyCode: topic.bug.buggyCode,
    },
    gradingConfig: {
      strategy: 'pattern',
      mustMatch: topic.bug.mustMatch,
      mustNotMatch: topic.bug.mustNotMatch,
    },
  };
}

function outputStage(topic: TopicPack, sortOrder: number, points: number): LessonGameStageBlueprint {
  return {
    title: `پیش‌بینی خروجی ${topic.faLabel}`,
    mission: 'قبل از اجرا، خروجی را دقیق حدس بزن.',
    sortOrder,
    challengeType: 'output',
    points,
    hints: ['کد را خط‌به‌خط بخوان.', 'به نوع مقدار دقت کن.'],
    challengeConfig: {
      ui: 'output',
      language: topic.output.language,
      code: topic.output.code,
    },
    gradingConfig: { strategy: 'output', expected: topic.output.expected },
  };
}

function blocksStage(topic: TopicPack, sortOrder: number, points: number): LessonGameStageBlueprint {
  return {
    title: `ساخت بلوکی ${topic.faLabel}`,
    mission: 'بلوک‌ها را به ترتیب درست بچین.',
    sortOrder,
    challengeType: 'exact',
    points,
    hints: ['از بالا به پایین همان ترتیب واقعی کد را بساز.'],
    challengeConfig: {
      ui: 'blocks',
      blocks: topic.blocks.blocks,
    },
    gradingConfig: { strategy: 'exact', order: topic.blocks.order },
  };
}

function codeStage(topic: TopicPack, sortOrder: number, points: number): LessonGameStageBlueprint {
  const language = topic.code.language === 'python' ? 'python' : 'javascript';
  return {
    title: `ویرایشگر ${topic.faLabel}`,
    mission: topic.code.prompt,
    sortOrder,
    challengeType: 'test_cases',
    points,
    hints: ['نام‌ها را دقیق بنویس.', 'الگوی لازم باید در کد دیده شود.'],
    challengeConfig: {
      ui: 'code',
      language,
      prompt: topic.code.prompt,
      starter: topic.code.starter,
    },
    gradingConfig: {
      strategy: 'test_cases',
      language,
      mustDeclareFunctions: topic.code.mustDeclareFunctions ?? [],
      mustMatch: topic.code.mustMatch,
      mustNotMatch: topic.code.mustNotMatch ?? [],
    },
  };
}

function websiteStage(topic: TopicPack, sortOrder: number, points: number): LessonGameStageBlueprint {
  return {
    title: `بساز: ${topic.faLabel}`,
    mission: topic.html.prompt,
    sortOrder,
    challengeType: 'dom',
    points,
    hints: ['برچسب‌های لازم را فراموش نکن.', 'اسکریپت لازم نیست مگر ماموریت بگوید.'],
    challengeConfig: {
      ui: 'website',
      language: 'html',
      prompt: topic.html.prompt,
      starter: topic.html.starter,
    },
    gradingConfig: { strategy: 'dom', checks: topic.html.checks },
  };
}

function simStage(topic: TopicPack, sortOrder: number, points: number): LessonGameStageBlueprint {
  return {
    title: `شبیه‌سازی ${topic.faLabel}`,
    mission: 'برای هر موقعیت، انتخاب حرفه‌ای‌تر را برگزین.',
    sortOrder,
    challengeType: 'exact',
    points,
    hints: [topic.concept, 'مسیر کوتاه و شفاف معمولاً بهتر است.'],
    challengeConfig: {
      ui: 'sim',
      steps: topic.sim.steps,
    },
    gradingConfig: { strategy: 'exact', choices: topic.sim.choices },
  };
}

function stagesForType(type: EducationalGameType, topic: TopicPack): LessonGameStageBlueprint[] {
  const p = stagePoints(type);
  switch (type) {
    case 'QUIZ':
      return [quizStage(topic, 0, p)];
    case 'MATCHING':
      return [matchStage(topic, 0, p)];
    case 'DRAG_DROP':
      return [dragStage(topic, 0, p)];
    case 'FILL_BLANKS':
      return [blanksStage(topic, 0, p)];
    case 'BUG_HUNTER':
      return [bugStage(topic, 0, p)];
    case 'OUTPUT_PREDICTION':
      return [outputStage(topic, 0, p)];
    case 'CODE_BUILDER':
      return [blocksStage(topic, 0, p)];
    case 'CODE_EDITOR':
      return [codeStage(topic, 0, p)];
    case 'WEBSITE_BUILDER':
      return [websiteStage(topic, 0, p)];
    case 'FINAL_PROJECT':
      return [
        quizStage(topic, 0, 8),
        websiteStage(topic, 1, 20),
      ];
    case 'SIMULATION':
      return [simStage(topic, 0, p)];
    case 'CODE_ADVENTURE':
      return [
        quizStage(topic, 0, 8),
        typePoolIncludesOutput(topic) ? outputStage(topic, 1, 8) : blanksStage(topic, 1, 8),
        matchStage(topic, 2, 10),
      ];
    default:
      return [quizStage(topic, 0, p)];
  }
}

function typePoolIncludesOutput(topic: TopicPack): boolean {
  return topic.output.language === 'javascript' || topic.key.startsWith('js-');
}

function titleFor(type: EducationalGameType, topic: TopicPack): string {
  switch (type) {
    case 'QUIZ':
      return `چالش سریع: ${topic.faLabel}`;
    case 'MATCHING':
      return `جفت کن: ${topic.faLabel}`;
    case 'DRAG_DROP':
      return `بچین و بساز: ${topic.faLabel}`;
    case 'FILL_BLANKS':
      return `جای خالی ${topic.faLabel}`;
    case 'BUG_HUNTER':
      return `شکار باگ در ${topic.faLabel}`;
    case 'OUTPUT_PREDICTION':
      return `خروجی را بخوان: ${topic.faLabel}`;
    case 'CODE_BUILDER':
      return `بلوک‌های ${topic.faLabel}`;
    case 'CODE_EDITOR':
      return `کد بنویس: ${topic.faLabel}`;
    case 'WEBSITE_BUILDER':
      return `صفحه کوچک ${topic.faLabel}`;
    case 'FINAL_PROJECT':
      return `پروژه کوتاه ${topic.faLabel}`;
    case 'SIMULATION':
      return `موقعیت واقعی: ${topic.faLabel}`;
    case 'CODE_ADVENTURE':
      return `ماجرای ${topic.faLabel}`;
    default:
      return `ماموریت ${topic.faLabel}`;
  }
}

function descriptionFor(type: EducationalGameType, topic: TopicPack): string {
  return `یک ماموریت سرگرم‌کننده برای تثبیت «${topic.concept}» با قالب ${type.replaceAll('_', ' ').toLowerCase()}.`;
}

/**
 * One published cover game for a lesson. Slug is always `cover` so seed can
 * upsert without colliding with admin-created games that use other slugs.
 */
export function buildCoverGameForLesson(ref: LessonGameRef): LessonGameBlueprint {
  const topic = resolveTopic(ref.courseSlug, ref.lessonSlug, ref.lessonTitle);
  const type = pickCoverGameType(ref.courseSlug, ref.lessonIndex);
  const stages = stagesForType(type, topic);
  const stageSum = stages.reduce((sum, stage) => sum + stage.points, 0);
  const difficulty =
    type === 'FINAL_PROJECT' || type === 'CODE_EDITOR' || ref.lessonIndex > 40
      ? 'INTERMEDIATE'
      : ref.lessonIndex > 90
        ? 'ADVANCED'
        : 'BEGINNER';
  return {
    slug: 'cover',
    title: titleFor(type, topic),
    description: descriptionFor(type, topic),
    learningGoal: topic.concept,
    type,
    difficulty,
    estimatedMin: Math.min(20, 5 + stages.length * 3),
    points: Math.max(20, stageSum + 10),
    publishStatus: 'PUBLISHED',
    required: false,
    stages,
  };
}

export function buildCoverGamesForCourse(input: {
  courseSlug: string;
  lessons: Array<{ slug: string; title: string }>;
}): LessonGameBlueprint[] {
  return input.lessons.map((lesson, lessonIndex) =>
    buildCoverGameForLesson({
      courseSlug: input.courseSlug,
      lessonSlug: lesson.slug,
      lessonTitle: lesson.title,
      lessonIndex,
    }),
  );
}
