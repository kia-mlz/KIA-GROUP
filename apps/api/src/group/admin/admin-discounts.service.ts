import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AdminDiscountCode, AuthUser } from '@kia./shared';
import { normalizeDiscountCode, validateDiscountInput } from '@kia./shared';
import { Prisma, PrismaService } from '@kia./platform';
import {
  AdminCreateDiscountCodeDto,
  AdminUpdateDiscountCodeDto,
} from './dto/admin.dto';
import type { AdminRequestMeta } from './admin-types';
import { AdminAuditService } from './audit.service';

/**
 * Commerce/marketing department — course discount codes (percent + fixed).
 * The engine (validation + amounts) lives in the shared pure helpers; this
 * service owns persistence and the admin audit trail.
 */
@Injectable()
export class AdminDiscountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  async listDiscountCodes(): Promise<AdminDiscountCode[]> {
    const codes = await this.prisma.discountCode.findMany({
      orderBy: [{ active: 'desc' }, { createdAt: 'desc' }],
      take: 500,
    });
    return codes.map((code) => this.toAdminDiscountCode(code));
  }

  async createDiscountCode(
    dto: AdminCreateDiscountCodeDto,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminDiscountCode> {
    const code = normalizeDiscountCode(dto.code);
    this.assertDiscountInput({
      type: dto.type,
      value: dto.value,
      startsAt: dto.startsAt ?? null,
      expiresAt: dto.expiresAt ?? null,
      maxUses: dto.maxUses ?? null,
    });

    const existing = await this.prisma.discountCode.findUnique({ where: { code } });
    if (existing) {
      throw new ConflictException(`Discount code "${code}" already exists`);
    }

    const slugs = this.normalizeDiscountSlugs(dto.courseSlugs);
    const created = await this.prisma.discountCode.create({
      data: {
        code,
        type: dto.type,
        value: dto.value,
        description: dto.description?.trim() || null,
        active: dto.active ?? true,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        maxUses: dto.maxUses ?? null,
        minSubtotalCents: dto.minSubtotalCents ?? null,
        courseSlugs: slugs ? (slugs as Prisma.InputJsonValue) : Prisma.DbNull,
      },
    });

    await this.audit.record({
      actor,
      action: 'discount.create',
      section: 'discounts',
      entityType: 'DiscountCode',
      entityId: created.id,
      target: created.code,
      after: { type: created.type, value: created.value, active: created.active },
      ...requestMeta,
    });

    return this.toAdminDiscountCode(created);
  }

  async updateDiscountCode(
    id: string,
    dto: AdminUpdateDiscountCodeDto,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminDiscountCode> {
    const existing = await this.ensureDiscountCode(id);
    const code = dto.code ? normalizeDiscountCode(dto.code) : existing.code;

    if (code !== existing.code) {
      const clash = await this.prisma.discountCode.findUnique({ where: { code } });
      if (clash) {
        throw new ConflictException(`Discount code "${code}" already exists`);
      }
    }

    // Validate the merged rule, not just the patch — changing type without a
    // matching value (e.g. FIXED 500000 → PERCENT) must be rejected.
    const startsAt =
      dto.startsAt !== undefined
        ? dto.startsAt
        : existing.startsAt
          ? existing.startsAt.toISOString()
          : null;
    const expiresAt =
      dto.expiresAt !== undefined
        ? dto.expiresAt
        : existing.expiresAt
          ? existing.expiresAt.toISOString()
          : null;
    const type = dto.type ?? existing.type;
    const value = dto.value ?? existing.value;
    const maxUses = dto.maxUses !== undefined ? dto.maxUses : existing.maxUses;
    this.assertDiscountInput({ type, value, startsAt, expiresAt, maxUses });

    const before = {
      code: existing.code,
      type: existing.type,
      value: existing.value,
      active: existing.active,
    };

    const updated = await this.prisma.discountCode.update({
      where: { id },
      data: {
        code,
        type,
        value,
        description:
          dto.description !== undefined ? dto.description?.trim() || null : undefined,
        active: dto.active,
        startsAt:
          dto.startsAt !== undefined ? (dto.startsAt ? new Date(dto.startsAt) : null) : undefined,
        expiresAt:
          dto.expiresAt !== undefined ? (dto.expiresAt ? new Date(dto.expiresAt) : null) : undefined,
        maxUses: dto.maxUses !== undefined ? dto.maxUses : undefined,
        minSubtotalCents:
          dto.minSubtotalCents !== undefined ? dto.minSubtotalCents : undefined,
        courseSlugs:
          dto.courseSlugs === undefined
            ? undefined
            : this.normalizeDiscountSlugs(dto.courseSlugs)
              ? (this.normalizeDiscountSlugs(dto.courseSlugs) as Prisma.InputJsonValue)
              : Prisma.DbNull,
      },
    });

    await this.audit.record({
      actor,
      action: 'discount.update',
      section: 'discounts',
      entityType: 'DiscountCode',
      entityId: updated.id,
      target: updated.code,
      before,
      after: {
        code: updated.code,
        type: updated.type,
        value: updated.value,
        active: updated.active,
      },
      ...requestMeta,
    });

    return this.toAdminDiscountCode(updated);
  }

  async deleteDiscountCode(
    id: string,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<{ deleted: true }> {
    const existing = await this.ensureDiscountCode(id);
    // Redemption history is kept for finance: only the code row is removed and
    // its usage rows cascade with it.
    await this.prisma.discountCode.delete({ where: { id } });
    await this.audit.record({
      actor,
      action: 'discount.delete',
      section: 'discounts',
      entityType: 'DiscountCode',
      entityId: existing.id,
      target: existing.code,
      before: { code: existing.code, value: existing.value, usageCount: existing.usageCount },
      ...requestMeta,
    });
    return { deleted: true };
  }

  private async ensureDiscountCode(id: string) {
    const code = await this.prisma.discountCode.findUnique({ where: { id } });
    if (!code) {
      throw new NotFoundException(`Discount code ${id} not found`);
    }
    return code;
  }

  /** Trim + dedupe the scoped slugs; an empty selection means "all courses". */
  private normalizeDiscountSlugs(slugs?: string[] | null): string[] | null {
    if (!slugs) return null;
    const cleaned = [
      ...new Set(slugs.map((slug) => slug.trim()).filter((slug) => slug.length > 0)),
    ];
    return cleaned.length > 0 ? cleaned : null;
  }

  /** Turn a shared validation verdict into the operator-facing error. */
  private assertDiscountInput(input: {
    type: string;
    value: number;
    startsAt?: string | null;
    expiresAt?: string | null;
    maxUses?: number | null;
  }) {
    const verdict = validateDiscountInput(input);
    if (!verdict) return;
    switch (verdict) {
      case 'BAD_TYPE':
        throw new BadRequestException('Discount type must be PERCENT or FIXED');
      case 'BAD_VALUE':
        throw new BadRequestException(
          input.type === 'PERCENT'
            ? 'A percentage discount must be between 1 and 100'
            : 'A fixed discount must be a positive amount',
        );
      case 'BAD_RANGE':
        throw new BadRequestException('Expiry date must be after the start date');
      case 'BAD_MAX_USES':
        throw new BadRequestException('Max uses must be a positive whole number');
      default:
        throw new BadRequestException('Invalid discount code');
    }
  }

  private toAdminDiscountCode(code: {
    id: string;
    code: string;
    type: 'PERCENT' | 'FIXED';
    value: number;
    description: string | null;
    active: boolean;
    startsAt: Date | null;
    expiresAt: Date | null;
    maxUses: number | null;
    usageCount: number;
    minSubtotalCents: number | null;
    courseSlugs: unknown;
    createdAt: Date;
    updatedAt: Date;
  }): AdminDiscountCode {
    const slugs = Array.isArray(code.courseSlugs)
      ? (code.courseSlugs as unknown[]).filter((s): s is string => typeof s === 'string')
      : null;
    return {
      id: code.id,
      code: code.code,
      type: code.type,
      value: code.value,
      description: code.description,
      active: code.active,
      startsAt: code.startsAt ? code.startsAt.toISOString() : null,
      expiresAt: code.expiresAt ? code.expiresAt.toISOString() : null,
      maxUses: code.maxUses,
      usedCount: code.usageCount,
      minSubtotalCents: code.minSubtotalCents,
      courseSlugs: slugs && slugs.length > 0 ? slugs : null,
      createdAt: code.createdAt.toISOString(),
      updatedAt: code.updatedAt.toISOString(),
    };
  }
}
