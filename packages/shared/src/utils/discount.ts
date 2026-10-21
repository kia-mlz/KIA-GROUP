import type {
  DiscountCodeErrorCode,
  DiscountCodeRule,
} from '../types/discount';

/** Normalize a user-entered code: trim + uppercase (codes are case-insensitive). */
export function normalizeDiscountCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export type DiscountCheck =
  | { ok: true; amountCents: number }
  | { ok: false; reason: DiscountCodeErrorCode };

export interface DiscountContext {
  now: Date;
  /** Full cart subtotal (IRR) — used for the minimum-subtotal gate. */
  subtotalCents: number;
  /** Subtotal of the code-eligible items only — the discount is computed on this. */
  eligibleSubtotalCents: number;
}

/**
 * Compute the discount amount (IRR) for a rule against the eligible subtotal.
 * Clamped to `[0, eligibleSubtotalCents]` — a cart is never paid to take a course.
 */
export function discountAmountCents(rule: DiscountCodeRule, eligibleSubtotalCents: number): number {
  const raw =
    rule.type === 'PERCENT'
      ? Math.floor((eligibleSubtotalCents * rule.value) / 100)
      : rule.value;
  return Math.max(0, Math.min(raw, eligibleSubtotalCents));
}

/** Sum of the prices of the items the rule applies to (all items when unscoped). */
export function eligibleSubtotalCents(
  rule: Pick<DiscountCodeRule, 'courseSlugs'>,
  items: ReadonlyArray<{ courseSlug: string; priceCents: number }>,
): number {
  const scope = rule.courseSlugs ?? [];
  if (scope.length === 0) {
    return items.reduce((sum, item) => sum + item.priceCents, 0);
  }
  const scoped = new Set(scope);
  return items
    .filter((item) => scoped.has(item.courseSlug))
    .reduce((sum, item) => sum + item.priceCents, 0);
}

/**
 * Validate a rule against the current cart + clock. Checks run in
 * cheap-to-expensive order and the result carries the clamped amount.
 */
export function checkDiscountCode(rule: DiscountCodeRule, ctx: DiscountContext): DiscountCheck {
  if (!rule.active) return { ok: false, reason: 'INACTIVE' };
  if (rule.startsAt && ctx.now < new Date(rule.startsAt)) {
    return { ok: false, reason: 'NOT_STARTED' };
  }
  if (rule.expiresAt && ctx.now >= new Date(rule.expiresAt)) {
    return { ok: false, reason: 'EXPIRED' };
  }
  if (rule.maxUses !== null && rule.usedCount >= rule.maxUses) {
    return { ok: false, reason: 'EXHAUSTED' };
  }
  if (rule.minSubtotalCents !== null && ctx.subtotalCents < rule.minSubtotalCents) {
    return { ok: false, reason: 'MIN_SUBTOTAL' };
  }
  if (ctx.eligibleSubtotalCents <= 0) {
    return { ok: false, reason: 'NOT_APPLICABLE' };
  }
  return { ok: true, amountCents: discountAmountCents(rule, ctx.eligibleSubtotalCents) };
}

/**
 * Shape a rule row for persistence validation. Returns the first problem or
 * null when the rule is well-formed. Used by the admin API and the demo store
 * so both enforce the same invariants.
 */
export function validateDiscountInput(input: {
  type: string;
  value: number;
  startsAt?: string | null;
  expiresAt?: string | null;
  maxUses?: number | null;
}): 'BAD_TYPE' | 'BAD_VALUE' | 'BAD_RANGE' | 'BAD_MAX_USES' | null {
  if (input.type !== 'PERCENT' && input.type !== 'FIXED') return 'BAD_TYPE';
  if (!Number.isInteger(input.value) || input.value < 1) return 'BAD_VALUE';
  if (input.type === 'PERCENT' && input.value > 100) return 'BAD_VALUE';
  if (
    input.startsAt &&
    input.expiresAt &&
    new Date(input.expiresAt) <= new Date(input.startsAt)
  ) {
    return 'BAD_RANGE';
  }
  if (input.maxUses != null && (!Number.isInteger(input.maxUses) || input.maxUses < 1)) {
    return 'BAD_MAX_USES';
  }
  return null;
}
