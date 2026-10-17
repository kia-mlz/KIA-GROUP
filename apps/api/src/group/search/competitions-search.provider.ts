import { Injectable } from '@nestjs/common';

import { PrismaService } from '@kia./platform';
import type { SearchHit, SearchableProvider } from './search.types';

/**
 * Events provider: active competitions that have not ended. Ended or inactive
 * competitions never surface in search.
 */
@Injectable()
export class CompetitionsSearchProvider implements SearchableProvider {
  readonly department = 'events' as const;
  readonly type = 'competition';

  constructor(private readonly prisma: PrismaService) {}

  async search(query: string, limit: number): Promise<SearchHit[]> {
    const q = query.trim();
    if (!q) return [];
    const now = new Date();
    const competitions = await this.prisma.competition.findMany({
      where: {
        active: true,
        endsAt: { gt: now },
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, slug: true, title: true, description: true },
      take: limit,
      orderBy: { startsAt: 'asc' },
    });
    return competitions.map((competition) => ({
      department: this.department,
      type: this.type,
      id: competition.id,
      slug: competition.slug,
      title: competition.title,
      description: competition.description ?? null,
      url: '/events',
    }));
  }
}
