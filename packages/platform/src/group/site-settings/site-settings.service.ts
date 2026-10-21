import { BadRequestException, Injectable } from '@nestjs/common';
import {
  createDefaultSiteSettings,
  mergeSiteSettings,
  type SiteSettings,
  type SiteTrackSettings,
  type UpdateSiteSettingsDto,
} from '@kia./shared';
import { PrismaService } from '../../prisma/prisma.service';
import type { Prisma } from '../../generated/prisma/client';

const SETTINGS_KEY = 'site';

@Injectable()
export class SiteSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(): Promise<SiteSettings> {
    const row = await this.prisma.siteSetting.findUnique({ where: { key: SETTINGS_KEY } });
    if (!row) {
      const defaults = createDefaultSiteSettings();
      await this.prisma.siteSetting.create({
        data: { key: SETTINGS_KEY, value: defaults as unknown as Prisma.InputJsonValue },
      });
      return defaults;
    }
    return mergeSiteSettings(createDefaultSiteSettings(), row.value as unknown as SiteSettings);
  }

  async update(dto: UpdateSiteSettingsDto): Promise<SiteSettings> {
    const current = await this.get();
    const next = mergeSiteSettings(current, dto);
    this.validate(next);
    await this.prisma.siteSetting.upsert({
      where: { key: SETTINGS_KEY },
      create: { key: SETTINGS_KEY, value: next as unknown as Prisma.InputJsonValue },
      update: { value: next as unknown as Prisma.InputJsonValue },
    });
    return next;
  }

  async replace(settings: SiteSettings): Promise<SiteSettings> {
    this.validate(settings);
    await this.prisma.siteSetting.upsert({
      where: { key: SETTINGS_KEY },
      create: { key: SETTINGS_KEY, value: settings as unknown as Prisma.InputJsonValue },
      update: { value: settings as unknown as Prisma.InputJsonValue },
    });
    return settings;
  }

  private validate(settings: SiteSettings): void {
    if (!settings.general.siteName.trim()) {
      throw new BadRequestException('Site name is required');
    }
    if (settings.pricing.readinessTestCents < 0 || settings.pricing.courseCents < 0) {
      throw new BadRequestException('Prices cannot be negative');
    }
    for (const [slug, price] of Object.entries(settings.pricing.coursePrices ?? {})) {
      if (price < 0) {
        throw new BadRequestException(`Price for course ${slug} cannot be negative`);
      }
    }
    if (!settings.pricing.modulePrices.length) {
      throw new BadRequestException('At least one module price is required');
    }
    if (settings.pricing.modulePrices.some((p) => p < 0)) {
      throw new BadRequestException('Module prices cannot be negative');
    }
    if (
      settings.pricing.bundleDiscountPercent < 0 ||
      settings.pricing.bundleDiscountPercent > 100
    ) {
      throw new BadRequestException('Bundle discount must be between 0 and 100');
    }
    if (!settings.tracks.length) {
      throw new BadRequestException('At least one learning track is required');
    }
    const keys = new Set<string>();
    for (const track of settings.tracks) {
      this.validateTrack(track);
      if (keys.has(track.key)) {
        throw new BadRequestException(`Duplicate track key "${track.key}"`);
      }
      keys.add(track.key);
    }
    if (settings.readiness.passThreshold < 0 || settings.readiness.passThreshold > 100) {
      throw new BadRequestException('Pass threshold must be between 0 and 100');
    }
    if (
      settings.bootcamp.unlockScoreThreshold < 0 ||
      settings.bootcamp.unlockScoreThreshold > 100
    ) {
      throw new BadRequestException('Unlock score threshold must be between 0 and 100');
    }
    if (!settings.bootcamp.unlockCourseSlug.trim()) {
      throw new BadRequestException('Unlock course slug is required');
    }
    if (settings.sms.enabled && settings.sms.provider === 'kavenegar') {
      if (!settings.sms.apiKey.trim()) {
        throw new BadRequestException('Kavenegar API key is required when SMS is enabled');
      }
      if (!settings.sms.template.trim()) {
        throw new BadRequestException(
          'Kavenegar verify template name is required when SMS is enabled',
        );
      }
    }
    if (settings.enamad.enabled) {
      if (!settings.enamad.codeId.trim() || !settings.enamad.code.trim()) {
        throw new BadRequestException('Enamad code id and code are required when enabled');
      }
      if (
        !/^[A-Za-z0-9_-]+$/.test(settings.enamad.codeId) ||
        !/^[A-Za-z0-9_-]+$/.test(settings.enamad.code)
      ) {
        throw new BadRequestException('Enamad id/code contain invalid characters');
      }
    }
  }

  private validateTrack(track: SiteTrackSettings): void {
    if (!track.key.trim()) {
      throw new BadRequestException('Track key is required');
    }
    if (!/^[a-z0-9-]+$/.test(track.key)) {
      throw new BadRequestException(
        `Track key "${track.key}" must be lowercase letters, numbers, or hyphens`,
      );
    }
    if (!track.name.trim()) {
      throw new BadRequestException(`Track "${track.key}" needs a name`);
    }
    if (!track.modules.length) {
      throw new BadRequestException(`Track "${track.key}" needs at least one module`);
    }
  }
}
