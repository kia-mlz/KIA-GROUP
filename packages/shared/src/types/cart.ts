/** Shopping cart types — courses only; quantity is always 1. */

import type { CartDiscountInfo } from './discount';

export interface CartItemResponse {
  id: string;
  courseId: string;
  courseSlug: string;
  title: string;
  /** Visual thumbnail (course icon emoji / mark). */
  thumbnail: string;
  instructor: string;
  trackKey: string | null;
  /** List / catalog price in IRR. */
  priceCents: number;
  /** Discount amount in IRR (0 when no discount). */
  discountCents: number;
  /** Payable line total in IRR. */
  finalPriceCents: number;
  addedAt: string;
}

export interface CartResponse {
  id: string;
  items: CartItemResponse[];
  itemCount: number;
  /** Sum of list prices (IRR). */
  subtotalCents: number;
  /** Sum of discounts (IRR). */
  discountCents: number;
  /** Payable total (IRR). */
  totalCents: number;
  /** Applied coupon, folded into `discountCents` above (null when none). */
  discountCode: CartDiscountInfo | null;
  currency: string;
  updatedAt: string;
}

export interface AddToCartDto {
  courseSlug: string;
}
