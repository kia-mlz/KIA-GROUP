import { Body, Controller, ForbiddenException, Get, Put, UseGuards } from '@nestjs/common';
import {
  toAdminSiteSettings,
  toPublicSiteSettings,
  type AuthUser,
  type SiteSettings,
  type UpdateSiteSettingsDto,
} from '@kia./shared';
import { AdminAccess } from '../../common/decorators/admin-access.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminAccessGuard } from '../../common/guards/admin-access.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UpdateSiteSettingsBodyDto } from './dto/update-site-settings.dto';
import { SiteSettingsService } from './site-settings.service';

@Controller()
export class SiteSettingsController {
  constructor(private readonly siteSettings: SiteSettingsService) {}

  /** Public — landing, checkout, and wizard need current config (secrets redacted). */
  @Get('settings')
  async getPublic(): Promise<SiteSettings> {
    return toPublicSiteSettings(await this.siteSettings.get());
  }

  @Get('admin/settings')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminAccessGuard)
  @Roles('ADMIN')
  @AdminAccess('settings', 'view')
  async getAdmin(@CurrentUser() user: AuthUser): Promise<SiteSettings> {
    const settings = await this.siteSettings.get();
    return toAdminSiteSettings(settings, {
      revealSecrets: user.role === 'SUPER_ADMIN',
    });
  }

  @Put('admin/settings')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminAccessGuard)
  @Roles('ADMIN')
  @AdminAccess('settings', 'manage')
  updateAdmin(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateSiteSettingsBodyDto,
  ): Promise<SiteSettings> {
    if (dto.adminAccess && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only super admins can change admin panel access');
    }
    if (dto.payment && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only super admins can change payment provider settings');
    }
    if (dto.sms && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only super admins can change OTP/SMS provider settings');
    }
    if (dto.enamad && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only super admins can change Enamad settings');
    }
    return this.siteSettings.update(dto as UpdateSiteSettingsDto);
  }
}
