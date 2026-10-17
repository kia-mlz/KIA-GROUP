import { describe, expect, it } from 'vitest';
import { TRACKS } from '@kia./shared';
import {
  courseDomains,
  coursesForTrack,
  domainCourses,
  OTHER_DOMAIN,
  STANDARD_DOMAIN_KEYS,
} from './domains';

/** Minimal `CourseSummary` slice — grouping only reads `trackKey`. */
const course = (trackKey: string | null) => ({ trackKey });

describe('courseDomains', () => {
  it('declares every track of the academy even when no course carries it yet', () => {
    const keys = courseDomains([course('web'), course('web')]).map((domain) => domain.key);

    for (const track of Object.keys(TRACKS)) {
      expect(keys).toContain(track);
    }
    expect(keys.slice(0, STANDARD_DOMAIN_KEYS.length)).toEqual(STANDARD_DOMAIN_KEYS);
  });

  it('lists each domain exactly once', () => {
    // Regression: the standard tracks were also emitted from the leftovers
    // pass, so every populated domain rendered a second, duplicate card.
    const keys = courseDomains([
      course('web'),
      course('backend'),
      course('devops'),
      course(null),
    ]).map((domain) => domain.key);

    expect(new Set(keys).size).toBe(keys.length);
  });

  it('counts courses per domain and keeps empty ones at zero', () => {
    const domains = courseDomains([
      course('web'),
      course('web'),
      course('backend'),
      course(null),
    ]);
    const byKey = new Map(domains.map((domain) => [domain.key, domain.count]));

    expect(byKey.get('web')).toBe(2);
    expect(byKey.get('backend')).toBe(1);
    expect(byKey.get('ai')).toBe(0);
    expect(byKey.get(OTHER_DOMAIN)).toBe(1);
  });

  it('appends admin-added domain keys after the declared ones', () => {
    const domains = courseDomains([course('devops'), course('web')]);
    const keys = domains.map((domain) => domain.key);

    expect(keys.indexOf('devops')).toBeGreaterThanOrEqual(STANDARD_DOMAIN_KEYS.length);
    expect(domains.find((domain) => domain.key === 'devops')).toEqual({
      key: 'devops',
      count: 1,
      standard: false,
    });
  });
});

describe('coursesForTrack', () => {
  const courses = [course('web'), course('web'), course('backend'), course(null)];

  it('lists nothing for the domain home, and everything for the reserved "all" key', () => {
    // Regression: "all" used to run through the domain filter, where no course
    // matches, so /courses?track=all rendered an empty grid.
    expect(coursesForTrack(courses, null)).toEqual([]);
    expect(coursesForTrack(courses, 'all')).toEqual(courses);
  });

  it('narrows to one domain, including the unassigned bucket', () => {
    expect(coursesForTrack(courses, 'backend')).toHaveLength(1);
    expect(coursesForTrack(courses, OTHER_DOMAIN)).toHaveLength(1);
    expect(coursesForTrack(courses, 'game')).toHaveLength(0);
  });
});

describe('domainCourses', () => {
  const courses = [course('web'), course('web'), course('backend'), course(''), course(null)];

  it('returns only the courses of that domain', () => {
    expect(domainCourses(courses, 'web')).toHaveLength(2);
    expect(domainCourses(courses, 'backend')).toHaveLength(1);
    expect(domainCourses(courses, 'ai')).toHaveLength(0);
  });

  it('parks unassigned courses in the "other" domain so none go missing', () => {
    expect(domainCourses(courses, OTHER_DOMAIN)).toHaveLength(2);
    // A course literally named with the sentinel must not escape the bucket.
    expect(domainCourses([course(OTHER_DOMAIN)], OTHER_DOMAIN)).toHaveLength(1);
  });
});
