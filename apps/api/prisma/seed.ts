import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@kia./platform';
import * as bcrypt from 'bcrypt';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DEFAULT_ASSESSMENT_BANK,
  EXAM_QUESTION_BANK,
  MINI_IPIP_CITATION,
  MINI_IPIP_ITEMS,
  buildCourseCatalog,
  buildCourseDbEnOverlay,
  createDefaultSiteSettings,
  defaultExamBanks,
  genericExamQuestions,
  type CourseDbFile,
} from '@kia./shared';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }),
});

const SEED_PASSWORD = 'KiaAcademy123!';

function loadCourseDb(): CourseDbFile {
  const candidates = [
    join(__dirname, '../../../db.json'),
    join(process.cwd(), 'db.json'),
    join(process.cwd(), '../../db.json'),
  ];
  for (const path of candidates) {
    try {
      return JSON.parse(readFileSync(path, 'utf8')) as CourseDbFile;
    } catch {
      /* try next */
    }
  }
  throw new Error('Could not find db.json (expected at monorepo root)');
}

async function main() {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@kia.academy' },
    update: {
      name: 'kia. Super Admin',
      passwordHash,
      role: 'SUPER_ADMIN',
      profileComplete: true,
    },
    create: {
      name: 'kia. Super Admin',
      email: 'admin@kia.academy',
      passwordHash,
      role: 'SUPER_ADMIN',
      profileComplete: true,
    },
  });

  const user = await prisma.user.upsert({
    where: { email: 'alex@kia.academy' },
    update: {
      name: 'Alex R.',
      passwordHash,
      profileComplete: true,
      firstName: 'Alex',
      lastName: 'R.',
      city: 'Tehran',
    },
    create: {
      name: 'Alex R.',
      email: 'alex@kia.academy',
      passwordHash,
      profileComplete: true,
      firstName: 'Alex',
      lastName: 'R.',
      city: 'Tehran',
      bootcampProfile: {
        create: {
          rank: 12,
          points: 340,
        },
      },
    },
  });

  const catalog = buildCourseCatalog(loadCourseDb(), buildCourseDbEnOverlay());
  const seededCourses: { id: string; slug: string }[] = [];

  for (const course of catalog) {
    const row = await prisma.course.upsert({
      where: { slug: course.slug },
      update: {
        title: course.title,
        description: course.description,
        descriptionEn: course.descriptionEn,
        icon: course.icon,
        trackKey: course.trackKey,
        sortOrder: course.sortOrder,
        published: true,
      },
      create: {
        slug: course.slug,
        title: course.title,
        description: course.description,
        descriptionEn: course.descriptionEn,
        icon: course.icon,
        trackKey: course.trackKey,
        sortOrder: course.sortOrder,
        published: true,
      },
    });
    seededCourses.push({ id: row.id, slug: row.slug });

    for (const lesson of course.lessons) {
      await prisma.lesson.upsert({
        where: {
          courseId_slug: {
            courseId: row.id,
            slug: lesson.slug,
          },
        },
        update: {
          title: lesson.title,
          content: lesson.content,
          contentEn: lesson.contentEn,
          durationMin: lesson.durationMin,
          sortOrder: lesson.sortOrder,
          videoUrl: lesson.videoUrl,
        },
        create: {
          courseId: row.id,
          slug: lesson.slug,
          title: lesson.title,
          content: lesson.content,
          contentEn: lesson.contentEn,
          durationMin: lesson.durationMin,
          sortOrder: lesson.sortOrder,
          videoUrl: lesson.videoUrl,
        },
      });
    }
  }

  const interviewBranding = await prisma.course.upsert({
    where: { slug: 'interview-branding' },
    update: {
      title: 'Interview & Personal Branding',
      description: 'Build a standout portfolio, resume, and interview story that gets you hired.',
      icon: 'briefcase',
      trackKey: 'web',
      sortOrder: 100,
      published: true,
    },
    create: {
      slug: 'interview-branding',
      title: 'Interview & Personal Branding',
      description: 'Build a standout portfolio, resume, and interview story that gets you hired.',
      icon: 'briefcase',
      trackKey: 'web',
      sortOrder: 100,
      published: true,
    },
  });

  const brandingLessons = [
    {
      slug: 'portfolio-story',
      title: 'Portfolio Story',
      durationMin: 14,
      sortOrder: 1,
      content: `# Portfolio Story

Your portfolio should tell a clear story: **who you are**, *what you build*, and why it matters.

## A case study that recruiters read

1. **Context** — one sentence on the product and your role.
2. **Problem** — the constraint or user pain you targeted.
3. **Solution** — what you shipped, with \`key metrics\` (e.g. *+34% signup*).
4. **Reflection** — what you would do differently next time.

## Checklist

- Hero section with role + value proposition
- 2–3 featured projects with outcomes
- Contact link and GitHub profile

> Tip: recruiters skim for ~90 seconds. Put outcomes *before* tooling lists.

Host the site for free with [GitHub Pages](https://pages.github.com/).`,
    },
    {
      slug: 'interview-framework',
      title: 'Interview Framework',
      durationMin: 16,
      sortOrder: 2,
      content: `# Interview Framework

Use **STAR** (Situation, Task, Action, Result) to answer behavioral questions.

## Run the STAR loop

1. *Situation* — set the scene in two sentences max.
2. *Task* — state your specific responsibility.
3. *Action* — say what **you** did, not the team.
4. *Result* — quantify it, then link it to the role.

## Tips

- Lead with impact, not tools
- Quantify results when possible
- Prepare 3 project deep-dives

> Practice out loud: a strong answer fits in \`90 seconds\`.

Review the STAR method on [Wikipedia](https://en.wikipedia.org/wiki/Situation,_Task,_Action,_Result) before your next mock interview.`,
    },
  ];

  for (const lesson of brandingLessons) {
    await prisma.lesson.upsert({
      where: {
        courseId_slug: {
          courseId: interviewBranding.id,
          slug: lesson.slug,
        },
      },
      update: {
        title: lesson.title,
        content: lesson.content,
        durationMin: lesson.durationMin,
        sortOrder: lesson.sortOrder,
      },
      create: {
        courseId: interviewBranding.id,
        ...lesson,
      },
    });
  }

  console.log(`Seeded admin user: ${admin.name} (${admin.email})`);
  console.log(`  Password: ${SEED_PASSWORD}`);
  console.log(`Seeded learner: ${user.name} (${user.email ?? 'alex@kia.academy'})`);
  console.log(`  Password: ${SEED_PASSWORD}`);
  console.log(
    `Seeded courses from db.json: ${seededCourses.map((c) => c.slug).join(', ')}, interview-branding`,
  );

  const defaults = createDefaultSiteSettings();
  await prisma.siteSetting.upsert({
    where: { key: 'site' },
    create: { key: 'site', value: defaults },
    update: {
      // Keep evolving defaults in sync for local/dev seeds (pricing + payment + sms + enamad).
      value: defaults,
    },
  });
  console.log('Seeded site settings');

  const testBanks = [
    {
      id: 'personality',
      payload: {
        version: 1,
        citation: MINI_IPIP_CITATION,
        items: MINI_IPIP_ITEMS.map((item) => ({ ...item })),
      },
    },
    {
      id: 'assessment',
      payload: structuredClone(DEFAULT_ASSESSMENT_BANK),
    },
    {
      id: 'readiness',
      payload: { version: 1, questions: structuredClone(EXAM_QUESTION_BANK) },
    },
  ] as const;

  for (const bank of testBanks) {
    await prisma.testBank.upsert({
      where: { id: bank.id },
      create: { id: bank.id, payload: bank.payload },
      update: { payload: bank.payload },
    });
  }
  // ---- Default midterm & final exam for every course ----
  for (const seeded of seededCourses) {
    const course = await prisma.course.findUnique({ where: { id: seeded.id } });
    if (!course) continue;
    const bank = defaultExamBanks[seeded.slug];
    const firstLesson =
      (await prisma.lesson.findFirst({
        where: { courseId: course.id },
        orderBy: { sortOrder: 'asc' },
      })) ?? null;
    const defaults = [
      {
        kind: 'MIDTERM' as const,
        title: `آزمون میان‌دوره ${course.title}`,
        description: 'سنجش نیمهٔ اول دوره — به‌صورت پیش‌فرض ساخته شد.',
        passScore: 50,
        sortOrder: 0,
        afterLessonId: firstLesson?.id ?? null,
        questions: bank?.midterm ?? genericExamQuestions(course.title),
      },
      {
        kind: 'FINAL' as const,
        title: `آزمون نهایی ${course.title}`,
        description: 'پوشش کل دوره — به‌صورت پیش‌فرض ساخته شد.',
        passScore: 60,
        sortOrder: 1,
        afterLessonId: null,
        questions: bank?.final ?? genericExamQuestions(course.title),
      },
    ];
    for (const exam of defaults) {
      const exists = await prisma.courseExam.findFirst({
        where: { courseId: course.id, kind: exam.kind },
      });
      if (exists) continue;
      await prisma.courseExam.create({
        data: {
          courseId: course.id,
          title: exam.title,
          description: exam.description,
          passScore: exam.passScore,
          durationMin: 10,
          published: true,
          sortOrder: exam.sortOrder,
          kind: exam.kind,
          afterLessonId: exam.afterLessonId,
          questions: exam.questions,
        },
      });
    }
  }
  console.log('Seeded default midterm/final exams for all courses');

  console.log('Seeded test banks: personality, assessment, readiness');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
