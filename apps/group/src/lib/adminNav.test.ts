import { describe, expect, it } from 'vitest';
import type { AdminAccessSection } from '@kia./shared';
import {
  DEPARTMENT_ORDER,
  DEPARTMENT_WORKSPACES,
  PLATFORM_NAV_GROUPS,
  departmentFromAdminPath,
  filterAdminNavGroups,
  flattenAdminNavLeaves,
  isAdminNavActive,
} from './adminNav';

const allowAll = () => true;
const allowNone = () => false;
const onlyView = (section: AdminAccessSection, level: 'view' | 'manage' | 'edit' = 'view') =>
  section === 'users' && level === 'view';

describe('adminNav registry', () => {
  it('lists all six departments in brand order', () => {
    expect(DEPARTMENT_ORDER).toEqual([
      'academy',
      'work',
      'material',
      'events',
      'community',
      'labs',
    ]);
  });

  it('marks only Academy and Events as live workspaces', () => {
    expect(DEPARTMENT_WORKSPACES.academy.live).toBe(true);
    expect(DEPARTMENT_WORKSPACES.events.live).toBe(true);
    expect(DEPARTMENT_WORKSPACES.work.live).toBe(false);
    expect(DEPARTMENT_WORKSPACES.material.live).toBe(false);
    expect(DEPARTMENT_WORKSPACES.community.live).toBe(false);
    expect(DEPARTMENT_WORKSPACES.labs.live).toBe(false);
  });

  it('keeps department tools out of platform groups', () => {
    const hrefs = PLATFORM_NAV_GROUPS.flatMap((group) => group.items.map((item) => item.href));
    expect(hrefs.some((href) => href.startsWith('/admin/academy'))).toBe(false);
    expect(hrefs.some((href) => href.startsWith('/admin/events'))).toBe(false);
    expect(hrefs).toContain('/admin/users');
    expect(hrefs).toContain('/admin/finance');
  });

  it('detects department context from admin paths', () => {
    expect(departmentFromAdminPath('/admin/academy/courses')).toBe('academy');
    expect(departmentFromAdminPath('/admin/events')).toBe('events');
    expect(departmentFromAdminPath('/admin/users')).toBeNull();
  });

  it('matches active nav with exact and prefix rules', () => {
    expect(isAdminNavActive('/admin/academy', '/admin/academy', true)).toBe(true);
    expect(isAdminNavActive('/admin/academy/courses', '/admin/academy', true)).toBe(false);
    expect(isAdminNavActive('/admin/academy/courses/new', '/admin/academy/courses')).toBe(true);
  });

  it('hides create routes unless manage/edit is allowed', () => {
    const groups = filterAdminNavGroups(PLATFORM_NAV_GROUPS, onlyView);
    const leaves = flattenAdminNavLeaves(PLATFORM_NAV_GROUPS, onlyView);
    expect(leaves.every((item) => item.section === 'users')).toBe(true);
    expect(groups.flatMap((group) => group.items).some((item) => item.href.endsWith('/create'))).toBe(
      false,
    );
  });

  it('returns empty groups when nothing is allowed', () => {
    expect(filterAdminNavGroups(PLATFORM_NAV_GROUPS, allowNone)).toEqual([]);
    expect(flattenAdminNavLeaves(PLATFORM_NAV_GROUPS, allowNone)).toEqual([]);
  });

  it('keeps academy course tools when courses are allowed', () => {
    const can = (section: AdminAccessSection) => section === 'courses' || section === 'tests';
    const groups = filterAdminNavGroups(DEPARTMENT_WORKSPACES.academy.groups, can);
    expect(groups[0]?.items.map((item) => item.id)).toContain('courses');
    expect(flattenAdminNavLeaves(DEPARTMENT_WORKSPACES.academy.groups, allowAll).length).toBeGreaterThan(
      0,
    );
  });
});
