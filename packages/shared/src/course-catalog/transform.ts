import { demoLessonVideoUrl } from './demo-videos';
import type {
  CatalogCourseSeed,
  CatalogLessonSeed,
  CourseDbEnOverlay,
  CourseDbFile,
  CourseDbLesson,
  CourseDbPlayground,
} from './types';

const PLAYGROUND_FENCE = 'kia-playground';

const COURSE_ICONS: Record<string, string> = {
  html: 'code',
  css: 'palette',
  javascript: 'code',
  js: 'code',
};

/** URL-safe slug; falls back when the title has no Latin/digit characters. */
export function slugifyLabel(input: string, fallback: string): string {
  const base = input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return base || fallback;
}

export function courseSlugFromTitle(title: string, id: number): string {
  return slugifyLabel(title, `course-${id}`);
}

export function lessonSlugFromTitle(title: string, id: number): string {
  return slugifyLabel(title, `lesson-${id}`);
}

export function resolvePlayground(lesson: CourseDbLesson): CourseDbPlayground | null {
  if (lesson.playground && typeof lesson.playground === 'object') {
    return normalizePlayground(lesson.playground);
  }
  if (lesson.playground_config) {
    try {
      const parsed = JSON.parse(lesson.playground_config) as CourseDbPlayground;
      return normalizePlayground(parsed);
    } catch {
      return null;
    }
  }
  return null;
}

function normalizePlayground(raw: CourseDbPlayground): CourseDbPlayground {
  const js = raw.js ?? raw.javascript;
  return {
    language: raw.language,
    html: raw.html,
    css: raw.css,
    js,
  };
}

/** Pack lesson markdown + optional playground JSON into a single content string. */
export function packLessonContent(
  description: string | null | undefined,
  playground: CourseDbPlayground | null,
): string {
  const body = (description ?? '').trim() || 'Lesson content';
  if (!playground) return body;
  return `${body}\n\n\`\`\`${PLAYGROUND_FENCE}\n${JSON.stringify(playground)}\n\`\`\``;
}

/** Split packed lesson content into markdown body and playground starters. */
export function parseLessonContent(content: string): {
  markdown: string;
  playground: CourseDbPlayground | null;
} {
  const pattern = new RegExp(`\\n\`\`\`${PLAYGROUND_FENCE}\\n([\\s\\S]*?)\\n\`\`\`\\s*$`);
  const match = content.match(pattern);
  if (!match) {
    return { markdown: content, playground: null };
  }
  const markdown = content.slice(0, match.index).trimEnd();
  try {
    const playground = normalizePlayground(JSON.parse(match[1]!) as CourseDbPlayground);
    return { markdown, playground };
  } catch {
    return { markdown: content, playground: null };
  }
}

function uniqueSlug(base: string, used: Set<string>): string {
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  let i = 2;
  while (used.has(`${base}-${i}`)) i += 1;
  const next = `${base}-${i}`;
  used.add(next);
  return next;
}

/** Transform root `db.json` (plus an optional English overlay) into seed/catalog course records. */
export function buildCourseCatalog(
  db: CourseDbFile,
  en?: CourseDbEnOverlay,
): CatalogCourseSeed[] {
  const courses = [...db.courses].sort((a, b) => a.order_index - b.order_index);
  const lessonsByCourse = new Map<number, CourseDbLesson[]>();
  for (const lesson of db.lessons) {
    const list = lessonsByCourse.get(lesson.course_id) ?? [];
    list.push(lesson);
    lessonsByCourse.set(lesson.course_id, list);
  }

  const usedCourseSlugs = new Set<string>();

  return courses.map((course) => {
    const slug = uniqueSlug(courseSlugFromTitle(course.title, course.id), usedCourseSlugs);
    const usedLessonSlugs = new Set<string>();
    const rawLessons = [...(lessonsByCourse.get(course.id) ?? [])].sort(
      (a, b) => a.order_index - b.order_index,
    );

    const lessons: CatalogLessonSeed[] = rawLessons.map((lesson, lessonIndex) => {
      const playground = resolvePlayground(lesson);
      const lessonSlug = uniqueSlug(lessonSlugFromTitle(lesson.title, lesson.id), usedLessonSlugs);
      const enLesson = en?.lessons[lesson.id];
      const enPlayground = enLesson?.playground
        ? normalizePlayground(enLesson.playground)
        : playground;
      const videoUrl =
        (lesson.video_url && lesson.video_url.trim()) || demoLessonVideoUrl(lessonIndex);
      return {
        sourceId: lesson.id,
        slug: lessonSlug,
        title: lesson.title,
        content: packLessonContent(lesson.description, playground),
        contentEn: enLesson
          ? packLessonContent(enLesson.description, enPlayground)
          : null,
        videoUrl,
        durationMin: lesson.duration_minutes && lesson.duration_minutes > 0 ? lesson.duration_minutes : 5,
        sortOrder: lesson.order_index,
        playground,
      };
    });

    return {
      sourceId: course.id,
      slug,
      title: course.title,
      description: (course.description ?? '').trim() || course.title,
      descriptionEn: en?.courses[course.id] ?? null,
      icon: COURSE_ICONS[slug] ?? 'book',
      trackKey: 'web',
      sortOrder: course.order_index,
      lessons,
    };
  });
}
