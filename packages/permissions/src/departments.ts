/**
 * Department taxonomy for the kia. authorization model.
 *
 * The platform has one identity per user and six departments. This module is
 * the canonical vocabulary for department-scoped roles (so every department —
 * and every future department app — spells its roles the same way and reads
 * them from one place instead of scattering string literals).
 *
 * STATUS: vocabulary + helpers. Department memberships are not persisted yet
 * (the platform has no per-department membership table; the current
 * authorization surface is the platform roles above plus the moderator access
 * matrix in `admin-access.ts`). When department membership lands, its storage
 * MUST key departments by these slugs and roles by these keys — do not invent
 * a second vocabulary.
 */

export const DEPARTMENT_KEYS = [
  'academy',
  'work',
  'material',
  'labs',
  'events',
  'community',
] as const;

export type DepartmentKey = (typeof DEPARTMENT_KEYS)[number];

/** Department-scoped roles per department, in the department's own language. */
export const DEPARTMENT_ROLES: Readonly<Record<DepartmentKey, readonly string[]>> = Object.freeze({
  academy: ['ACADEMY_ADMIN', 'INSTRUCTOR', 'STUDENT'],
  work: ['WORK_ADMIN', 'EMPLOYER', 'FREELANCER', 'RECRUITER'],
  material: ['MATERIAL_ADMIN', 'CONTRIBUTOR', 'CURATOR'],
  labs: ['LABS_ADMIN', 'RESEARCHER', 'DEVELOPER', 'MAINTAINER'],
  events: ['EVENTS_ADMIN', 'ORGANIZER', 'SPEAKER', 'JUDGE', 'PARTICIPANT'],
  community: ['COMMUNITY_ADMIN', 'MODERATOR', 'MEMBER'],
});

/** Every department role key, flattened (for validation and admin pickers). */
export const ALL_DEPARTMENT_ROLES: readonly string[] = Object.freeze(
  DEPARTMENT_KEYS.flatMap((dept) => DEPARTMENT_ROLES[dept]),
);

/** True when `role` is a known role of `department`. */
export function isDepartmentRole(department: DepartmentKey, role: string): boolean {
  return DEPARTMENT_ROLES[department].includes(role);
}

/** The department that owns `role`, if any. */
export function departmentOfRole(role: string): DepartmentKey | null {
  for (const dept of DEPARTMENT_KEYS) {
    if (DEPARTMENT_ROLES[dept].includes(role)) return dept;
  }
  return null;
}
