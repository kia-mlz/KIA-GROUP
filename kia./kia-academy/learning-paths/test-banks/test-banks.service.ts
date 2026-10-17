import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import {
  DEFAULT_ASSESSMENT_BANK,
  EXAM_QUESTION_BANK,
  MINI_IPIP_CITATION,
  MINI_IPIP_ITEMS,
  TEST_BANK_IDS,
  type AssessmentBank,
  type PersonalityBank,
  type PersonalityItem,
  type ReadinessBank,
  type TestBankId,
  type TestBankMeta,
  type TestBankPayload,
} from '@kia./shared';
import { PrismaService } from '@kia./platform';
import type { Prisma } from '@kia./platform';

@Injectable()
export class TestBanksService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.ensureDefaults();
  }

  async ensureDefaults() {
    for (const id of TEST_BANK_IDS) {
      const existing = await this.prisma.testBank.findUnique({ where: { id } });
      if (!existing) {
        await this.prisma.testBank.create({
          data: { id, payload: this.defaultPayload(id) as Prisma.InputJsonValue },
        });
      }
    }
  }

  defaultPayload(id: TestBankId): unknown {
    if (id === 'personality') {
      const bank: PersonalityBank = {
        version: 1,
        citation: MINI_IPIP_CITATION,
        items: MINI_IPIP_ITEMS.map((item) => ({ ...item })),
      };
      return bank;
    }
    if (id === 'assessment') {
      return structuredClone(DEFAULT_ASSESSMENT_BANK);
    }
    const bank: ReadinessBank = {
      version: 1,
      questions: structuredClone(EXAM_QUESTION_BANK),
    };
    return bank;
  }

  async listMeta(): Promise<TestBankMeta[]> {
    await this.ensureDefaults();
    const rows = await this.prisma.testBank.findMany();
    const byId = new Map(rows.map((r) => [r.id, r]));
    return TEST_BANK_IDS.map((id) => {
      const row = byId.get(id);
      const payload = row ? this.parsePayload(id, row.payload) : this.defaultPayload(id);
      return {
        id,
        updatedAt: row?.updatedAt.toISOString() ?? null,
        questionCount: this.countQuestions(id, payload),
      };
    });
  }

  async getPersonalityBank(): Promise<PersonalityBank> {
    const payload = await this.getBank('personality');
    if (payload.id !== 'personality') {
      throw new BadRequestException('Unexpected personality bank payload');
    }
    return payload.bank;
  }

  async getPersonalityItems(): Promise<PersonalityItem[]> {
    const bank = await this.getPersonalityBank();
    return [...bank.items].sort((a, b) => a.order - b.order);
  }

  async getAssessmentBank(): Promise<AssessmentBank> {
    const payload = await this.getBank('assessment');
    if (payload.id !== 'assessment') {
      throw new BadRequestException('Unexpected assessment bank payload');
    }
    return payload.bank;
  }

  async getReadinessBank(): Promise<ReadinessBank> {
    const payload = await this.getBank('readiness');
    if (payload.id !== 'readiness') {
      throw new BadRequestException('Unexpected readiness bank payload');
    }
    return payload.bank;
  }

  async getExamQuestions() {
    const bank = await this.getReadinessBank();
    return [...bank.questions];
  }

  async getBank(id: TestBankId): Promise<TestBankPayload> {
    await this.ensureDefaults();
    const row = await this.prisma.testBank.findUnique({ where: { id } });
    const payload = row ? this.parsePayload(id, row.payload) : this.defaultPayload(id);
    if (id === 'personality') {
      return { id, bank: payload as PersonalityBank };
    }
    if (id === 'assessment') {
      return { id, bank: payload as AssessmentBank };
    }
    return { id, bank: payload as ReadinessBank };
  }

  async saveBank(id: TestBankId, bank: unknown, updatedBy?: string): Promise<TestBankPayload> {
    const normalized = this.validateAndNormalize(id, bank);
    await this.prisma.testBank.upsert({
      where: { id },
      create: {
        id,
        payload: normalized as Prisma.InputJsonValue,
        updatedBy: updatedBy ?? null,
      },
      update: {
        payload: normalized as Prisma.InputJsonValue,
        updatedBy: updatedBy ?? null,
      },
    });
    return this.getBank(id);
  }

  async resetBank(id: TestBankId, updatedBy?: string): Promise<TestBankPayload> {
    return this.saveBank(id, this.defaultPayload(id), updatedBy);
  }

  private countQuestions(id: TestBankId, payload: unknown): number {
    if (id === 'personality') {
      return (payload as PersonalityBank).items?.length ?? 0;
    }
    if (id === 'assessment') {
      return (payload as AssessmentBank).questions?.length ?? 0;
    }
    return (payload as ReadinessBank).questions?.length ?? 0;
  }

  private parsePayload(id: TestBankId, raw: Prisma.JsonValue): unknown {
    try {
      return this.validateAndNormalize(id, raw);
    } catch {
      return this.defaultPayload(id);
    }
  }

  private validateAndNormalize(id: TestBankId, bank: unknown): unknown {
    if (!bank || typeof bank !== 'object') {
      throw new BadRequestException('Invalid bank payload');
    }
    if (id === 'personality') {
      return this.normalizePersonality(bank as PersonalityBank);
    }
    if (id === 'assessment') {
      return this.normalizeAssessment(bank as AssessmentBank);
    }
    return this.normalizeReadiness(bank as ReadinessBank);
  }

  private normalizePersonality(bank: PersonalityBank): PersonalityBank {
    if (!Array.isArray(bank.items) || bank.items.length === 0) {
      throw new BadRequestException('Personality bank needs at least one item');
    }
    const traits = new Set([
      'extraversion',
      'agreeableness',
      'conscientiousness',
      'neuroticism',
      'openness',
    ]);
    const items: PersonalityItem[] = bank.items.map((item, index) => {
      if (!item?.id || !item.textEn?.trim() || !item.textFa?.trim()) {
        throw new BadRequestException(`Personality item ${index + 1} needs id and FA/EN text`);
      }
      if (!traits.has(item.trait)) {
        throw new BadRequestException(`Invalid trait on item ${item.id}`);
      }
      return {
        id: String(item.id),
        order: index + 1,
        trait: item.trait,
        reverse: Boolean(item.reverse),
        textEn: String(item.textEn).trim(),
        textFa: String(item.textFa).trim(),
      };
    });
    const ids = new Set(items.map((i) => i.id));
    if (ids.size !== items.length) {
      throw new BadRequestException('Duplicate personality item ids');
    }
    return {
      version: Number(bank.version) || 1,
      citation: String(bank.citation || MINI_IPIP_CITATION),
      items,
    };
  }

  private normalizeAssessment(bank: AssessmentBank): AssessmentBank {
    if (!Array.isArray(bank.questions) || bank.questions.length === 0) {
      throw new BadRequestException('Assessment bank needs at least one question');
    }
    const questions = bank.questions.map((q, index) => {
      if (!q?.id || !q.kind || !q.title?.fa || !q.title?.en) {
        throw new BadRequestException(`Assessment question ${index + 1} is incomplete`);
      }
      return {
        ...q,
        id: String(q.id),
        order: index + 1,
        stageLabel: q.stageLabel ?? q.title,
        title: { fa: String(q.title.fa), en: String(q.title.en) },
        description: {
          fa: String(q.description?.fa ?? ''),
          en: String(q.description?.en ?? ''),
        },
        options: q.options?.map((opt) => ({
          value: String(opt.value),
          icon: opt.icon,
          title: { fa: String(opt.title.fa), en: String(opt.title.en) },
          description: opt.description
            ? { fa: String(opt.description.fa), en: String(opt.description.en) }
            : undefined,
        })),
      };
    });
    return { version: Number(bank.version) || 1, questions };
  }

  private normalizeReadiness(bank: ReadinessBank): ReadinessBank {
    if (!Array.isArray(bank.questions) || bank.questions.length === 0) {
      throw new BadRequestException('Readiness bank needs at least one question');
    }
    const domains = new Set([
      'digitalOps',
      'logicalReasoning',
      'techReading',
      'codeSense',
      'problemSolving',
    ]);
    const types = new Set(['single_choice', 'multi_choice', 'order', 'fill_blank']);
    const questions = bank.questions.map((q, index) => {
      if (!q?.id || !domains.has(q.domain) || !types.has(q.type)) {
        throw new BadRequestException(`Readiness question ${index + 1} has invalid meta`);
      }
      if (!q.prompt?.fa?.trim() || !q.prompt?.en?.trim()) {
        throw new BadRequestException(`Readiness question ${q.id} needs FA/EN prompt`);
      }
      if (q.answer === undefined || q.answer === null || q.answer === '') {
        throw new BadRequestException(`Readiness question ${q.id} needs an answer key`);
      }
      return {
        ...q,
        id: String(q.id),
        prompt: { fa: String(q.prompt.fa), en: String(q.prompt.en) },
        points: typeof q.points === 'number' ? q.points : 1,
      };
    });
    const ids = new Set(questions.map((q) => q.id));
    if (ids.size !== questions.length) {
      throw new BadRequestException('Duplicate readiness question ids');
    }
    return { version: Number(bank.version) || 1, questions };
  }
}
