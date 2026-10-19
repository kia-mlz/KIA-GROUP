import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEPARTMENTS, type DepartmentSlug } from '@/components/brand/departments';
import {
  departmentEntryPoints,
  hasDepartmentMetrics,
} from '@/lib/adminDepartments';
import { en, fa } from '@/i18n/messages';
import { createTranslator } from '@/i18n/translate';

/**
 * Departments hub + admin navigation wiring.
 *
 * Three failure modes this pins down:
 *
 * 1. A sidebar entry that points at a route nobody built. Every `href` the
 *    panel offers is resolved against the real `page.tsx` files on disk, so a
 *    renamed or deleted page cannot leave a dead destination behind.
 * 2. A department that exists in the brand registry but has no copy or no
 *    management entry point, so the hub would render a nameless card or a
 *    generic label.
 * 3. An admin fetch on the hub that is not gated by the same permission the
 *    API guards it with. The page must ask `can('<section>')` before calling a
 *    section's endpoint — UI gating is not authorization, but an ungated call
 *    turns a 403 into an empty card that looks like real data.
 */

const ADMIN_DIR = __dirname;
const SIDEBAR = readFileSync(path.join(ADMIN_DIR, 'AdminLayoutClient.tsx'), 'utf8');
const HUB = readFileSync(path.join(ADMIN_DIR, 'departments', 'page.tsx'), 'utf8');

const tEn = createTranslator(en, en);
const tFa = createTranslator(fa, fa);

/** Every route the admin panel can render, read from the filesystem. */
function collectRoutes(dir: string, route = '/admin'): string[] {
  const routes: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      // Dynamic segments (`[slug]`) are detail pages, never nav destinations.
      if (entry.name.startsWith('[')) continue;
      // Route groups `(name)` do not appear in the URL.
      const next = entry.name.startsWith('(') ? route : `${route}/${entry.name}`;
      routes.push(...collectRoutes(path.join(dir, entry.name), next));
      continue;
    }
    if (entry.name === 'page.tsx') routes.push(route);
  }
  return routes;
}

const routes = new Set(collectRoutes(ADMIN_DIR));
const navHrefs = [...SIDEBAR.matchAll(/href: '(\/admin[^']*)'/g)].map((match) => match[1]);

/** Which section guards each admin endpoint the hub is allowed to call. */
const ENDPOINT_SECTIONS: Record<string, string> = {
  adminStats: 'stats',
  adminListCourses: 'courses',
  adminListChallenges: 'challenges',
  adminListCompetitions: 'competitions',
};

describe('admin navigation destinations', () => {
  it('offers far more than a couple of destinations', () => {
    expect(navHrefs.length).toBeGreaterThan(10);
  });

  it('points every sidebar entry at a page that exists', () => {
    const missing = navHrefs.filter((href) => !routes.has(href));
    expect(missing).toEqual([]);
  });

  it('puts the departments hub in the navigation, right after the overview', () => {
    expect(navHrefs).toContain('/admin/departments');
    const dashboard = SIDEBAR.indexOf("href: '/admin',");
    const departments = SIDEBAR.indexOf("href: '/admin/departments',");
    expect(dashboard).toBeGreaterThan(-1);
    expect(departments).toBeGreaterThan(dashboard);
  });
});

describe('departments hub', () => {
  it('builds its cards from the one department registry', () => {
    expect(HUB).toContain("from '@/components/brand/departments'");
    expect(HUB).toContain('DEPARTMENTS.map');
    // One card per registered department, wearing the department's own token.
    expect(HUB).toContain('dept--${department.slug}');
  });

  it('does not hard-code a department name of its own', () => {
    // Names come from `dashboard.doors.*Title`; a second spelling here is how
    // the rail and the hub start disagreeing.
    expect(HUB).not.toMatch(/KIA\.? (Academy|Work|Material|Labs|Events|Community)/);
    expect(HUB).toContain('t(department.titleKey)');
  });

  it('describes and links every department in both languages', () => {
    const problems: string[] = [];
    for (const department of DEPARTMENTS) {
      const name = tEn(department.titleKey);
      const nameFa = tFa(department.titleKey);
      if (name === department.titleKey) problems.push(`en name ${department.titleKey}`);
      if (nameFa === department.titleKey) problems.push(`fa name ${department.titleKey}`);

      const key = `admin.departments.${department.slug}.desc`;
      const english = tEn(key);
      const persian = tFa(key);
      if (english === key) problems.push(`en ${key}`);
      if (persian === key) problems.push(`fa ${key}`);
      if (english && english === persian) problems.push(`untranslated ${key}`);
    }
    expect(problems).toEqual([]);
  });

  it('gates every endpoint it calls behind that section permission', () => {
    const called = [...HUB.matchAll(/\bapi\.([A-Za-z]+)\(/g)].map((match) => match[1]);
    expect(called.length).toBeGreaterThan(0);

    const ungated = called.filter((method) => {
      const section = ENDPOINT_SECTIONS[method];
      // A new endpoint must be added to the table above, with its real section.
      if (!section) return true;
      return !HUB.includes(`can('${section}')`);
    });
    expect(ungated).toEqual([]);
  });

  it('keeps the empty state honest for departments without an admin module', () => {
    // Work / Material / Community / Labs have no admin module yet; the hub says
    // so instead of showing zeros that read as "no data".
    expect(HUB).toContain('admin.departments.noModule');
    expect(HUB).toContain('admin.departments.noModuleHint');
  });
});

/**
 * Restricted-moderator card behaviour, asserted against the real gating
 * functions the page ships with — not against the source text.
 */
describe('departments hub gating for a restricted moderator', () => {
  /** A moderator who may only touch courses: no competitions, no challenges. */
  const onlyCourses = (section: string) => section === 'courses';
  /** A moderator with a single unrelated section open. */
  const onlyTickets = (section: string) => section === 'tickets';

  it('offers Academy its courses module when only courses is open', () => {
    const entryPoints = departmentEntryPoints('academy', onlyCourses);
    expect(entryPoints.map((entry) => entry.href)).toEqual(['/admin/academy/courses']);
  });

  it('renders no Events entry points to a moderator without those sections', () => {
    expect(departmentEntryPoints('events', onlyCourses)).toEqual([]);
  });

  it('never invents an entry point for a department that owns no module', () => {
    for (const slug of ['work', 'material', 'community', 'labs'] as DepartmentSlug[]) {
      // A permissive `can` still yields nothing: the modules genuinely do not exist.
      expect(departmentEntryPoints(slug, () => true)).toEqual([]);
      expect(hasDepartmentMetrics(slug)).toBe(false);
    }
  });

  it('only Academy and Events can show numbers at all', () => {
    const withNumbers = DEPARTMENTS.filter((department) =>
      hasDepartmentMetrics(department.slug),
    ).map((department) => department.slug);
    expect(withNumbers).toEqual(['academy', 'events']);
  });

  it('offers nothing to an admin who may open no relevant section', () => {
    for (const department of DEPARTMENTS) {
      expect(departmentEntryPoints(department.slug, onlyTickets)).toEqual([]);
    }
  });
});
