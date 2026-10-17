import { BadRequestException, Injectable } from '@nestjs/common';
import {
  missingMiniIpipAnswers,
  scoreMiniIpip,
  type MiniIpipAnswers,
  type PersonalityLikert,
  type PersonalityResult,
} from '@kia./shared';
import { PrismaService } from '@kia./platform';
import type { Prisma } from '@kia./platform';
import { TestBanksService } from '../../learning-paths/test-banks/test-banks.service';

@Injectable()
export class PersonalityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly testBanks: TestBanksService,
  ) {}

  async submit(userId: string, rawAnswers: Record<string, number>): Promise<PersonalityResult> {
    const items = await this.testBanks.getPersonalityItems();
    const answers = this.normalizeAnswers(rawAnswers);
    const missing = missingMiniIpipAnswers(answers, items);
    if (missing.length) {
      throw new BadRequestException(`Incomplete answers: ${missing.join(', ')}`);
    }

    const bank = await this.testBanks.getPersonalityBank();
    let scored: PersonalityResult;
    try {
      scored = scoreMiniIpip(answers, { items });
    } catch (err) {
      throw new BadRequestException(err instanceof Error ? err.message : 'Invalid answers');
    }

    const record = await this.prisma.personalityResult.create({
      data: {
        userId,
        instrument: 'mini-ipip',
        answers: answers as unknown as Prisma.InputJsonValue,
        scores: scored.scores as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      ...scored,
      id: record.id,
      citation: bank.citation,
      createdAt: record.createdAt.toISOString(),
    };
  }

  async latestForUser(userId: string): Promise<PersonalityResult | null> {
    return this.forUserAround(userId);
  }

  /**
   * Prefer the newest Mini-IPIP result at or before `at` (same session as an exam),
   * otherwise fall back to the learner's latest result.
   */
  async forUserAround(userId: string, at?: Date): Promise<PersonalityResult | null> {
    const bank = await this.testBanks.getPersonalityBank();
    if (at) {
      const around = await this.prisma.personalityResult.findFirst({
        where: { userId, createdAt: { lte: at } },
        orderBy: { createdAt: 'desc' },
      });
      if (around) return this.toResult(around, bank.citation);
    }
    const latest = await this.prisma.personalityResult.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return latest ? this.toResult(latest, bank.citation) : null;
  }

  private toResult(
    record: { id: string; answers: Prisma.JsonValue; scores: Prisma.JsonValue; createdAt: Date },
    citation: string,
  ): PersonalityResult {
    return {
      id: record.id,
      instrument: 'mini-ipip',
      citation,
      answers: record.answers as unknown as MiniIpipAnswers,
      scores: record.scores as unknown as PersonalityResult['scores'],
      createdAt: record.createdAt.toISOString(),
    };
  }

  private normalizeAnswers(raw: Record<string, number>): MiniIpipAnswers {
    const out: MiniIpipAnswers = {};
    for (const [id, value] of Object.entries(raw ?? {})) {
      if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 5) {
        throw new BadRequestException(`Invalid Likert value for ${id}`);
      }
      out[id] = value as PersonalityLikert;
    }
    return out;
  }
}
