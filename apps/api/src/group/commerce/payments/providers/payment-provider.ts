import type { PaymentProviderId, SitePaymentSettings } from '@kia./shared';

export interface PaymentCreateInput {
  paymentId: string;
  amountIrr: number;
  description: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  callbackUrl: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

export interface PaymentCreateResult {
  /** Absolute URL the learner should be redirected to (gateway or in-app). */
  redirectUrl: string | null;
  /** Provider reference (ZarinPal Authority, Stripe session id, …). */
  gatewayRef: string | null;
  /** Optional provider-specific metadata to persist on the Payment row. */
  metadata?: Record<string, unknown>;
  /**
   * When true, the payment can be confirmed immediately without a redirect
   * (dev provider / already-paid edge cases).
   */
  immediateConfirm?: boolean;
}

export interface PaymentVerifyInput {
  paymentId: string;
  amountIrr: number;
  gatewayRef: string | null;
  authority?: string | null;
  status?: string | null;
  /** Payment.metadata jsonb column (previously a serialized string). */
  metadata?: Record<string, unknown> | null;
}

export interface PaymentVerifyResult {
  success: boolean;
  /** Final provider reference / receipt id. */
  gatewayRef?: string | null;
  raw?: unknown;
  failureReason?: string;
}

/**
 * Pluggable payment gateway. New Iranian PSPs (NextPay, Pay.ir, …) implement
 * this interface and register in PaymentProviderRegistry — no checkout changes.
 */
export interface PaymentProvider {
  readonly id: PaymentProviderId;
  createPayment(
    input: PaymentCreateInput,
    settings: SitePaymentSettings,
  ): Promise<PaymentCreateResult>;
  verifyPayment(
    input: PaymentVerifyInput,
    settings: SitePaymentSettings,
  ): Promise<PaymentVerifyResult>;
}
