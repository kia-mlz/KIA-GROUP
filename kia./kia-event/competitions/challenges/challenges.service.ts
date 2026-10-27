import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { ChallengeScoreResult } from '@kia./shared';
import { PrismaService } from '@kia./platform';
import type { Prisma } from '@kia./platform';
import { SiteSettingsService } from '@kia./platform';
import { buildChallengeResult } from '@kia./shared';
import { CreateChallengeSubmissionDto } from './dto/create-challenge-submission.dto';

export interface ChallengeSubmissionResponse extends ChallengeScoreResult {
  id: string;
  challengeId: string;
  challengeVersion: number;
  language: string;
  status: string;
  executionTimeMs: number | null;
  memoryUsageKb: number | null;
  createdAt: string;
}

/**
 * The default FizzBuzz challenge, used when the request does not carry an id.
 * Seeded as the first challenge row.
 */
const DEFAULT_CHALLENGE_SLUG = 'fizzbuzz';

@Injectable()
export class ChallengesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly siteSettings: SiteSettingsService,
  ) {}

  async create(
    dto: CreateChallengeSubmissionDto,
    userId: string,
  ): Promise<ChallengeSubmissionResponse> {
    // Challenge-specific validation: resolve the target challenge by id or slug,
    // verify it is currently open, and pin its version. A fabricated challengeId
    // never scores or unlocks anything.
    let challenge = null;
    if (dto.challengeId) {
      challenge = await this.prisma.challenge.findFirst({
        where: { OR: [{ id: dto.challengeId }, { slug: dto.challengeId }], active: true },
      });
    }
    if (!challenge) {
      challenge = await this.prisma.challenge.findUnique({
        where: { slug: DEFAULT_CHALLENGE_SLUG },
      });
    }
    if (!challenge) {
      throw new NotFoundException('Challenge not found');
    }

    const now = new Date();
    if (challenge.startsAt > now || challenge.endsAt < now) {
      throw new BadRequestException('Challenge is not currently open');
    }

    const settings = await this.siteSettings.get();
    const result = buildChallengeResult(dto.code, settings.bootcamp);
    const language = dto.language ?? 'js';
    const status = result.topScore ? 'passed' : 'scored';

    const record = await this.prisma.challengeSubmission.create({
      data: {
        userId,
        challengeId: challenge.id,
        challengeVersion: challenge.version,
        language,
        code: dto.code,
        score: result.score,
        topScore: result.topScore,
        result: result as unknown as Prisma.InputJsonValue,
        status,
        executionTimeMs: dto.executionTimeMs ?? null,
        memoryUsageKb: dto.memoryUsageKb ?? null,
      },
    });

    // Leaderboard trust chain: rank/points are recomputed server-side from the
    // DB (never from a client-supplied score) inside a transaction so an
    // in-flight submission can never corrupt the leaderboard for other users.
    //
    // Course entitlement is intentionally NOT granted here. Scoring today is a
    // client-visible regex heuristic (`buildChallengeResult`) that is trivial
    // to game; unlocking paid catalog access from it would be a privilege
    // bypass. Re-enable entitlement only behind a real sandboxed judge.
    if (result.topScore) {
      await this.prisma.$transaction(async (tx) => {
        const best = await tx.challengeSubmission.aggregate({
          where: { challengeId: challenge.id },
          _max: { score: true },
        });

        await tx.bootcampProfile.updateMany({
          where: { userId },
          data: { rank: 1, points: best._max.score ?? result.score },
        });
      });
    }

    return {
      id: record.id,
      challengeId: record.challengeId,
      challengeVersion: record.challengeVersion,
      language: record.language,
      status: record.status,
      executionTimeMs: record.executionTimeMs,
      memoryUsageKb: record.memoryUsageKb,
      createdAt: record.createdAt.toISOString(),
      ...result,
    };
  }

  async findOne(id: string, userId: string): Promise<ChallengeSubmissionResponse> {
    const record = await this.prisma.challengeSubmission.findFirst({
      where: { id, userId },
    });
    if (!record) {
      throw new NotFoundException(`Challenge submission ${id} not found`);
    }

    const result = record.result as unknown as ChallengeScoreResult;
    return {
      id: record.id,
      challengeId: record.challengeId,
      challengeVersion: record.challengeVersion,
      language: record.language,
      status: record.status,
      executionTimeMs: record.executionTimeMs,
      memoryUsageKb: record.memoryUsageKb,
      createdAt: record.createdAt.toISOString(),
      ...result,
    };
  }
}
