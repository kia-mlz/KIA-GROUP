import { Injectable } from '@nestjs/common';
import {
  adminSectionAllowed,
  normalizeAdminAccess,
  resolveStaffAdminAccess,
  type AuthUser,
  type SiteAdminAccessSettings,
} from '@kia./shared';
import { PrismaService } from '../prisma/prisma.service';
import { SiteSettingsService } from '../group/site-settings/site-settings.service';

@Injectable()
export class ModeratorAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly siteSettings: SiteSettingsService,
  ) {}

  async getEffectiveAccess(user: AuthUser): Promise<SiteAdminAccessSettings | null> {
    if (user.role === 'SUPER_ADMIN') {
      return null;
    }
    if (user.role === 'LEARNER') {
      return normalizeAdminAccess({});
    }
    const settings = await this.siteSettings.get();
    const [row, roleRow] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: user.id },
        select: { adminPanelAccess: true },
      }),
      // Custom roles resolve from their own matrix before the site template.
      user.role !== 'ADMIN'
        ? this.prisma.role.findUnique({ where: { key: user.role } })
        : Promise.resolve(null),
    ]);
    // ADM-1: identical resolution to buildAuthUser (user → role → template).
    return resolveStaffAdminAccess(row?.adminPanelAccess, roleRow?.access, settings.adminAccess);
  }

  async assertAllowed(
    user: AuthUser,
    section: Parameters<typeof adminSectionAllowed>[1],
    level: Parameters<typeof adminSectionAllowed>[2] = 'view',
  ): Promise<boolean> {
    if (user.role === 'SUPER_ADMIN') {
      return true;
    }
    const access = await this.getEffectiveAccess(user);
    if (!access) {
      return true;
    }
    return adminSectionAllowed(access, section, level);
  }
}
