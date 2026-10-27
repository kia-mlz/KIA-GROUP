import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DEPARTMENTS } from '@/components/brand/departments';
import {
  DEPARTMENT_LEARNER_PANELS,
  LEARNER_PANELS,
  learnerDepartmentSlugForPathname,
  learnerPanelScopeForPathname,
} from '@/lib/learnerPanels';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB_SRC = path.join(HERE, '..');
const read = (...parts: string[]) => readFileSync(path.join(WEB_SRC, ...parts), 'utf8');

describe('learner department panels', () => {
  it('defines one panel home for every department plus platform', () => {
    expect(DEPARTMENT_LEARNER_PANELS.map((p) => p.scope)).toEqual(DEPARTMENTS.map((d) => d.slug));
    expect(LEARNER_PANELS.platform.scope).toBe('platform');
    expect(LEARNER_PANELS.academy.href).toBe('/dashboard');
    expect(LEARNER_PANELS.events.href).toBe('/events/panel');
  });

  it('keeps academy overview on /dashboard and events under /events/panel', () => {
    expect(learnerPanelScopeForPathname('/dashboard')).toBe('academy');
    expect(learnerPanelScopeForPathname('/dashboard/my-courses')).toBe('academy');
    expect(learnerPanelScopeForPathname('/dashboard/progress')).toBe('academy');
    expect(learnerPanelScopeForPathname('/courses/html')).toBe('academy');
    expect(learnerPanelScopeForPathname('/events/panel')).toBe('events');
    expect(learnerPanelScopeForPathname('/dashboard/bootcamps')).toBe('events');
    expect(learnerPanelScopeForPathname('/bootcamp/challenge')).toBe('events');
  });

  it('keeps wallet and support on the platform account menu', () => {
    for (const pathName of [
      '/dashboard/finance',
      '/dashboard/purchases',
      '/dashboard/tickets',
      '/dashboard/tickets/new',
      '/dashboard/messages',
      '/dashboard/profile',
      '/dashboard/todos',
    ]) {
      expect(learnerPanelScopeForPathname(pathName), pathName).toBe('platform');
      expect(learnerDepartmentSlugForPathname(pathName), pathName).toBeNull();
    }
  });

  it('brands academy and events dashboard routes for the rail', () => {
    expect(learnerDepartmentSlugForPathname('/dashboard')).toBe('academy');
    expect(learnerDepartmentSlugForPathname('/dashboard/results')).toBe('academy');
    expect(learnerDepartmentSlugForPathname('/events/panel')).toBe('events');
    expect(learnerDepartmentSlugForPathname('/work/panel')).toBe('work');
  });

  it('ships a page for every non-academy department panel home', () => {
    const pages = {
      events: read('app/(events)/events/panel/page.tsx'),
      work: read('app/(work)/work/panel/page.tsx'),
      material: read('app/(material)/material/panel/page.tsx'),
      community: read('app/(community)/community/panel/page.tsx'),
      labs: read('app/(labs)/labs/panel/page.tsx'),
      academyAlias: read('app/(academy)/academy/panel/page.tsx'),
    };
    expect(pages.events).toContain('EventsLearnerPanelPage');
    expect(pages.work).toContain('slug="work"');
    expect(pages.material).toContain('slug="material"');
    expect(pages.community).toContain('slug="community"');
    expect(pages.labs).toContain('slug="labs"');
    expect(pages.academyAlias).toContain("redirect('/dashboard')");
  });

  it('personalizes the legacy dashboard as an Academy-only overview', () => {
    const dashboard = read('app/dashboard/page.tsx');
    expect(dashboard).toContain('EnrolledCourses');
    expect(dashboard).toContain('ProgressChart');
    expect(dashboard).toContain('TestResultsCard');
    expect(dashboard).not.toContain('BootcampCard');
    expect(dashboard).not.toContain('FinancialCard');
    expect(dashboard).toContain('dept--academy');
  });

  it('makes LearnerNav path-aware via the panel registry', () => {
    const nav = read('components/layout/LearnerNav.tsx');
    expect(nav).toContain('learnerPanelScopeForPathname');
    expect(nav).toContain('DEPARTMENT_LEARNER_PANELS');
    expect(nav).toContain('panel.departments.switcher');
  });

  it('keeps other departments out of a department learner menu', () => {
    const nav = read('components/layout/LearnerNav.tsx');
    // Inside a dept: exit to hub only — no switcher listing every panel.
    expect(nav).toContain('panel.departments.backHome');
    expect(nav).toContain('insideDepartment');
    // Switcher of all departments remains on the platform account surface.
    expect(nav).toMatch(/insideDepartment \? \([\s\S]*backHome[\s\S]*\) : \([\s\S]*DEPARTMENT_LEARNER_PANELS/);
  });
});
