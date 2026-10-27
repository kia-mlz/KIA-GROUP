import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEPARTMENTS, type DepartmentSlug } from '@/components/brand/departments';
import {
  departmentEntryPoints,
  hasDepartmentMetrics,
} from '@/lib/adminDepartments';
import {
  ADMIN_ROOT,
  DEPARTMENT_WORKSPACES,
  PLATFORM_NAV_GROUPS,
  flattenAdminNavLeaves,
} from '@/lib/adminNav';
import { en, fa } from '@/i18n/messages';
import { createTranslator } from '@/i18n/translate';

/**
 * Departments hub + admin navigation wiring.
 *
 * Pins: every nav href resolves to a real page; hub cards come from DEPARTMENTS;
 * endpoint calls stay permission-gated; empty departments stay honest.
 */

const ADMIN_DIR = __dirname;
const NAV = readFileSync(path.join(ADMIN_DIR, '../../lib/adminNav.ts'), 'utf8');
const HUB = readFileSync(path.join(ADMIN_DIR, 'departments', 'page.tsx'), 'utf8');
const SHELL = readFileSync(path.join(ADMIN_DIR, 'AdminLayoutClient.tsx'), 'utf8');

const tEn = createTranslator(en, en);
const tFa = createTranslator(fa, fa);

/** Every route the admin panel can render, read from the filesystem. */
function collectRoutes(dir: string, route = '/admin'): string[] {
  const routes: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name.startsWith('[')) continue;
      const next = entry.name.startsWith('(') ? route : `${route}/${entry.name}`;
      routes.push(...collectRoutes(path.join(dir, entry.name), next));
      continue;
    }
    if (entry.name === 'page.tsx') routes.push(route);
  }
  return routes;
}

const routes = new Set(collectRoutes(ADMIN_DIR));
const allowAll = () => true;
const navHrefs = [
  ADMIN_ROOT.overview.href,
  ADMIN_ROOT.departments.href,
  ...flattenAdminNavLeaves(PLATFORM_NAV_GROUPS, allowAll).map((item) => item.href),
  ...Object.values(DEPARTMENT_WORKSPACES).flatMap((workspace) =>
    flattenAdminNavLeaves(workspace.groups, allowAll).map((item) => item.href),
  ),
];

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
    expect(SHELL).toContain('ADMIN_ROOT');
    expect(SHELL).toContain('from \'@/lib/adminNav\'');
    const overviewIdx = NAV.indexOf("overview: { href: '/admin'");
    const departmentsIdx = NAV.indexOf("departments: { href: '/admin/departments'");
    expect(overviewIdx).toBeGreaterThan(-1);
    expect(departmentsIdx).toBeGreaterThan(overviewIdx);
  });

  it('scopes shell chrome (palette / quick-create / title) to the active workspace', () => {
    expect(SHELL).toContain('scopedAdminNavLeaves');
    expect(SHELL).toContain('scopedQuickCreateLeaves');
    expect(SHELL).toContain('contextLeaves');
    expect(SHELL).toContain('accessibleLeaves');
    // Department rail stays hidden inside a workspace.
    expect(SHELL).toContain('{!workspace ? (');
    expect(SHELL).toContain('am-depts');
  });
});

describe('departments hub', () => {
  it('builds its cards from the one department registry', () => {
    expect(HUB).toContain("from '@/components/brand/departments'");
    expect(HUB).toContain('DEPARTMENTS.map');
    expect(HUB).toContain('dept--${department.slug}');
  });

  it('does not hard-code a department name of its own', () => {
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
      if (!section) return true;
      return !HUB.includes(`can('${section}')`);
    });
    expect(ungated).toEqual([]);
  });

  it('keeps the empty state honest for departments without an admin module', () => {
    expect(HUB).toContain('admin.departments.noModule');
    expect(HUB).toContain('admin.departments.noModuleHint');
  });

  it('routes into department workspaces from the hub', () => {
    expect(HUB).toContain('DEPARTMENT_WORKSPACES');
    expect(HUB).toContain('admin.departments.enterWorkspace');
  });
});

describe('departments hub gating for a restricted moderator', () => {
  const onlyCourses = (section: string) => section === 'courses';
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
