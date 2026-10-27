import type { DepartmentSlug } from '@/components/brand/departments';
import { DEPARTMENTS } from '@/components/brand/departments';

/**
 * Learner (student) panels — one workspace per department, plus a thin
 * platform account surface for wallet / support / profile.
 *
 * Mirrors the admin workspace split (`AdminLayoutClient` + `DEPARTMENT_MODULES`):
 * department menus never invent destinations that have no page, and empty
 * departments still get an honest panel shell with a link to their public hub.
 */

export type LearnerPanelScope = DepartmentSlug | 'platform';

export type LearnerNavItemId =
  | 'overview'
  | 'my-courses'
  | 'progress'
  | 'results'
  | 'roadmap'
  | 'tracks'
  | 'bootcamps'
  | 'competitions'
  | 'events'
  | 'rewards'
  | 'studio'
  | 'hub'
  | 'finance'
  | 'purchases'
  | 'tickets'
  | 'messages'
  | 'profile'
  | 'todos';

export type LearnerNavItem = {
  id: LearnerNavItemId;
  href: string;
  labelKey: string;
  /** Exact path match (overview homes). */
  exact?: boolean;
};

export type LearnerPanelDefinition = {
  scope: LearnerPanelScope;
  /** Canonical panel home. */
  href: string;
  titleKey: string;
  /** Public department hub (platform has /home). */
  hubHref: string;
  nav: readonly LearnerNavItem[];
};

/** Academy-owned routes that still live under the legacy `/dashboard/*` tree. */
const ACADEMY_DASHBOARD_PREFIXES = [
  '/dashboard/my-courses',
  '/dashboard/progress',
  '/dashboard/results',
] as const;

/** Events-owned routes that still live under `/dashboard/*`. */
const EVENTS_DASHBOARD_PREFIXES = [
  '/dashboard/bootcamps',
  '/dashboard/competitions',
  '/dashboard/events',
] as const;

/** Cross-department account / support routes. */
const PLATFORM_DASHBOARD_PREFIXES = [
  '/dashboard/finance',
  '/dashboard/purchases',
  '/dashboard/tickets',
  '/dashboard/messages',
  '/dashboard/profile',
  '/dashboard/todos',
] as const;

export const LEARNER_PANELS: Record<LearnerPanelScope, LearnerPanelDefinition> = {
  academy: {
    scope: 'academy',
    href: '/dashboard',
    titleKey: 'panel.departments.academy',
    hubHref: '/tracks',
    nav: [
      { id: 'overview', href: '/dashboard', labelKey: 'panel.nav.academyOverview', exact: true },
      { id: 'my-courses', href: '/dashboard/my-courses', labelKey: 'panel.nav.myCourses' },
      { id: 'progress', href: '/dashboard/progress', labelKey: 'panel.nav.progress' },
      { id: 'results', href: '/dashboard/results', labelKey: 'panel.nav.results' },
      { id: 'roadmap', href: '/roadmap', labelKey: 'panel.nav.roadmap' },
      { id: 'tracks', href: '/tracks', labelKey: 'panel.nav.tracks' },
    ],
  },
  events: {
    scope: 'events',
    href: '/events/panel',
    titleKey: 'panel.departments.events',
    hubHref: '/events',
    nav: [
      { id: 'overview', href: '/events/panel', labelKey: 'panel.nav.eventsOverview', exact: true },
      { id: 'bootcamps', href: '/dashboard/bootcamps', labelKey: 'panel.nav.enrolledBootcamps' },
      { id: 'competitions', href: '/dashboard/competitions', labelKey: 'panel.nav.registeredCompetitions' },
      { id: 'events', href: '/dashboard/events', labelKey: 'panel.nav.events' },
      { id: 'rewards', href: '/rewards', labelKey: 'nav.rewards' },
      { id: 'hub', href: '/bootcamp', labelKey: 'panel.nav.bootcampArena' },
    ],
  },
  material: {
    scope: 'material',
    href: '/material/panel',
    titleKey: 'panel.departments.material',
    hubHref: '/material',
    nav: [
      { id: 'overview', href: '/material/panel', labelKey: 'panel.nav.materialOverview', exact: true },
      { id: 'studio', href: '/material', labelKey: 'panel.nav.material' },
    ],
  },
  work: {
    scope: 'work',
    href: '/work/panel',
    titleKey: 'panel.departments.work',
    hubHref: '/freelance',
    nav: [
      { id: 'overview', href: '/work/panel', labelKey: 'panel.nav.workOverview', exact: true },
      { id: 'hub', href: '/freelance', labelKey: 'panel.nav.workHub' },
    ],
  },
  community: {
    scope: 'community',
    href: '/community/panel',
    titleKey: 'panel.departments.community',
    hubHref: '/community',
    nav: [
      { id: 'overview', href: '/community/panel', labelKey: 'panel.nav.communityOverview', exact: true },
      { id: 'hub', href: '/community', labelKey: 'panel.nav.communityHub' },
    ],
  },
  labs: {
    scope: 'labs',
    href: '/labs/panel',
    titleKey: 'panel.departments.labs',
    hubHref: '/labs',
    nav: [
      { id: 'overview', href: '/labs/panel', labelKey: 'panel.nav.labsOverview', exact: true },
      { id: 'hub', href: '/labs', labelKey: 'panel.nav.labsHub' },
    ],
  },
  platform: {
    scope: 'platform',
    href: '/dashboard/profile',
    titleKey: 'panel.departments.platform',
    hubHref: '/home',
    nav: [
      { id: 'finance', href: '/dashboard/finance', labelKey: 'panel.nav.finance' },
      { id: 'purchases', href: '/dashboard/purchases', labelKey: 'panel.nav.purchases' },
      { id: 'todos', href: '/dashboard/todos', labelKey: 'panel.nav.todos' },
      { id: 'tickets', href: '/dashboard/tickets', labelKey: 'panel.nav.tickets' },
      { id: 'messages', href: '/dashboard/messages', labelKey: 'panel.nav.messages' },
      { id: 'profile', href: '/dashboard/profile', labelKey: 'panel.nav.profile' },
    ],
  },
};

/** Department panels in solar-system / hub order (excludes platform). */
export const DEPARTMENT_LEARNER_PANELS: readonly LearnerPanelDefinition[] = DEPARTMENTS.map(
  (dept) => LEARNER_PANELS[dept.slug],
);

function matchesPrefix(pathname: string, prefix: string, exact?: boolean): boolean {
  if (exact) return pathname === prefix;
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/**
 * Which learner workspace owns this path — drives the sidebar menu.
 *
 * Order matters: more specific `/dashboard/*` owners win before the academy
 * overview at `/dashboard`, and department public hubs fall through to their
 * panel scope so browsing `/courses` still shows Academy tools.
 */
export function learnerPanelScopeForPathname(
  pathname: string | null | undefined,
): LearnerPanelScope {
  const path = pathname || '/dashboard';

  for (const prefix of PLATFORM_DASHBOARD_PREFIXES) {
    if (matchesPrefix(path, prefix)) return 'platform';
  }
  for (const prefix of EVENTS_DASHBOARD_PREFIXES) {
    if (matchesPrefix(path, prefix)) return 'events';
  }
  for (const prefix of ACADEMY_DASHBOARD_PREFIXES) {
    if (matchesPrefix(path, prefix)) return 'academy';
  }
  if (path === '/dashboard') return 'academy';

  for (const panel of DEPARTMENT_LEARNER_PANELS) {
    if (matchesPrefix(path, panel.href)) return panel.scope as DepartmentSlug;
  }

  // Public department surfaces → that department's panel menu.
  for (const dept of DEPARTMENTS) {
    for (const root of [dept.href, ...(dept.paths ?? [])]) {
      if (matchesPrefix(path, root)) return dept.slug;
    }
  }

  return 'platform';
}

export function learnerPanelForPathname(pathname: string | null | undefined): LearnerPanelDefinition {
  return LEARNER_PANELS[learnerPanelScopeForPathname(pathname)];
}

/**
 * Department brand for the TopBar rail when the learner is inside a panel
 * that still lives under `/dashboard` (academy/events) or a department
 * `…/panel` route. Returns null for platform account routes so the parent
 * kia. lockup stays.
 */
export function learnerDepartmentSlugForPathname(
  pathname: string | null | undefined,
): DepartmentSlug | null {
  const scope = learnerPanelScopeForPathname(pathname);
  return scope === 'platform' ? null : scope;
}
