/**
 * Platform roles (kia. identity layer).
 *
 * One identity spans all six departments. These roles live at the platform
 * level — department-scoped roles come from `departments.ts` and the
 * per-moderator access matrix comes from `admin-access.ts`.
 *
 * Moved verbatim from `@kia./shared` so the permission model has one
 * home; `shared` re-exports for backwards compatibility.
 */

export const SYSTEM_ROLES = ['LEARNER', 'ADMIN', 'SUPER_ADMIN'] as const;

export type SystemRole = (typeof SYSTEM_ROLES)[number];

/**
 * Known system roles plus dynamic custom roles created in the admin panel
 * (any non-empty string key backed by a `Role` record).
 */
export type UserRole = SystemRole | (string & {});

/** Any non-learner role can open the admin panel (custom roles are matrix-gated). */
export function isStaffRole(role: UserRole | undefined | null): boolean {
  return Boolean(role) && role !== 'LEARNER';
}

/** True when the account may bypass the admin access matrix entirely. */
export function isSuperAdmin(role: UserRole | undefined | null): boolean {
  return role === 'SUPER_ADMIN';
}
