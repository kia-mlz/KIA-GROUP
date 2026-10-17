import type { CourseSummary, LessonSummary } from '@kia./shared';
import type { Locale } from '@/i18n/locales';

/**
 * db.json course content is already Persian-first. Keep a small map only for
 * legacy/en-only bonus courses that still need FA titles.
 */
const persianCourses: Record<string, { title: string; description: string; lessons: Record<string, string> }> = {
  'interview-branding': {
    title: 'مصاحبه و برندسازی شخصی',
    description: 'یک رزومه، نمونه‌کار و روایت مصاحبهٔ اثرگذار بسازید.',
    lessons: {
      'portfolio-story': 'داستان نمونه‌کار',
      'interview-framework': 'چارچوب مصاحبه',
    },
  },
};

export function localizeCourse<T extends CourseSummary>(course: T, locale: Locale): T {
  if (locale === 'en') {
    // English mode: prefer the English description when the source content is Persian-first.
    return course.descriptionEn ? { ...course, description: course.descriptionEn } : course;
  }
  const translation = persianCourses[course.slug];
  return translation ? { ...course, title: translation.title, description: translation.description } : course;
}

export function localizeLesson<T extends LessonSummary>(
  lesson: T,
  courseSlug: string,
  locale: Locale,
): T {
  if (locale !== 'fa') return lesson;
  const title = persianCourses[courseSlug]?.lessons[lesson.slug];
  return title ? { ...lesson, title } : lesson;
}
