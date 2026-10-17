import {
  buildCourseCatalog,
  buildCourseDbEnOverlay,
  type CourseDbFile,
} from '@kia./shared';
import courseDb from '../../../../db.json';

/** Courses + lessons derived from monorepo-root `db.json` (with the English overlay). */
export const courseCatalog = buildCourseCatalog(courseDb as CourseDbFile, buildCourseDbEnOverlay());

export const primaryCourseSlug = courseCatalog[0]?.slug ?? 'html';
export const primaryLessonSlug = courseCatalog[0]?.lessons[0]?.slug ?? 'html-home';
