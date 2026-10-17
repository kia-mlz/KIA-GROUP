'use client';

import { useMemo } from 'react';
import {
  adminSectionAllowed,
  isStaffRole,
  type AdminAccessSection,
  type AdminSectionPermission,
  type SiteAdminAccessSettings,
} from '@kia./shared';
import { useAuth } from '@/context/AuthProvider';

/**
 * Consume the access the SERVER issued (ADM-1): `AuthUser.adminPanelAccess`
 * is resolved by the backend via `resolveStaffAdminAccess` (user override →
 * custom role matrix → site template) and refreshed from `/auth/me`. This hook
 * performs no local permission derivation — for SUPER_ADMIN the server omits
 * the field, meaning "everything allowed". UI gating only; the API enforces
 * the same rules server-side via AdminAccessGuard.
 */
export function useAdminAccess(): {
  isSuper: boolean;
  isStaff: boolean;
  access: SiteAdminAccessSettings | null;
  can: (key: AdminAccessSection, level?: keyof AdminSectionPermission) => boolean;
} {
  const { user } = useAuth();

  const isSuper = user?.role === 'SUPER_ADMIN';
  // Any non-learner role may open the panel (custom roles are matrix-gated).
  const isStaff = isStaffRole(user?.role);

  const access = useMemo((): SiteAdminAccessSettings | null => {
    if (!isStaff || isSuper) return null;
    // Trust the server-issued matrix verbatim (already normalized backend-side).
    return user?.adminPanelAccess ?? null;
  }, [isStaff, isSuper, user]);

  const can = useMemo(
    () =>
      (key: AdminAccessSection, level: keyof AdminSectionPermission = 'view'): boolean => {
        if (isSuper) return true;
        if (!access) return false;
        return adminSectionAllowed(access, key, level);
      },
    [isSuper, access],
  );

  return { isSuper, isStaff, access, can };
}
