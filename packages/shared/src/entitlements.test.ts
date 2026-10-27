import { describe, expect, it } from 'vitest';
import {
  entitlementKey,
  FREE_PREVIEW_LESSON_COUNT,
  hasCourseEntitlement,
  hasRoadmapEntitlement,
  isFreePreviewLessonIndex,
} from './utils/entitlements';

describe('entitlements', () => {
  it('builds canonical entitlement keys', () => {
    expect(entitlementKey('roadmap', 'abc')).toBe('roadmap:abc');
    expect(entitlementKey('readiness', 'test')).toBe('readiness:test');
  });

  it('detects roadmap entitlement for a specific id or any roadmap', () => {
    expect(hasRoadmapEntitlement(['roadmap:rm-1'], 'rm-1')).toBe(true);
    expect(hasRoadmapEntitlement(['roadmap:rm-1'], 'rm-2')).toBe(false);
    expect(hasRoadmapEntitlement(['roadmap:rm-1'])).toBe(true);
    expect(hasRoadmapEntitlement(['course:js'])).toBe(false);
  });

  it('detects course entitlement by slug', () => {
    expect(hasCourseEntitlement(['course:javascript-core'], 'javascript-core')).toBe(true);
    expect(hasCourseEntitlement(['course:javascript-core'], 'python')).toBe(false);
    expect(hasCourseEntitlement([])).toBe(false);
  });

  it('marks the first three lesson indexes as free preview', () => {
    expect(FREE_PREVIEW_LESSON_COUNT).toBe(3);
    expect(isFreePreviewLessonIndex(0)).toBe(true);
    expect(isFreePreviewLessonIndex(1)).toBe(true);
    expect(isFreePreviewLessonIndex(2)).toBe(true);
    expect(isFreePreviewLessonIndex(3)).toBe(false);
    expect(isFreePreviewLessonIndex(-1)).toBe(false);
  });
});
