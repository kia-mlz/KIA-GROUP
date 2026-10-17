import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { RoadmapResponse } from '@kia./shared';
import { buildRoadmapFromAnswers } from '@kia./shared';
import { AssessmentsService } from '../assessments/assessments.service';
import { PrismaService } from '@kia./platform';
import type { Prisma } from '@kia./platform';
import { SiteSettingsService } from '@kia./platform';
import { CreateRoadmapDto } from './dto/create-roadmap.dto';

@Injectable()
export class RoadmapsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly siteSettings: SiteSettingsService,
    private readonly assessmentsService: AssessmentsService,
  ) {}

  async create(dto: CreateRoadmapDto, userId: string): Promise<RoadmapResponse> {
    let assessmentId = dto.assessmentId;
    if (assessmentId) {
      const existing = await this.prisma.assessment.findFirst({
        where: { id: assessmentId, userId },
      });
      if (!existing) {
        throw new NotFoundException(`Assessment ${assessmentId} not found`);
      }
    } else {
      const assessment = await this.assessmentsService.create({ answers: dto.answers }, userId);
      assessmentId = assessment.id;
    }
    const settings = await this.siteSettings.get();
    const built = buildRoadmapFromAnswers(dto.answers, false, 'local', {
      tracks: settings.tracks,
      pricing: {
        modulePrices: settings.pricing.modulePrices,
        bundleDiscountPercent: settings.pricing.bundleDiscountPercent,
      },
    });

    const record = await this.prisma.roadmap.create({
      data: {
        userId,
        assessmentId,
        trackKey: built.trackKey,
        trackName: built.trackName,
        modules: built.modules,
        level: built.level,
        profile: built.profile,
        pricing: built.pricing,
        enrolled: false,
      },
    });

    return this.toResponse(record);
  }

  async findOne(id: string, userId: string): Promise<RoadmapResponse> {
    const record = await this.prisma.roadmap.findFirst({
      where: { id, userId },
    });
    if (!record) {
      throw new NotFoundException(`Roadmap ${id} not found`);
    }
    return this.toResponse(record);
  }

  async enroll(id: string, userId: string): Promise<RoadmapResponse> {
    const existing = await this.prisma.roadmap.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Roadmap ${id} not found`);
    }
    if (existing.userId !== userId) {
      throw new NotFoundException(`Roadmap ${id} not found`);
    }

    const entitlement = await this.prisma.entitlement.findFirst({
      where: {
        userId,
        resourceType: 'roadmap',
        resourceId: id,
      },
    });
    if (!entitlement) {
      throw new ForbiddenException('Purchase the roadmap bundle to enroll');
    }

    const record = await this.prisma.roadmap.update({
      where: { id },
      data: { enrolled: true },
    });

    return this.toResponse(record);
  }

  private toResponse(record: {
    id: string;
    trackKey: string;
    trackName: string;
    modules: Prisma.JsonValue;
    level: string;
    profile: Prisma.JsonValue;
    pricing: Prisma.JsonValue;
    enrolled: boolean;
  }): RoadmapResponse {
    return {
      id: record.id,
      trackKey: record.trackKey as RoadmapResponse['trackKey'],
      trackName: record.trackName,
      modules: record.modules as unknown as string[],
      level: record.level,
      profile: record.profile as RoadmapResponse['profile'],
      pricing: record.pricing as RoadmapResponse['pricing'],
      enrolled: record.enrolled,
    };
  }
}
