import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  checkDiscountCode,
  eligibleSubtotalCents,
  normalizeDiscountCode,
  type CartDiscountInfo,
  type DiscountCodeErrorCode,
  type DiscountCodeRule,
  type DiscountType,
} from '@kia./shared';
import { PrismaService } from '@kia./platform';

/** A priced cart line — the discount math only needs slug + line price. */
export interface DiscountLine {
  courseSlug: string;
  priceCents: number;
}

/** A coupon that passed authoritative validation at checkout time. */
export interface AppliedCoupon {
  codeId: string;
  code: string;
  amountCents: number;
}

/** Prisma row shape for a discount code. */
interface DiscountCodeRow {
  id: string;
  code: string;
  type: DiscountType;
  value: number;
  active: boolean;
  startsAt: Date | null;
  expiresAt: Date | null;
  maxUses: number | null;
  usageCount: number;
  minSubtotalCents: number | null;
  courseSlugs: unknown;
}

function toRule(row: DiscountCodeRow): DiscountCodeRule {
  const slugs = Array.isArray(row.courseSlugs)
    ? (row.courseSlugs as unknown[]).filter((s): s is string => typeof s === 'string')
    : null;
  return {
    code: row.code,
    type: row.type,
    value: row.value,
    active: row.active,
    startsAt: row.startsAt ? row.startsAt.toISOString() : null,
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    maxUses: row.maxUses,
    usedCount: row.usageCount,
    minSubtotalCents: row.minSubtotalCents,
    courseSlugs: slugs && slugs.length > 0 ? slugs : null,
  };
}

/** Map a pure validation reason to the HTTP exception the API should return. */
function exceptionFor(reason: DiscountCodeErrorCode): NotFoundException | BadRequestException {
  switch (reason) {
    case 'NOT_FOUND':
      return new NotFoundException({ code: reason, message: 'Discount code not found' });
    case 'INACTIVE':
      return new BadRequestException({ code: reason, message: 'Discount code is disabled' });
    case 'NOT_STARTED':
      return new BadRequestException({ code: reason, message: 'Discount code is not active yet' });
    case 'EXPIRED':
      return new BadRequestException({ code: reason, message: 'Discount code has expired' });
    case 'EXHAUSTED':
      return new BadRequestException({ code: reason, message: 'Discount code has reached its usage limit' });
    case 'MIN_SUBTOTAL':
      return new BadRequestException({ code: reason, message: 'Cart does not meet the minimum for this code' });
    case 'NOT_APPLICABLE':
      return new BadRequestException({ code: reason, message: 'Discount code does not apply to these courses' });
    default:
      return new BadRequestException({ code: reason, message: 'Invalid discount code' });
  }
}

/**
 * Discount-code engine shared by cart display and authoritative checkout.
 * Amounts are computed with the pure helpers in `@kia./shared` so the API,
 * demo mode and tests all agree on the math.
 */
@Injectable()
export class DiscountService {
  constructor(private readonly prisma: PrismaService) {}

  private async findRow(code: string): Promise<DiscountCodeRow | null> {
    const normalized = normalizeDiscountCode(code);
    if (!normalized) return null;
    const row = await this.prisma.discountCode.findUnique({ where: { code: normalized } });
    return (row as unknown as DiscountCodeRow) ?? null;
  }

  /**
   * Validate a code against cart lines and return the display-ready applied
   * discount. Throws the mapped exception when the code is not usable.
   */
  async evaluate(code: string, lines: DiscountLine[]): Promise<CartDiscountInfo> {
    const row = await this.findRow(code);
    if (!row) throw exceptionFor('NOT_FOUND');
    return this.applyRule(row, lines);
  }

  private applyRule(row: DiscountCodeRow, lines: DiscountLine[]): CartDiscountInfo {
    const rule = toRule(row);
    const subtotalCents = lines.reduce((sum, l) => sum + l.priceCents, 0);
    const eligible = eligibleSubtotalCents(rule, lines);
    const result = checkDiscountCode(rule, {
      now: new Date(),
      subtotalCents,
      eligibleSubtotalCents: eligible,
    });
    if (!result.ok) throw exceptionFor(result.reason);
    return {
      code: rule.code,
      type: rule.type,
      value: rule.value,
      amountCents: result.amountCents,
    };
  }

  /**
   * Non-throwing variant used when rendering a cart: a stale code stored on the
   * cart (expired, deactivated, deleted) should silently drop out of the
   * totals instead of failing the whole cart request.
   */
  async evaluateOrNull(
    code: string | null,
    lines: DiscountLine[],
  ): Promise<CartDiscountInfo | null> {
    if (!code) return null;
    try {
      return await this.evaluate(code, lines);
    } catch {
      return null;
    }
  }

  /**
   * Authoritative checkout validation. Re-checks the code and, when it is
   * still valid, returns the coupon ready to be recorded on the order. Callers
   * invoke {@link recordUsage} once the order is persisted. A code that went
   * invalid between cart render and checkout yields null so checkout proceeds
   * without the discount instead of failing the purchase.
   */
  async validateForCheckout(code: string, lines: DiscountLine[]): Promise<AppliedCoupon | null> {
    const row = await this.findRow(code);
    if (!row) return null;
    try {
      const applied = this.applyRule(row, lines);
      return { codeId: row.id, code: applied.code, amountCents: applied.amountCents };
    } catch {
      return null;
    }
  }

  /**
   * Atomically consume one redemption. The conditional update enforces
   * `maxUses` under concurrency: the `usageCount < maxUses` predicate is
   * evaluated inside a single UPDATE, so two simultaneous checkouts cannot
   * both slip past the cap. Returns false when the code is gone or exhausted.
   */
  async recordUsage(coupon: AppliedCoupon, userId: string, orderId: string): Promise<boolean> {
    const row = await this.prisma.discountCode.findUnique({ where: { id: coupon.codeId } });
    if (!row) return false;

    const guard =
      row.maxUses === null
        ? { id: coupon.codeId }
        : { id: coupon.codeId, usageCount: { lt: row.maxUses } };
    const updated = await this.prisma.discountCode.updateMany({
      where: guard,
      data: { usageCount: { increment: 1 } },
    });
    if (updated.count === 0) return false;

    await this.prisma.discountCodeUsage.create({
      data: {
        codeId: coupon.codeId,
        userId,
        orderId,
        amountCents: coupon.amountCents,
      },
    });
    return true;
  }
}
