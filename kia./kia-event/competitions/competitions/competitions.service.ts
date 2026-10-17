import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { CompetitionSummary } from '@kia./shared';
import { EventBusService } from '@kia./platform';
import { PrismaService } from '@kia./platform';

@Injectable()
export class CompetitionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventBusService,
  ) {}

  async list(userId?: string): Promise<CompetitionSummary[]> {
    const competitions = await this.prisma.competition.findMany({
      where: { active: true },
      include: userId
        ? { registrations: { where: { userId }, select: { id: true } } }
        : { registrations: false },
      orderBy: { startsAt: 'asc' },
    });

    return competitions.map((competition) => {
      const registrations =
        userId && 'registrations' in competition && Array.isArray(competition.registrations)
          ? competition.registrations
          : [];
      return {
        id: competition.id,
        slug: competition.slug,
        title: competition.title,
        description: competition.description,
        startsAt: competition.startsAt.toISOString(),
        endsAt: competition.endsAt.toISOString(),
        active: competition.active,
        registered: registrations.length > 0,
      };
    });
  }

  async listRegistered(userId: string): Promise<CompetitionSummary[]> {
    const all = await this.list(userId);
    return all.filter((item) => item.registered);
  }

  async register(userId: string, slug: string): Promise<CompetitionSummary> {
    const competition = await this.prisma.competition.findUnique({ where: { slug } });
    if (!competition || !competition.active) {
      throw new NotFoundException(`Competition ${slug} not found`);
    }
    if (competition.endsAt < new Date()) {
      throw new BadRequestException('Competition has ended');
    }

    const existing = await this.prisma.competitionRegistration.findUnique({
      where: {
        userId_competitionId: { userId, competitionId: competition.id },
      },
    });
    if (existing) {
      throw new ConflictException('Already registered');
    }

    try {
      await this.prisma.competitionRegistration.create({
        data: { userId, competitionId: competition.id },
      });
    } catch (err) {
      // Race: two concurrent registrations both pass the findUnique check
      // above; the DB unique constraint (userId, competitionId) is the
      // authoritative single-winner. Translate P2002 into the same clean 409
      // instead of leaking a raw Prisma error as HTTP 500.
      if ((err as { code?: string } | null)?.code === 'P2002') {
        throw new ConflictException('Already registered');
      }
      throw err;
    }

    // Domain event: Events announces the registration so other departments
    // (notifications, community) can react without importing Events services.
    await this.events
      .publish({
        name: 'events.registration.created',
        occurredAt: new Date().toISOString(),
        userId,
        competitionId: competition.id,
        competitionSlug: competition.slug,
      })
      .catch(() => undefined);

    return {
      id: competition.id,
      slug: competition.slug,
      title: competition.title,
      description: competition.description,
      startsAt: competition.startsAt.toISOString(),
      endsAt: competition.endsAt.toISOString(),
      active: competition.active,
      registered: true,
    };
  }
}
