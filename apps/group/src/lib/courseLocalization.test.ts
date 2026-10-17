import type { CourseSummary, LessonSummary } from '@kia./shared';
import { describe, expect, it } from 'vitest';
import { localizeCourse, localizeLesson } from '@/lib/courseLocalization';

const sampleCourse: CourseSummary = {
  id: '1',
  slug: 'html',
  title: 'HTML',
  description: 'HTML اولین قدم برای ورود به دنیای طراحی وب است.',
  descriptionEn: 'HTML is the first step into the world of web design.',
  icon: 'code',
  trackKey: 'web',
  lessonCount: 3,
  enrolled: false,
  progressPct: 0,
  comingSoon: false,
};

const sampleLesson: LessonSummary = {
  id: 'l1',
  slug: 'html-home',
  title: 'HTML HOME',
  durationMin: 5,
  completed: false,
  comingSoon: false,
};

const brandingCourse: CourseSummary = {
  ...sampleCourse,
  slug: 'interview-branding',
  title: 'Interview & Personal Branding',
  description: 'Build a standout portfolio.',
};

const brandingLesson: LessonSummary = {
  id: 'l2',
  slug: 'portfolio-story',
  title: 'Portfolio Story',
  durationMin: 14,
  completed: false,
  comingSoon: false,
};

describe('courseLocalization', () => {
  it('keeps English course and lesson content for en locale', () => {
    expect(localizeCourse(sampleCourse, 'en').title).toBe(sampleCourse.title);
    expect(localizeLesson(sampleLesson, 'html', 'en').title).toBe(sampleLesson.title);
  });

  it('uses the English description for en locale when available', () => {
    const localized = localizeCourse(sampleCourse, 'en');
    expect(localized.description).toBe(sampleCourse.descriptionEn);
    expect(localized.title).toBe(sampleCourse.title);
  });

  it('falls back to the source description for en locale when no English one exists', () => {
    const withoutEn = { ...sampleCourse, descriptionEn: null };
    expect(localizeCourse(withoutEn, 'en').description).toBe(sampleCourse.description);
  });

  it('leaves db.json Persian-first courses unchanged for fa locale', () => {
    const course = localizeCourse(sampleCourse, 'fa');
    expect(course.title).toBe('HTML');
    expect(course.description).toContain('HTML');
    expect(localizeLesson(sampleLesson, 'html', 'fa').title).toBe('HTML HOME');
  });

  it('applies Persian titles for legacy branding course', () => {
    const course = localizeCourse(brandingCourse, 'fa');
    expect(course.title).toBe('مصاحبه و برندسازی شخصی');
    expect(localizeLesson(brandingLesson, 'interview-branding', 'fa').title).toBe('داستان نمونه‌کار');
  });
});
