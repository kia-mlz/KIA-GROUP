import type { AdminAccessSection } from '@kia./shared';
import type { DepartmentSlug } from '@/components/brand/departments';

/**
 * Which admin modules a department owns, keyed by the same permission section
 * the API guards each module's routes with.
 *
 * This lives in `src/lib/` rather than the page because a Next.js `page.tsx`
 * may only export a default (and route config), so the gating that the hub
 * needs to be honest about — and that the tests need to assert directly — would
 * otherwise be untestable without a DOM.
 */
export type DepartmentModule = {
  href: string;
  labelKey: string;
  key: AdminAccessSection;
};

/** How many admin modules a department currently owns — a real, honest count, not a placeholder. */
export function departmentModCount(slug: DepartmentSlug): number {
  return DEPARTMENT_MODULES[slug].length;
}

/** Human labels for the module areas a department owns (for the in-card tags).
 *  These mirror `DEPARTMENT_MODULES` so a new module cannot appear in a tag
 *  without also becoming an entry point. */
export function departmentTags(slug: DepartmentSlug): string[] {
  return DEPARTMENT_MODULES[slug].map((module) => {
    // Translate the label key into a short, plain-language tag at build time
    // so the tag text is the dictionary's own spelling of that section.
    return module.labelKey;
  });
}

export const DEPARTMENT_MODULES: Record<DepartmentSlug, DepartmentModule[]> = {
  academy: [
    { href: '/admin/academy/courses', labelKey: 'admin.nav.courses', key: 'courses' },
    { href: '/admin/academy/tests', labelKey: 'admin.nav.tests', key: 'tests' },
  ],
  // Bootcamps, challenges and competitions all live in the event department.
  events: [
    { href: '/admin/events/competitions', labelKey: 'admin.nav.competitions', key: 'competitions' },
    { href: '/admin/events/challenges', labelKey: 'admin.nav.challenges', key: 'challenges' },
  ],
  work: [],
  material: [],
  community: [],
  labs: [],
};

/**
 * The modules a given moderator may actually open.
 *
 * A department can own modules the signed-in admin is not allowed to touch,
 * and when it does the card must say so ("no access" / "numbers hidden") rather
 * than render entry points that would 403, or silently drop its numbers while
 * looking like empty data.
 */
export function departmentEntryPoints(
  slug: DepartmentSlug,
  can: (section: AdminAccessSection) => boolean,
): DepartmentModule[] {
  return DEPARTMENT_MODULES[slug].filter((module) => can(module.key));
}

/** True for a department that produces numbers at all (Academy, Events). */
export function hasDepartmentMetrics(slug: DepartmentSlug): boolean {
  return slug === 'academy' || slug === 'events';
}
