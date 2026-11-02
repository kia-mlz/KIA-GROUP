import type { PrismaClient } from '@kia./platform';
import { buildCoverGameForLesson, type LessonGameBlueprint } from '@kia./shared';

type StageInput = LessonGameBlueprint['stages'][number];

type GameInput = Omit<LessonGameBlueprint, 'difficulty' | 'estimatedMin' | 'required'> & {
  difficulty?: LessonGameBlueprint['difficulty'];
  estimatedMin?: number;
  required?: boolean;
};

/**
 * Idempotent educational games on existing lessons.
 * - Achievements upsert by key.
 * - Per-lesson `cover` games upsert (stages replaced) so re-seed refreshes content.
 * - Optional showcase extras use skip-if-exists so admin edits stay untouched.
 */
export async function seedEducationalGames(prisma: PrismaClient) {
  const achievements = [
    {
      key: 'first-game',
      title: 'اولین بازی',
      description: 'یک بازی آموزشی را کامل کردی.',
      xp: 10,
      rule: { kind: 'GAMES_COMPLETED', threshold: 1 },
    },
    {
      key: 'five-games',
      title: 'پنج بازی',
      description: 'پنج بازی آموزشی را تمام کردی.',
      xp: 25,
      rule: { kind: 'GAMES_COMPLETED', threshold: 5 },
    },
    {
      key: 'xp-100',
      title: 'صد تجربه',
      description: 'مجموع تجربه‌ات به ۱۰۰ رسید.',
      xp: 15,
      rule: { kind: 'XP_REACHED', threshold: 100 },
    },
    {
      key: 'streak-3',
      title: 'سه روز پیاپی',
      description: 'سه روز پشت سر هم یک مرحله را درست حل کردی.',
      xp: 20,
      rule: { kind: 'STREAK', threshold: 3 },
    },
  ];
  for (const item of achievements) {
    await prisma.achievement.upsert({
      where: { key: item.key },
      update: { title: item.title, description: item.description, xp: item.xp, rule: item.rule },
      create: { ...item, icon: 'award' },
    });
  }

  const courses = await prisma.course.findMany({
    where: { published: true },
    include: { lessons: { orderBy: { sortOrder: 'asc' } } },
    orderBy: { sortOrder: 'asc' },
  });

  let coverUpserts = 0;
  let lessonsCovered = 0;
  for (const course of courses) {
    if (!course.lessons.length) continue;
    await ensureChapter(prisma, course.id, course.lessons);
    for (const [lessonIndex, lesson] of course.lessons.entries()) {
      const cover = buildCoverGameForLesson({
        courseSlug: course.slug,
        lessonSlug: lesson.slug,
        lessonTitle: lesson.title,
        lessonIndex,
      });
      await upsertCoverGame(prisma, lesson.id, cover);
      coverUpserts += 1;
      lessonsCovered += 1;
    }
  }

  // Showcase extras on the first topical lessons (skip if already present).
  const html = courses.find((course) => course.slug === 'html');
  const css = courses.find((course) => course.slug === 'css');
  const javascript = courses.find((course) => course.slug === 'javascript');
  const branding = courses.find((course) => course.slug === 'interview-branding');

  if (html) {
    const headingsIdx = html.lessons.findIndex((lesson) => /heading/i.test(lesson.slug));
    await attachExtras(prisma, html, headingsIdx >= 0 ? headingsIdx : 0, htmlShowcaseGames());
    const second = html.lessons[1];
    if (second) await attachExtras(prisma, html, 1, [draftQuiz()]);
  }
  if (css) await attachExtras(prisma, css, 0, cssShowcaseGames());
  if (javascript) await attachExtras(prisma, javascript, 0, javascriptShowcaseGames());
  if (branding) await attachExtras(prisma, branding, 0, brandingShowcaseGames());

  const published = await prisma.educationalGame.count({ where: { publishStatus: 'PUBLISHED' } });
  console.log(
    `Seeded educational games: ${lessonsCovered} lessons covered, ${coverUpserts} cover upserts, ${published} published games total`,
  );
}

async function ensureChapter(
  prisma: PrismaClient,
  courseId: string,
  lessons: Array<{ id: string; chapterId: string | null }>,
) {
  const chapter =
    (await prisma.chapter.findFirst({
      where: { courseId, title: 'فصل ۱ — شروع' },
    })) ??
    (await prisma.chapter.create({
      data: {
        courseId,
        title: 'فصل ۱ — شروع',
        description: 'درس‌های آغاز این دوره',
        sortOrder: 0,
      },
    }));
  for (const lesson of lessons) {
    if (!lesson.chapterId) {
      await prisma.lesson.update({ where: { id: lesson.id }, data: { chapterId: chapter.id } });
    }
  }
}

async function upsertCoverGame(prisma: PrismaClient, lessonId: string, game: LessonGameBlueprint) {
  const existing = await prisma.educationalGame.findUnique({
    where: { lessonId_slug: { lessonId, slug: game.slug } },
    select: { id: true },
  });
  if (existing) {
    await prisma.gameStage.deleteMany({ where: { gameId: existing.id } });
    await prisma.educationalGame.update({
      where: { id: existing.id },
      data: {
        title: game.title,
        description: game.description,
        learningGoal: game.learningGoal,
        type: game.type,
        difficulty: game.difficulty,
        estimatedMin: game.estimatedMin,
        points: game.points,
        publishStatus: game.publishStatus,
        required: game.required,
        settings: { passScorePct: 100, hintPenalty: 0 },
        stages: {
          create: game.stages.map((stage) => stageCreateData(stage)),
        },
      },
    });
    return;
  }
  await prisma.educationalGame.create({
    data: {
      lessonId,
      slug: game.slug,
      title: game.title,
      description: game.description,
      learningGoal: game.learningGoal,
      type: game.type,
      difficulty: game.difficulty,
      estimatedMin: game.estimatedMin,
      points: game.points,
      publishStatus: game.publishStatus,
      required: game.required,
      sortOrder: 0,
      settings: { passScorePct: 100, hintPenalty: 0 },
      stages: {
        create: game.stages.map((stage) => stageCreateData(stage)),
      },
    },
  });
}

function stageCreateData(stage: StageInput) {
  return {
    title: stage.title,
    description: stage.description ?? '',
    mission: stage.mission,
    sortOrder: stage.sortOrder,
    challengeType: stage.challengeType,
    challengeConfig: stage.challengeConfig as object,
    gradingConfig: stage.gradingConfig as object,
    hints: stage.hints ?? [],
    points: stage.points,
    timeLimitSec: stage.timeLimitSec ?? null,
  };
}

async function attachExtras(
  prisma: PrismaClient,
  course: { id: string; lessons: Array<{ id: string; chapterId: string | null }> },
  lessonIndex: number,
  games: GameInput[],
) {
  const lesson = course.lessons[lessonIndex];
  if (!lesson) return;
  for (const [index, game] of games.entries()) {
    const exists = await prisma.educationalGame.findUnique({
      where: { lessonId_slug: { lessonId: lesson.id, slug: game.slug } },
    });
    if (exists) continue;
    await prisma.educationalGame.create({
      data: {
        lessonId: lesson.id,
        slug: game.slug,
        title: game.title,
        description: game.description,
        learningGoal: game.learningGoal,
        type: game.type,
        difficulty: game.difficulty ?? 'BEGINNER',
        estimatedMin: game.estimatedMin ?? 8,
        points: game.points,
        publishStatus: game.publishStatus,
        required: game.required ?? false,
        sortOrder: index + 1,
        settings: { passScorePct: 100, hintPenalty: 0 },
        stages: {
          create: game.stages.map((stage) => stageCreateData(stage)),
        },
      },
    });
  }
}

function htmlShowcaseGames(): GameInput[] {
  return [
    {
      slug: 'html-heading-quiz',
      title: 'عنوان صفحه را بشناس',
      description: 'میان برچسب‌های پایه HTML، عنوان اصلی را پیدا کن.',
      learningGoal: 'تشخیص برچسب عنوان سطح یک',
      type: 'QUIZ',
      points: 30,
      publishStatus: 'PUBLISHED',
      stages: [
        {
          title: 'کدام برچسب عنوان اصلی است؟',
          mission: 'عنوان اصلی یک صفحه وب را انتخاب کن.',
          sortOrder: 0,
          challengeType: 'mcq',
          points: 10,
          hints: ['عنوان‌ها با حرف h شروع می‌شوند.', 'سطح یک، مهم‌ترین عنوان است.'],
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
          gradingConfig: { strategy: 'mcq', correctIds: ['h1'] },
        },
      ],
    },
    {
      slug: 'html-structure-drag',
      title: 'چیدن اسکلت صفحه',
      description: 'هر قطعه متن را در برچسب درست قرار بده.',
      learningGoal: 'تطبیق عنوان، پاراگراف و پیوند با برچسب',
      type: 'DRAG_DROP',
      points: 30,
      publishStatus: 'PUBLISHED',
      stages: [
        {
          title: 'قطعه را در برچسب درست بگذار',
          mission: 'اول قطعه را انتخاب کن، بعد جایگاه را.',
          sortOrder: 0,
          challengeType: 'drag_drop',
          points: 15,
          hints: ['پیوند معمولاً با a ساخته می‌شود.'],
          challengeConfig: {
            ui: 'drag',
            items: [
              { id: 'title', label: 'عنوان صفحه' },
              { id: 'text', label: 'یک پاراگراف' },
              { id: 'link', label: 'پیوند' },
            ],
            slots: [
              { id: 'h1', label: 'h1' },
              { id: 'p', label: 'p' },
              { id: 'a', label: 'a' },
            ],
          },
          gradingConfig: { strategy: 'drag_drop', placements: { h1: 'title', p: 'text', a: 'link' } },
        },
      ],
    },
    {
      slug: 'html-page-builder',
      title: 'یک صفحه کوچک بساز',
      description: 'با همان مفهوم عنوان و پاراگراف، یک صفحه بساز.',
      learningGoal: 'نوشتن ساختار حداقلی HTML',
      type: 'WEBSITE_BUILDER',
      points: 40,
      publishStatus: 'PUBLISHED',
      stages: [
        {
          title: 'عنوان و پاراگراف',
          mission: 'صفحه‌ای با یک h1 و یک p بنویس که کلمه سلام را داشته باشد.',
          sortOrder: 0,
          challengeType: 'dom',
          points: 20,
          hints: ['از <h1> و <p> استفاده کن.', 'اسکریپت لازم نیست.'],
          challengeConfig: {
            ui: 'website',
            language: 'html',
            prompt: 'یک عنوان و یک پاراگراف با متن سلام بساز.',
            starter: '<h1></h1>\n<p></p>',
          },
          gradingConfig: {
            strategy: 'dom',
            checks: [
              { tag: 'h1', min: 1 },
              { tag: 'p', min: 1, textIncludes: 'سلام' },
            ],
          },
        },
      ],
    },
  ];
}

function draftQuiz(): GameInput {
  return {
    slug: 'html-draft-quiz',
    title: 'پیش‌نویس: عنصر چیست؟',
    description: 'این بازی هنوز منتشر نشده و یادگیرنده آن را نمی‌بیند.',
    learningGoal: 'تمرین پیش‌نویس',
    type: 'QUIZ',
    points: 10,
    publishStatus: 'DRAFT',
    stages: [
      {
        title: 'عنصر',
        mission: 'یک گزینه را انتخاب کن.',
        sortOrder: 0,
        challengeType: 'mcq',
        points: 5,
        challengeConfig: {
          ui: 'quiz',
          prompt: 'کدام مورد یک عنصر HTML است؟',
          options: [
            { id: 'h1', text: 'h1' },
            { id: 'png', text: 'png' },
          ],
        },
        gradingConfig: { strategy: 'mcq', correctIds: ['h1'] },
      },
    ],
  };
}

function cssShowcaseGames(): GameInput[] {
  return [
    {
      slug: 'css-property-match',
      title: 'ویژگی را به کارش وصل کن',
      description: 'هر ویژگی CSS را با اثری که می‌گذارد جفت کن.',
      learningGoal: 'معنای color و margin و display',
      type: 'MATCHING',
      points: 30,
      publishStatus: 'PUBLISHED',
      stages: [
        {
          title: 'تطبیق ویژگی‌ها',
          mission: 'هر ویژگی را به کاربردش وصل کن.',
          sortOrder: 0,
          challengeType: 'matching',
          points: 15,
          hints: ['margin فاصله بیرونی عنصر است.'],
          challengeConfig: {
            ui: 'match',
            left: [
              { id: 'color', label: 'color' },
              { id: 'margin', label: 'margin' },
              { id: 'display', label: 'display' },
            ],
            right: [
              { id: 'paint', label: 'رنگ متن' },
              { id: 'space', label: 'فاصله بیرونی' },
              { id: 'box', label: 'نحوه نمایش جعبه' },
            ],
          },
          gradingConfig: { strategy: 'matching', pairs: { color: 'paint', margin: 'space', display: 'box' } },
        },
      ],
    },
    {
      slug: 'css-bug-color',
      title: 'غلط املایی ویژگی',
      description: 'قاعده‌ای که اثر نمی‌کند را اصلاح کن.',
      learningGoal: 'تشخیص نام درست ویژگی color',
      type: 'BUG_HUNTER',
      points: 25,
      publishStatus: 'PUBLISHED',
      stages: [
        {
          title: 'colour را درست کن',
          mission: 'ویژگی ناشناخته را به color تبدیل کن.',
          sortOrder: 0,
          challengeType: 'pattern',
          points: 12,
          hints: ['CSS بریتانیایی colour را نمی‌شناسد.'],
          challengeConfig: {
            ui: 'bug',
            language: 'css',
            prompt: 'این قاعده رنگ را اعمال نمی‌کند. اصلاحش کن.',
            buggyCode: 'h1 {\n  colour: teal;\n}',
          },
          gradingConfig: { strategy: 'pattern', mustMatch: ['color\\s*:'], mustNotMatch: ['colour\\s*:'] },
        },
      ],
    },
  ];
}

function javascriptShowcaseGames(): GameInput[] {
  return [
    {
      slug: 'js-predict-sum',
      title: 'خروجی جمع را حدس بزن',
      description: 'قبل از اجرا، خروجی این عبارت را بنویس.',
      learningGoal: 'خواندن یک عبارت عددی ساده',
      type: 'OUTPUT_PREDICTION',
      points: 20,
      publishStatus: 'PUBLISHED',
      stages: [
        {
          title: '۲ به‌علاوه ۳',
          mission: 'خروجی را دقیق بنویس.',
          sortOrder: 0,
          challengeType: 'output',
          points: 10,
          hints: ['جمع دو عدد صحیح است.'],
          challengeConfig: { ui: 'output', language: 'javascript', code: 'console.log(2 + 3)' },
          gradingConfig: { strategy: 'output', expected: ['5'] },
        },
      ],
    },
    {
      slug: 'js-function-greet',
      title: 'تابع سلام را بنویس',
      description: 'تابعی به نام greet تعریف کن که رشته برگرداند.',
      learningGoal: 'تعریف تابع در جاوااسکریپت',
      type: 'CODE_EDITOR',
      difficulty: 'INTERMEDIATE',
      points: 30,
      publishStatus: 'PUBLISHED',
      stages: [
        {
          title: 'تابع greet',
          mission: 'تابعی به نام greet بنویس که مقداری برگرداند.',
          sortOrder: 0,
          challengeType: 'test_cases',
          points: 15,
          hints: ['از function greet استفاده کن.', 'داخل تابع return بگذار.'],
          challengeConfig: {
            ui: 'code',
            language: 'javascript',
            prompt: 'تابع greet را تعریف کن.',
            starter: 'function greet() {\n  \n}',
          },
          gradingConfig: {
            strategy: 'test_cases',
            language: 'javascript',
            mustDeclareFunctions: ['greet'],
            mustMatch: ['return'],
          },
        },
      ],
    },
    {
      slug: 'js-variable-adventure',
      title: 'ماجرای متغیر',
      description: 'دو ماموریت کوتاه: مفهوم متغیر و خروجی‌اش.',
      learningGoal: 'متغیر و خواندن مقدار',
      type: 'CODE_ADVENTURE',
      points: 35,
      publishStatus: 'PUBLISHED',
      stages: [
        {
          title: 'متغیر چیست؟',
          mission: 'تعریف درست را انتخاب کن.',
          sortOrder: 0,
          challengeType: 'mcq',
          points: 8,
          hints: ['متغیر یک نام برای یک مقدار است.'],
          challengeConfig: {
            ui: 'quiz',
            prompt: 'متغیر در برنامه‌نویسی چیست؟',
            options: [
              { id: 'name', text: 'نامی برای نگه داشتن یک مقدار' },
              { id: 'color', text: 'فقط یک رنگ در CSS' },
              { id: 'image', text: 'یک فایل تصویری' },
            ],
          },
          gradingConfig: { strategy: 'mcq', correctIds: ['name'] },
        },
        {
          title: 'خروجی متغیر',
          mission: 'خروجی این برنامه را بنویس.',
          sortOrder: 1,
          challengeType: 'output',
          points: 8,
          hints: ['مقدار x همان ۱ است و با ۲ جمع می‌شود.'],
          challengeConfig: {
            ui: 'output',
            language: 'javascript',
            code: 'const x = 1;\nconsole.log(x + 2);',
          },
          gradingConfig: { strategy: 'output', expected: ['3'] },
        },
      ],
    },
  ];
}

function brandingShowcaseGames(): GameInput[] {
  return [
    {
      slug: 'interview-intro-sim',
      title: 'شبیه‌سازی معرفی خود',
      description: 'در یک موقعیت مصاحبه، پاسخ مناسب‌تر را انتخاب کن.',
      learningGoal: 'معرفی کوتاه با نتیجه، نه خواندن کلمه به کلمه رزومه',
      type: 'SIMULATION',
      points: 25,
      publishStatus: 'PUBLISHED',
      stages: [
        {
          title: 'خودتان را معرفی کنید',
          mission: 'برای هر پرسش مصاحبه یک پاسخ انتخاب کن.',
          sortOrder: 0,
          challengeType: 'exact',
          points: 12,
          hints: ['داستان کوتاه با نتیجه، از خواندن رزومه مؤثرتر است.'],
          challengeConfig: {
            ui: 'sim',
            steps: [
              {
                id: 'intro',
                prompt: 'مصاحبه‌کننده می‌گوید: خودتان را معرفی کنید.',
                choices: [
                  { id: 'story', label: 'یک داستان کوتاه با نتیجه مشخص' },
                  { id: 'read', label: 'خواندن کلمه به کلمه رزومه' },
                  { id: 'silent', label: 'سکوت تا پرسش بعدی' },
                ],
              },
            ],
          },
          gradingConfig: { strategy: 'exact', choices: { intro: 'story' } },
        },
      ],
    },
  ];
}
