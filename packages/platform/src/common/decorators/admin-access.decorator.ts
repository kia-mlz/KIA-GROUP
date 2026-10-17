import { SetMetadata } from '@nestjs/common';
import type { AdminAccessSection, AdminSectionPermission } from '@kia./shared';

export const ADMIN_ACCESS_KEY = 'adminAccess';

export interface AdminAccessRequirement {
  section: AdminAccessSection;
  level: keyof AdminSectionPermission;
}

export const AdminAccess = (
  section: AdminAccessSection,
  level: keyof AdminSectionPermission = 'view',
) => SetMetadata(ADMIN_ACCESS_KEY, { section, level } satisfies AdminAccessRequirement);
