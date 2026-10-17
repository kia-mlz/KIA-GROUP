import { BadRequestException, Injectable } from '@nestjs/common';
import {
  STRIPE_SUPPORTED_CURRENCIES,
  type SitePaymentSettings,
} from '@kia./shared';
import { StripeService } from '../../stripe/stripe.service';
import { isProductionEnv } from '@kia./platform';
import type {
  PaymentCreateInput,
  PaymentCreateResult,
  PaymentProvider,
  PaymentVerifyInput,
  PaymentVerifyResult,
} from './payment-provider';

/**
 * Stripe Checkout wrapper. IRR catalogs fall back to the in-app gateway simulator
 * because Stripe does not support IRR.
 */
@Injectable()
export class StripePaymentProvider implements PaymentProvider {
  readonly id = 'stripe' as const;

  constructor(private readonly stripeService: StripeService) {}

  async createPayment(
    input: PaymentCreateInput,
    settings: SitePaymentSettings,
  ): Promise<PaymentCreateResult> {
    const currency = (settings.currency === 'irt' ? 'irr' : settings.currency) || 'irr';
    const canUseStripe =
      this.stripeService.isConfigured() && STRIPE_SUPPORTED_CURRENCIES.has(currency);

    if (canUseStripe) {
      const session = await this.stripeService.createSession(
        input.paymentId,
        input.amountIrr,
        input.description,
        input.customerEmail ?? 'noreply@kia.academy',
        input.successUrl,
        input.cancelUrl,
        currency,
      );
      return {
        redirectUrl: session.url ?? null,
        gatewayRef: session.id,
        metadata: { stripeSessionId: session.id },
      };
    }

    // Simulator fallback (IRR or missing secret)
    if (isProductionEnv()) {
      throw new BadRequestException(
        'Stripe cannot process IRR payments. Configure a supported currency or a live gateway.',
      );
    }
    const origin = safeOrigin(input.successUrl) ?? safeOrigin(input.callbackUrl) ?? '';
    const params = new URLSearchParams({
      payment_id: input.paymentId,
      provider: 'stripe',
    });
    if (settings.sandbox) params.set('sandbox', '1');
    return {
      redirectUrl: `${origin}/checkout/gateway?${params.toString()}`,
      gatewayRef: sessionLikeRef(input.paymentId),
      metadata: { simulated: true },
    };
  }

  async verifyPayment(
    input: PaymentVerifyInput,
    _settings: SitePaymentSettings,
  ): Promise<PaymentVerifyResult> {
    if (input.status && ['FAILED', 'CANCEL', 'NOK'].includes(input.status.toUpperCase())) {
      return { success: false, failureReason: `Gateway status: ${input.status}` };
    }
    // Live Stripe completions arrive via webhook; API verify is for simulator only.
    if (input.gatewayRef && !String(input.gatewayRef).startsWith('cs_')) {
      if (isProductionEnv()) {
        return { success: false, failureReason: 'Simulated payments are not available in production' };
      }
      return { success: true, gatewayRef: input.gatewayRef };
    }
    // For real Stripe sessions, refuse silent confirm — webhook owns completion.
    if (input.gatewayRef?.startsWith('cs_')) {
      throw new BadRequestException(
        'Stripe payments are confirmed via webhook, not the verify endpoint',
      );
    }
    if (isProductionEnv()) {
      return { success: false, failureReason: 'Missing gateway reference' };
    }
    return { success: true, gatewayRef: input.gatewayRef };
  }
}

function safeOrigin(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

function sessionLikeRef(paymentId: string): string {
  return `stripe-sim-${paymentId}`;
}
