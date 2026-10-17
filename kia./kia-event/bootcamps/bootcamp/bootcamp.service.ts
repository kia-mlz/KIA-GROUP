import { Injectable } from '@nestjs/common';
import type { BootcampChallengeSummary, BootcampState, LeaderboardEntry } from '@kia./shared';
import { PrismaService } from '@kia./platform';

@Injectable()
export class BootcampService {
  constructor(private readonly prisma: PrismaService) {}

  async getLeaderboard(userId?: string): Promise<LeaderboardEntry[]> {
    const profiles = await this.prisma.bootcampProfile.findMany({
      orderBy: { points: 'desc' },
      take: 20,
      include: { user: { select: { name: true } } },
    });

    const leaderboard: LeaderboardEntry[] = profiles.map((profile, index) => ({
      rank: index + 1,
      name: profile.user.name || 'Anonymous',
      score: profile.points,
      isMe: userId ? profile.userId === userId : false,
    }));

    return leaderboard;
  }

  async getState(userId: string): Promise<BootcampState> {
    let rank = 1;
    let points = 0;

    const [profile, challenges] = await Promise.all([
      this.prisma.bootcampProfile.findUnique({ where: { userId } }),
      this.prisma.challenge.findMany({
        orderBy: { startsAt: 'desc' },
        take: 8,
      }),
    ]);

    if (profile) {
      rank = profile.rank;
      points = profile.points;
    }

    const now = Date.now();
    const mapped: BootcampChallengeSummary[] = challenges.map((challenge) => {
      const start = challenge.startsAt.getTime();
      const end = challenge.endsAt.getTime();
      let status: BootcampChallengeSummary['status'] = 'ended';
      if (challenge.active && now >= start && now <= end) status = 'active';
      else if (challenge.active && now < start) status = 'open';
      else if (challenge.active && now > end) status = 'ended';
      else if (!challenge.active && now < start) status = 'open';

      return {
        id: challenge.id,
        slug: challenge.slug,
        title: challenge.title,
        startsAt: challenge.startsAt.toISOString(),
        endsAt: challenge.endsAt.toISOString(),
        status,
        points: challenge.points,
      };
    });

    const active = mapped.find((c) => c.status === 'active');
    const cardTimerSeconds = active
      ? Math.max(0, Math.floor((new Date(active.endsAt).getTime() - now) / 1000))
      : 2 * 3600 + 14 * 60 + 8;

    const leaderboard = await this.getLeaderboard(userId);

    return {
      rank,
      points,
      leaderboard,
      cardTimerSeconds,
      challenges: mapped,
    };
  }
}
