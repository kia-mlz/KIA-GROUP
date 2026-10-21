/** Discount-code domain — percentage (PERCENT) and flat-amount (FIXED) course coupons. */

export type DiscountType = 'PERCENT' | 'FIXED';

/**
 * The rule shape the pure validation/amount helpers operate on. Matches both
 * the Prisma `DiscountCode` row (dates as ISO strings) and the demo store.
 */
export interface DiscountCodeRule {
  code: string;
  type: DiscountType;
  /** Percent (1-100) when PERCENT, IRR amount when FIXED. */
  value: number;
  active: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  /** null = unlimited uses. */
  maxUses: number | null;
  usedCount: number;
  /** Minimum cart subtotal (IRR) required for the code to apply. */
  minSubtotalCents: number | null;
  /** Course slugs the code applies to; null/empty = every course. */
  courseSlugs: string[] | null;
}

/** Stable failure reasons — the UI maps these to localized messages. */
export type DiscountCodeErrorCode =
  | 'NOT_FOUND'
  | 'INACTIVE'
  | 'NOT_STARTED'
  | 'EXPIRED'
  | 'EXHAUSTED'
  | 'MIN_SUBTOTAL'
  | 'NOT_APPLICABLE';

/** Applied coupon summary embedded in cart responses. */
export interface CartDiscountInfo {
  code: string;
  type: DiscountType;
  value: number;
  /** Discount amount applied to this cart, in IRR. */
  amountCents: number;
}

/** Admin-panel view model for a discount code. */
export interface AdminDiscountCode {
  id: string;
  code: string;
  type: DiscountType;
  value: number;
  description: string | null;
  active: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  maxUses: number | null;
  usedCount: number;
  minSubtotalCents: number | null;
  courseSlugs: string[] | null;
  createdAt: string;
  updatedAt: string;
}

/** Payload for creating a discount code from the admin panel. */
export interface AdminDiscountCodeInput {
  code: string;
  type: DiscountType;
  value: number;
  description?: string;
  active?: boolean;
  startsAt?: string | null;
  expiresAt?: string | null;
  maxUses?: number | null;
  minSubtotalCents?: number | null;
  courseSlugs?: string[] | null;
}

/** Payload for updating a discount code — every field optional. */
export type AdminDiscountCodeUpdate = Partial<AdminDiscountCodeInput>;
