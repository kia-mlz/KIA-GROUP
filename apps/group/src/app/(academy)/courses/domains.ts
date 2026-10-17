import type { CourseSummary } from '@kia./shared';
import { TRACKS } from '@kia./shared';

/**
 * `/courses` opens on the academy's حوزه‌ها (domains) — one card per track —
 * and only then narrows to a single track's courses. A domain is the course's
 * `trackKey`, the same key the assessment/roadmap world already uses, so the
 * six declared tracks are the canonical list and admin-added keys join after.
 *
 * `trackKey` is nullable (the admin field is optional), and a course nobody
 * assigned a domain to would otherwise be reachable only through "all
 * courses". Those courses are parked under this sentinel domain so nothing
 * silently disappears from the catalog.
 */
export const OTHER_DOMAIN = '__other__';

/** The declared tracks, in catalog order (web first). */
export const STANDARD_DOMAIN_KEYS = Object.keys(TRACKS);

export interface CourseDomain {
  key: string;
  /** Courses in this domain — 0 renders the tile as "coming soon". */
  count: number;
  /** Declared track → localized label; anything else falls back to its raw key. */
  standard: boolean;
}

function normalizedKey(course: Pick<CourseSummary, 'trackKey'>): string {
  const key = course.trackKey?.trim();
  return key && key !== OTHER_DOMAIN ? key : OTHER_DOMAIN;
}

/**
 * Every domain worth showing: all six declared tracks (even empty ones, so the
 * page maps the whole academy) followed by custom keys in first-seen order.
 */
export function courseDomains(
  courses: Pick<CourseSummary, 'trackKey'>[],
): CourseDomain[] {
  const counts = new Map<string, number>();
  for (const course of courses) {
    const key = normalizedKey(course);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  // Claim each declared track's count here, so the leftovers below only hold
  // custom keys — otherwise every populated track would render twice.
  const domains: CourseDomain[] = STANDARD_DOMAIN_KEYS.map((key) => {
    const count = counts.get(key) ?? 0;
    counts.delete(key);
    return { key, count, standard: true };
  });
  for (const [key, count] of counts) {
    domains.push({ key, count, standard: false });
  }
  return domains;
}

/** Courses of one domain — `OTHER_DOMAIN` collects the unassigned ones. */
export function domainCourses<T extends Pick<CourseSummary, 'trackKey'>>(
  courses: T[],
  key: string,
): T[] {
  return courses.filter((course) => normalizedKey(course) === key);
}

/**
 * What a `/courses?track=` view lists: no param is the domain home (nothing
 * listed), the reserved `all` key is the whole catalog, anything else is one
 * domain. Keeping the `all` branch here stops it from being run through the
 * domain filter — no course carries that key, so the "all courses" view would
 * silently render empty.
 */
export function coursesForTrack<T extends Pick<CourseSummary, 'trackKey'>>(
  courses: T[],
  track: string | null,
): T[] {
  if (!track) return [];
  return track === 'all' ? courses : domainCourses(courses, track);
}
