import { describe, expect, it } from 'vitest';
import type { DiscountCodeRule } from '../types/discount';
import {
  checkDiscountCode,
  discountAmountCents,
  eligibleSubtotalCents,
  normalizeDiscountCode,
  validateDiscountInput,
} from './discount';

const rule = (overrides: Partial<DiscountCodeRule> = {}): DiscountCodeRule => ({
  code: 'SAVE10',
  type: 'PERCENT',
  value: 10,
  active: true,
  startsAt: null,
  expiresAt: null,
  maxUses: null,
  usedCount: 0,
  minSubtotalCents: null,
  courseSlugs: null,
  ...overrides,
});

const items = [
  { courseSlug: 'html', priceCents: 1_490_000 },
  { courseSlug: 'css', priceCents: 1_490_000 },
];

describe('normalizeDiscountCode', () => {
  it('trims and uppercases', () => {
    expect(normalizeDiscountCode('  save10 ')).toBe('SAVE10');
  });
});

describe('discountAmountCents', () => {
  it('computes a floored percentage', () => {
    expect(discountAmountCents(rule(), 1_490_000)).toBe(149_000);
    expect(discountAmountCents(rule({ value: 33 }), 100)).toBe(33);
    expect(discountAmountCents(rule({ value: 33 }), 99)).toBe(32);
  });

  it('uses the flat value for FIXED codes', () => {
    expect(discountAmountCents(rule({ type: 'FIXED', value: 500_000 }), 1_490_000)).toBe(500_000);
  });

  it('never exceeds the eligible subtotal', () => {
    expect(discountAmountCents(rule({ type: 'FIXED', value: 9_999_999 }), 1_490_000)).toBe(1_490_000);
    expect(discountAmountCents(rule({ value: 100 }), 1_490_000)).toBe(1_490_000);
  });
});

describe('eligibleSubtotalCents', () => {
  it('sums every item when unscoped', () => {
    expect(eligibleSubtotalCents(rule(), items)).toBe(2_980_000);
  });

  it('sums only scoped course slugs', () => {
    expect(eligibleSubtotalCents(rule({ courseSlugs: ['html'] }), items)).toBe(1_490_000);
  });

  it('returns 0 when no scoped course is in the cart', () => {
    expect(eligibleSubtotalCents(rule({ courseSlugs: ['js'] }), items)).toBe(0);
  });
});

describe('checkDiscountCode', () => {
  const ctx = { now: new Date('2026-06-15T12:00:00Z'), subtotalCents: 2_980_000 };

  it('accepts a healthy percent code', () => {
    const result = checkDiscountCode(rule(), { ...ctx, eligibleSubtotalCents: 2_980_000 });
    expect(result).toEqual({ ok: true, amountCents: 298_000 });
  });

  it('rejects inactive codes', () => {
    const result = checkDiscountCode(rule({ active: false }), { ...ctx, eligibleSubtotalCents: 1 });
    expect(result).toEqual({ ok: false, reason: 'INACTIVE' });
  });

  it('rejects codes before their start date', () => {
    const result = checkDiscountCode(rule({ startsAt: '2026-07-01T00:00:00Z' }), {
      ...ctx,
      eligibleSubtotalCents: 1,
    });
    expect(result).toEqual({ ok: false, reason: 'NOT_STARTED' });
  });

  it('rejects expired codes (expiry is exclusive)', () => {
    const result = checkDiscountCode(rule({ expiresAt: '2026-06-15T12:00:00Z' }), {
      ...ctx,
      eligibleSubtotalCents: 1,
    });
    expect(result).toEqual({ ok: false, reason: 'EXPIRED' });
  });

  it('rejects exhausted codes', () => {
    const result = checkDiscountCode(rule({ maxUses: 5, usedCount: 5 }), {
      ...ctx,
      eligibleSubtotalCents: 1,
    });
    expect(result).toEqual({ ok: false, reason: 'EXHAUSTED' });
  });

  it('enforces the minimum subtotal against the full cart', () => {
    const result = checkDiscountCode(rule({ minSubtotalCents: 5_000_000 }), {
      ...ctx,
      eligibleSubtotalCents: 2_980_000,
    });
    expect(result).toEqual({ ok: false, reason: 'MIN_SUBTOTAL' });
  });

  it('rejects scoped codes with nothing eligible in the cart', () => {
    const result = checkDiscountCode(rule({ courseSlugs: ['js'] }), {
      ...ctx,
      eligibleSubtotalCents: 0,
    });
    expect(result).toEqual({ ok: false, reason: 'NOT_APPLICABLE' });
  });
});

describe('validateDiscountInput', () => {
  it('accepts a valid percent rule', () => {
    expect(validateDiscountInput({ type: 'PERCENT', value: 25 })).toBeNull();
  });

  it('rejects unknown types', () => {
    expect(validateDiscountInput({ type: 'BOGO', value: 10 })).toBe('BAD_TYPE');
  });

  it('rejects percent values above 100 and non-positive values', () => {
    expect(validateDiscountInput({ type: 'PERCENT', value: 101 })).toBe('BAD_VALUE');
    expect(validateDiscountInput({ type: 'PERCENT', value: 0 })).toBe('BAD_VALUE');
    expect(validateDiscountInput({ type: 'FIXED', value: -5 })).toBe('BAD_VALUE');
  });

  it('rejects inverted date ranges', () => {
    expect(
      validateDiscountInput({
        type: 'FIXED',
        value: 100,
        startsAt: '2026-06-01T00:00:00Z',
        expiresAt: '2026-05-01T00:00:00Z',
      }),
    ).toBe('BAD_RANGE');
  });

  it('rejects non-positive max uses', () => {
    expect(validateDiscountInput({ type: 'FIXED', value: 100, maxUses: 0 })).toBe('BAD_MAX_USES');
  });
});
