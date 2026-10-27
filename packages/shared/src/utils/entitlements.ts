/** Build the canonical entitlement key stored in LearnerState. */
export function entitlementKey(resourceType: string, resourceId: string): string {
  return `${resourceType}:${resourceId}`;
}

export function hasRoadmapEntitlement(entitlements: string[], roadmapId?: string | null): boolean {
  if (roadmapId) {
    return entitlements.includes(entitlementKey('roadmap', roadmapId));
  }
  return entitlements.some((entry) => entry.startsWith('roadmap:'));
}

export function hasCourseEntitlement(entitlements: string[], courseSlug: string): boolean {
  return entitlements.includes(entitlementKey('course', courseSlug));
}

/**
 * How many leading lessons (by `sortOrder` ascending) are free to try without
 * purchasing the course. Shared by API gating and the course detail UI.
 */
export const FREE_PREVIEW_LESSON_COUNT = 3;

/** True when `lessonIndex` (0-based in sortOrder order) is a free preview slot. */
export function isFreePreviewLessonIndex(lessonIndex: number): boolean {
  return Number.isInteger(lessonIndex) && lessonIndex >= 0 && lessonIndex < FREE_PREVIEW_LESSON_COUNT;
}
