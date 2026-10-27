export interface LessonSummary {
  id: string;
  slug: string;
  title: string;
  durationMin: number;
  completed: boolean;
  hasVideo?: boolean;
  /** "Coming soon" — visible in listings but locked with no content access. */
  comingSoon: boolean;
  /**
   * First N lessons of every course (see `FREE_PREVIEW_LESSON_COUNT`) are
   * open without purchase so learners can try the content.
   */
  freePreview?: boolean;
}

export interface CourseSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  /** English description when available (null → fall back to `description`). */
  descriptionEn?: string | null;
  icon: string;
  trackKey: string | null;
  lessonCount: number;
  enrolled: boolean;
  progressPct: number;
  /** "Coming soon" — visible in listings but locked with no content access. */
  comingSoon: boolean;
  /** Slug of the first lesson (sortOrder asc) — set on /courses/mine for direct "continue" links. */
  firstLessonSlug?: string | null;
}

export interface LessonDetail extends LessonSummary {
  content: string;
  /** Packed English content (markdown + playground) when available. */
  contentEn?: string | null;
  videoUrl: string | null;
  courseSlug: string;
  courseTitle: string;
  prevSlug: string | null;
  nextSlug: string | null;
}
