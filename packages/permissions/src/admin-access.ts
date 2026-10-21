/**
 * Admin-panel access model (kia. platform layer).
 *
 * Moved verbatim from `@kia./shared` (types/site-settings.ts) so the
 * authorization model has one home. `shared` re-exports for backwards
 * compatibility.
 *
 * The backend ISSUES the resolved matrix on `AuthUser.adminPanelAccess`; the
 * admin UI must consume the issued matrix, never re-derive it locally (ADM-1).
 */

/** Granular permission flags for a single admin panel section. */
export interface AdminSectionPermission {
  view: boolean;
  manage: boolean;
  edit: boolean;
}

export type AdminAccessSection =
  | 'stats'
  | 'settings'
  | 'courses'
  | 'challenges'
  | 'users'
  | 'payments'
  | 'discounts'
  | 'tests'
  | 'tickets'
  | 'messages'
  | 'competitions'
  | 'audit';

/** What regular ADMIN users may access. SUPER_ADMIN always has full access. */
export type SiteAdminAccessSettings = Record<AdminAccessSection, AdminSectionPermission>;

export function createSectionPermission(
  view = false,
  manage = false,
  edit = false,
): AdminSectionPermission {
  return { view, manage, edit };
}

/** Normalize legacy boolean flags or partial objects from persisted settings. */
export function normalizeAdminSectionPermission(value: unknown): AdminSectionPermission {
  if (typeof value === 'boolean') {
    return createSectionPermission(value, value, value);
  }
  if (value && typeof value === 'object') {
    const v = value as Partial<AdminSectionPermission>;
    return {
      view: Boolean(v.view),
      manage: Boolean(v.manage),
      edit: Boolean(v.edit),
    };
  }
  return createSectionPermission(false, false, false);
}

export function normalizeAdminAccess(raw: unknown): SiteAdminAccessSettings {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    stats: normalizeAdminSectionPermission(source.stats),
    settings: normalizeAdminSectionPermission(source.settings),
    courses: normalizeAdminSectionPermission(source.courses),
    challenges: normalizeAdminSectionPermission(source.challenges),
    users: normalizeAdminSectionPermission(source.users),
    payments: normalizeAdminSectionPermission(source.payments),
    discounts: normalizeAdminSectionPermission(source.discounts),
    tests: normalizeAdminSectionPermission(source.tests),
    tickets: normalizeAdminSectionPermission(source.tickets),
    messages: normalizeAdminSectionPermission(source.messages),
    competitions: normalizeAdminSectionPermission(source.competitions),
    audit: normalizeAdminSectionPermission(source.audit),
  };
}

export function adminSectionAllowed(
  access: SiteAdminAccessSettings,
  section: AdminAccessSection,
  level: keyof AdminSectionPermission = 'view',
): boolean {
  return Boolean(access[section]?.[level]);
}

/** Resolve effective permissions for a moderator (ADMIN) account. */
export function resolveModeratorAdminAccess(
  userAccess: unknown,
  siteTemplate: SiteAdminAccessSettings,
): SiteAdminAccessSettings {
  if (userAccess != null && typeof userAccess === 'object') {
    return normalizeAdminAccess(userAccess);
  }
  return normalizeAdminAccess(siteTemplate);
}

/**
 * Resolve the effective admin-panel permissions for ANY staff role (ADM-1):
 * per-user override wins, then a custom role's own access matrix, then the
 * site template. This is the single rule the backend uses to ISSUE access —
 * the admin UI must consume the issued matrix, never re-derive it locally.
 */
export function resolveStaffAdminAccess(
  userAccess: unknown,
  roleAccess: unknown,
  siteTemplate: SiteAdminAccessSettings,
): SiteAdminAccessSettings {
  if (userAccess != null && typeof userAccess === 'object') {
    return normalizeAdminAccess(userAccess);
  }
  if (roleAccess != null && typeof roleAccess === 'object') {
    return normalizeAdminAccess(roleAccess);
  }
  return normalizeAdminAccess(siteTemplate);
}
