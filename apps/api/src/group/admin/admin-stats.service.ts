import { Injectable } from '@nestjs/common';
import type { AdminStats } from '@kia./shared';
import { PrismaService } from '@kia./platform';

/**
 * Platform dashboard counters (the "Platform" department's only admin module).
 * One flat shape shared by the global dashboard and the Academy panel.
 */
@Injectable()
export class AdminStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(): Promise<AdminStats> {
    const [users, courses, lessons, challenges, activeChallenges, payments, enrollments, revenue] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.course.count(),
        this.prisma.lesson.count(),
        this.prisma.challenge.count(),
        this.prisma.challenge.count({ where: { active: true } }),
        this.prisma.payment.count({ where: { status: 'COMPLETED' } }),
        this.prisma.enrollment.count(),
        this.prisma.payment.aggregate({
          where: { status: 'COMPLETED' },
          _sum: { amountCents: true },
        }),
      ]);

    return {
      users,
      courses,
      lessons,
      enrollments,
      payments,
      revenueCents: revenue._sum.amountCents ?? 0,
      challenges,
      activeChallenges,
    };
  }
}
