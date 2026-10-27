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
  /** Route root where the department's hub card links. */
  href: string;
  /**
   * Every other route root this department owns. A department is more than
   * its hub URL: the academy teaches on `/courses`, `/learn`, `/education`,
   * `/assessment`, `/readiness` and `/roadmap` (and aliases `/academy`), and
   * the events hub hands off to the `/bootcamp` arena. Each root matches
   * itself and everything below it on a slash boundary, so the rail wears the
   * department's identity anywhere inside its pages instead of falling back
   * to the parent Kia lockup.
   */
  paths?: readonly string[];
  /**
   * Where the department's name lives. `dashboard.doors.*Title` is already the
   * one place all six names are written down, so the rail borrows it instead of
   * adding a second spelling that could drift.
   */
  titleKey: string;
}

export const DEPARTMENTS: readonly Department[] = [
  {
    slug: 'academy',
    href: '/tracks',
    paths: ['/academy', '/assessment', '/courses', '/education', '/learn', '/readiness', '/roadmap'],
    titleKey: 'dashboard.doors.academyTitle',
  },
  { slug: 'work', href: '/freelance', paths: ['/work'], titleKey: 'dashboard.doors.workTitle' },
  { slug: 'material', href: '/material', titleKey: 'dashboard.doors.materialTitle' },
  { slug: 'events', href: '/events', paths: ['/bootcamp'], titleKey: 'dashboard.doors.eventsTitle' },
  { slug: 'community', href: '/community', titleKey: 'dashboard.doors.communityTitle' },
  { slug: 'labs', href: '/labs', titleKey: 'dashboard.doors.labsTitle' },
];

/**
 * Which department owns a path — the question the rail asks on every render.
 *
 * Every root in the registry counts — the hub `href` and the extra `paths`
 * (sub-routes too: `/tracks/technology`, `/learn/html/html-home`) — but only
 * on a slash boundary: a bare `startsWith` would hand `/materiality` to
 * Material. Anything outside those roots (the hub, the dashboard, checkout,
 * admin) has no department, and the rail keeps the parent kia. identity there.
 */
export function departmentForPathname(pathname: string | null | undefined): Department | null {
  if (!pathname) return null;
  for (const dept of DEPARTMENTS) {
    for (const root of [dept.href, ...(dept.paths ?? [])]) {
      if (pathname === root || pathname.startsWith(`${root}/`)) return dept;
    }
  }
  return null;
}
