import { Injectable } from '@nestjs/common';

import { PrismaService } from '@kia./platform';
import type { SearchHit, SearchableProvider } from './search.types';

/**
 * Academy provider: published, non-coming-soon courses only. Private drafts
 * never surface in search.
 */
@Injectable()
export class CoursesSearchProvider implements SearchableProvider {
  readonly department = 'academy' as const;
  readonly type = 'course';

  constructor(private readonly prisma: PrismaService) {}

  async search(query: string, limit: number): Promise<SearchHit[]> {
    const q = query.trim();
    if (!q) return [];
    const courses = await this.prisma.course.findMany({
      where: {
        published: true,
        comingSoon: false,
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, slug: true, title: true, description: true },
      take: limit,
      orderBy: { title: 'asc' },
    });
    return courses.map((course) => ({
      department: this.department,
      type: this.type,
      id: course.id,
      slug: course.slug,
      title: course.title,
      description: course.description ?? null,
      url: `/courses/${course.slug}`,
    }));
  }
}
