export type ProductType = 'READINESS_TEST' | 'ROADMAP_BUNDLE' | 'COURSE';
export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';

export interface CheckoutDto {
  productType?: ProductType;
  productRef?: string;
  /** When purchasing multiple courses independently from the roadmap bundle. */
  courseSlugs?: string[];
  /** When true, checkout the authenticated user's cart instead of dto products. */
  fromCart?: boolean;
  /** Optional discount code for direct (non-cart) checkouts; cart checkouts use the code saved on the cart. */
  discountCode?: string;
}

export interface PaymentResponse {
  id: string;
  productType: ProductType;
  /** Amount in IRR (Iranian Rials). Field name kept for API compatibility. */
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  checkoutUrl?: string;
  productRef?: string | null;
  orderId?: string | null;
  invoiceNumber?: string | null;
  provider?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type WalletTxnKind = 'credit' | 'debit';

export interface WalletTransactionDto {
  id: string;
  description: string;
  /** English description when available (null → fall back to `description`). */
  descriptionEn?: string | null;
  /** Signed amount in IRR (positive credit, negative debit). */
  amountCents: number;
  type: WalletTxnKind;
  createdAt: string;
  paymentId?: string | null;
}

export interface WalletSummary {
  balanceCents: number;
  currency: string;
  cardLast4: string;
  expiresLabel: string;
  transactions: WalletTransactionDto[];
}

export interface GatewayVerifyDto {
  /** Internal payment id (Authority callback may carry this as payment_id). */
  paymentId?: string;
  /** ZarinPal Authority / IDPay track id / Stripe session id. */
  authority?: string;
  /** Provider status code from the return URL (e.g. ZarinPal Status=OK). */
  status?: string;
}

export interface GatewayVerifyResponse {
  success: boolean;
  payment: PaymentResponse;
  redirectUrl: string;
}

/** Catalog prices in Iranian Rials (IRR). */
export const PRODUCT_PRICES: Record<ProductType, number> = {
  READINESS_TEST: 790_000,
  ROADMAP_BUNDLE: 0,
  COURSE: 1_490_000,
};

export const DEFAULT_CURRENCY = 'irr';

/** Stripe Checkout does not support IRR; use dev confirm flow for IRR catalog. */
export const STRIPE_SUPPORTED_CURRENCIES = new Set(['usd', 'eur', 'gbp']);
