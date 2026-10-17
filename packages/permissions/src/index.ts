/**
 * kia. permission model.
 *
 * One identity across the ecosystem; platform roles gate the panel, the
 * per-moderator access matrix gates sections, and the department taxonomy is
 * the canonical vocabulary for department-scoped roles.
 */
export {
  SYSTEM_ROLES,
  isStaffRole,
  isSuperAdmin,
} from './roles';
export type { SystemRole, UserRole } from './roles';

export {
  adminSectionAllowed,
  createSectionPermission,
  normalizeAdminAccess,
  normalizeAdminSectionPermission,
  resolveModeratorAdminAccess,
  resolveStaffAdminAccess,
} from './admin-access';
export type {
  AdminAccessSection,
  AdminSectionPermission,
  SiteAdminAccessSettings,
} from './admin-access';

export {
  ALL_DEPARTMENT_ROLES,
  DEPARTMENT_KEYS,
  DEPARTMENT_ROLES,
  departmentOfRole,
  isDepartmentRole,
} from './departments';
export type { DepartmentKey } from './departments';
