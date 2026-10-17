'use client';

/**
 * The six kia. departments — one registry, so nothing about a department
 * is written down twice.
 *
 * The rail (TopBar) and the departments hub (DepartmentSolarSystem) both
 * describe a department from this list: a department's planet and the rail it
 * turns into can therefore never disagree about its colour or its route.
 *
 * There is no per-department *glyph* here. The rail wears the kia. emblem
 * painted in the department's colour — the same mark its page header shows — so
 * the shape stays the brand's and only the colour changes.
 */

export type DepartmentSlug =
  | 'academy'
  | 'work'
  | 'material'
  | 'events'
  | 'community'
  | 'labs';

export interface Department {
  /** Matches the `--dept-<slug>` token and the `.dept--<slug>` tile class. */
  slug: DepartmentSlug;
  /** Route root; everything below it belongs to this department too. */
  href: string;
  /**
   * Where the department's name lives. `dashboard.doors.*Title` is already the
   * one place all six names are written down, so the rail borrows it instead of
   * adding a second spelling that could drift.
   */
  titleKey: string;
}

export const DEPARTMENTS: readonly Department[] = [
  { slug: 'academy', href: '/tracks', titleKey: 'dashboard.doors.academyTitle' },
  { slug: 'work', href: '/freelance', titleKey: 'dashboard.doors.workTitle' },
  { slug: 'material', href: '/material', titleKey: 'dashboard.doors.materialTitle' },
  { slug: 'events', href: '/events', titleKey: 'dashboard.doors.eventsTitle' },
  { slug: 'community', href: '/community', titleKey: 'dashboard.doors.communityTitle' },
  { slug: 'labs', href: '/labs', titleKey: 'dashboard.doors.labsTitle' },
];

/**
 * Which department owns a path — the question the rail asks on every render.
 *
 * Sub-routes count (`/tracks/technology`, `/material/pdf`), but only on a slash
 * boundary: a bare `startsWith` would hand `/materiality` to Material. Anything
 * outside the six roots (the hub, the dashboard, the lesson player) has no
 * department, and the rail keeps the parent kia. identity there.
 */
export function departmentForPathname(pathname: string | null | undefined): Department | null {
  if (!pathname) return null;
  for (const dept of DEPARTMENTS) {
    if (pathname === dept.href || pathname.startsWith(`${dept.href}/`)) return dept;
  }
  return null;
}
