import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AdminChallenge,
  AdminCompetition,
  AdminCompetitionRegistration,
  AuthUser,
} from '@kia./shared';
import { PrismaService } from '@kia./platform';
import {
  AdminCreateChallengeDto,
  AdminCreateCompetitionDto,
  AdminUpdateChallengeDto,
  AdminUpdateCompetitionDto,
} from './dto/admin.dto';
import type { AdminRequestMeta } from './admin-types';
import { AdminAuditService } from './audit.service';

/**
 * KIA Event department — challenges (bootcamps) and competitions.
 * Moved verbatim out of the former god-service; behaviour is unchanged.
 */
@Injectable()
export class AdminEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  /* --- Challenges ------------------------------------------------------------ */

  async listChallenges(): Promise<AdminChallenge[]> {
    const challenges = await this.prisma.challenge.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return challenges.map((challenge) => this.toAdminChallenge(challenge));
  }

  async createChallenge(
    dto: AdminCreateChallengeDto,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminChallenge> {
    const existing = await this.prisma.challenge.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(`Challenge slug "${dto.slug}" already exists`);
    }

    const challenge = await this.prisma.challenge.create({
      data: {
        slug: dto.slug,
        title: dto.title,
        description: dto.description,
        points: dto.points ?? 120,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        active: dto.active ?? true,
        starterCode: dto.starterCode ?? '',
      },
    });

    await this.audit.record({
      actor,
      action: 'challenge.create',
      section: 'challenges',
      entityType: 'Challenge',
      entityId: challenge.id,
      target: challenge.title,
      after: { slug: challenge.slug, points: challenge.points },
      ...requestMeta,
    });

    return this.toAdminChallenge(challenge);
  }

  async updateChallenge(
    slug: string,
    dto: AdminUpdateChallengeDto,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminChallenge> {
    const challenge = await this.ensureChallengeBySlug(slug);

    if (dto.slug && dto.slug !== challenge.slug) {
      const conflict = await this.prisma.challenge.findFirst({
        where: { slug: dto.slug, NOT: { id: challenge.id } },
      });
      if (conflict) {
        throw new ConflictException(`Challenge slug "${dto.slug}" already exists`);
      }
    }

    const updated = await this.prisma.challenge.update({
      where: { id: challenge.id },
      data: {
        slug: dto.slug,
        title: dto.title,
        description: dto.description,
        points: dto.points,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        active: dto.active,
        starterCode: dto.starterCode,
      },
    });

    await this.audit.record({
      actor,
      action: 'challenge.update',
      section: 'challenges',
      entityType: 'Challenge',
      entityId: challenge.id,
      target: updated.title,
      before: { slug: challenge.slug, active: challenge.active, points: challenge.points },
      after: { slug: updated.slug, active: updated.active, points: updated.points },
      ...requestMeta,
    });

    return this.toAdminChallenge(updated);
  }

  async deleteChallenge(
    slug: string,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<{ deleted: true }> {
    const challenge = await this.ensureChallengeBySlug(slug);
    await this.prisma.challenge.delete({ where: { id: challenge.id } });
    await this.audit.record({
      actor,
      action: 'challenge.delete',
      section: 'challenges',
      entityType: 'Challenge',
      entityId: challenge.id,
      target: challenge.title,
      before: { slug: challenge.slug },
      ...requestMeta,
    });
    return { deleted: true };
  }

  private async ensureChallengeBySlug(slug: string) {
    const challenge = await this.prisma.challenge.findUnique({
      where: { slug },
    });
    if (!challenge) {
      throw new NotFoundException(`Challenge ${slug} not found`);
    }
    return challenge;
  }

  private toAdminChallenge(challenge: {
    id: string;
    slug: string;
    title: string;
    description: string;
    points: number;
    startsAt: Date;
    endsAt: Date;
    active: boolean;
    starterCode: string;
  }): AdminChallenge {
    return {
      id: challenge.id,
      slug: challenge.slug,
      title: challenge.title,
      description: challenge.description,
      points: challenge.points,
      startsAt: challenge.startsAt.toISOString(),
      endsAt: challenge.endsAt.toISOString(),
      active: challenge.active,
      starterCode: challenge.starterCode,
    };
  }

  /* --- Competitions ----------------------------------------------------------- */

  async listCompetitions(): Promise<AdminCompetition[]> {
    const competitions = await this.prisma.competition.findMany({
      include: { _count: { select: { registrations: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return competitions.map((competition) => ({
      id: competition.id,
      slug: competition.slug,
      title: competition.title,
      description: competition.description,
      startsAt: competition.startsAt.toISOString(),
      endsAt: competition.endsAt.toISOString(),
      active: competition.active,
      registrationCount: competition._count.registrations,
      createdAt: competition.createdAt.toISOString(),
    }));
  }

  async createCompetition(
    dto: AdminCreateCompetitionDto,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminCompetition> {
    const existing = await this.prisma.competition.findUnique({ where: { slug: dto.slug } });
    if (existing) {
      throw new ConflictException(`Competition slug "${dto.slug}" already exists`);
    }
    const competition = await this.prisma.competition.create({
      data: {
        slug: dto.slug,
        title: dto.title,
        description: dto.description,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        active: dto.active ?? true,
      },
    });
    await this.audit.record({
      actor,
      action: 'competition.create',
      section: 'competitions',
      entityType: 'Competition',
      entityId: competition.id,
      target: competition.title,
      after: { slug: competition.slug, active: competition.active },
      ...requestMeta,
    });
    return {
      id: competition.id,
      slug: competition.slug,
      title: competition.title,
      description: competition.description,
      startsAt: competition.startsAt.toISOString(),
      endsAt: competition.endsAt.toISOString(),
      active: competition.active,
      registrationCount: 0,
      createdAt: competition.createdAt.toISOString(),
    };
  }

  async updateCompetition(
    id: string,
    dto: AdminUpdateCompetitionDto,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminCompetition> {
    const competition = await this.prisma.competition.findUnique({ where: { id } });
    if (!competition) {
      throw new NotFoundException(`Competition ${id} not found`);
    }
    if (dto.slug && dto.slug !== competition.slug) {
      const existing = await this.prisma.competition.findUnique({ where: { slug: dto.slug } });
      if (existing) {
        throw new ConflictException(`Competition slug "${dto.slug}" already exists`);
      }
    }
    const updated = await this.prisma.competition.update({
      where: { id },
      data: {
        slug: dto.slug ?? undefined,
        title: dto.title ?? undefined,
        description: dto.description ?? undefined,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        active: dto.active ?? undefined,
      },
      include: { _count: { select: { registrations: true } } },
    });
    await this.audit.record({
      actor,
      action: 'competition.update',
      section: 'competitions',
      entityType: 'Competition',
      entityId: id,
      target: updated.title,
      before: {
        active: competition.active,
        startsAt: competition.startsAt,
        endsAt: competition.endsAt,
      },
      after: { active: updated.active, startsAt: updated.startsAt, endsAt: updated.endsAt },
      ...requestMeta,
    });
    return {
      id: updated.id,
      slug: updated.slug,
      title: updated.title,
      description: updated.description,
      startsAt: updated.startsAt.toISOString(),
      endsAt: updated.endsAt.toISOString(),
      active: updated.active,
      registrationCount: updated._count.registrations,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async deleteCompetition(
    id: string,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<void> {
    const competition = await this.prisma.competition.findUnique({ where: { id } });
    if (!competition) {
      throw new NotFoundException(`Competition ${id} not found`);
    }
    await this.prisma.competition.delete({ where: { id } });
    await this.audit.record({
      actor,
      action: 'competition.delete',
      section: 'competitions',
      entityType: 'Competition',
      entityId: id,
      target: competition.title,
      before: { slug: competition.slug },
      ...requestMeta,
    });
  }

  async listCompetitionRegistrations(id: string): Promise<AdminCompetitionRegistration[]> {
    const competition = await this.prisma.competition.findUnique({ where: { id } });
    if (!competition) {
      throw new NotFoundException(`Competition ${id} not found`);
    }
    const registrations = await this.prisma.competitionRegistration.findMany({
      where: { competitionId: id },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return registrations.map((registration) => ({
      id: registration.id,
      userId: registration.user.id,
      userName: registration.user.name,
      userEmail: registration.user.email,
      createdAt: registration.createdAt.toISOString(),
    }));
  }
}
