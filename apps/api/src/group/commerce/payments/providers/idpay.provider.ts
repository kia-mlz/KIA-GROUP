import { BadRequestException } from '@nestjs/common';
import { toGatewayRials, type SitePaymentSettings } from '@kia./shared';
import { isProductionEnv } from '@kia./platform';
import type {
  PaymentCreateInput,
  PaymentCreateResult,
  PaymentProvider,
  PaymentVerifyInput,
  PaymentVerifyResult,
} from './payment-provider';

/**
 * IDPay provider stub with sandbox simulator fallback.
 * Real IDPay REST can be wired later without changing checkout architecture —
 * implement create/verify against https://api.idpay.ir/v1.1/payment.
 */
export class IdPayPaymentProvider implements PaymentProvider {
  readonly id = 'idpay' as const;

  async createPayment(
    input: PaymentCreateInput,
    settings: SitePaymentSettings,
  ): Promise<PaymentCreateResult> {
    const appCallback = input.callbackUrl;
    // Without API credentials, fall back to in-app simulator (legacy behaviour).
    if (!settings.merchantId?.trim() || !settings.apiKey?.trim()) {
      if (isProductionEnv()) {
        throw new BadRequestException(
          'IDPay merchant id and API key are required in production. Simulator checkout is disabled.',
        );
      }
      const params = new URLSearchParams({
        payment_id: input.paymentId,
        provider: 'idpay',
      });
      if (settings.sandbox) params.set('sandbox', '1');
      if (settings.merchantId) params.set('merchant', settings.merchantId);
      // Prefer relative simulator hosted on the web app (callbackUrl origin).
      const origin = safeOrigin(appCallback) ?? safeOrigin(input.successUrl) ?? '';
      return {
        redirectUrl: `${origin}/checkout/gateway?${params.toString()}`,
        gatewayRef: `idpay-sim-${input.paymentId}`,
        metadata: { simulated: true },
      };
    }

    const amount = toGatewayRials(input.amountIrr);
    const base = 'https://api.idpay.ir/v1.1/payment';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-API-KEY': settings.apiKey.trim(),
    };
    if (settings.sandbox) headers['X-SANDBOX'] = '1';

    const res = await fetch(base, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        order_id: input.paymentId,
        amount,
        callback: input.callbackUrl,
        desc: input.description.slice(0, 255),
        mail: input.customerEmail || undefined,
        phone: input.customerPhone || undefined,
      }),
    });
    const json = (await res.json()) as { id?: string; link?: string; error_code?: number; error_message?: string };
    if (!json.link || !json.id) {
      throw new BadRequestException(
        `IDPay request failed: ${json.error_message ?? json.error_code ?? res.status}`,
      );
    }
    return {
      redirectUrl: json.link,
      gatewayRef: json.id,
      metadata: { idpay: true, sandbox: settings.sandbox },
    };
  }

  async verifyPayment(
    input: PaymentVerifyInput,
    settings: SitePaymentSettings,
  ): Promise<PaymentVerifyResult> {
    // Simulator path — confirm without remote call (non-production only)
    if (input.gatewayRef?.startsWith('idpay-sim-') || !settings.apiKey?.trim()) {
      if (isProductionEnv()) {
        return {
          success: false,
          failureReason: 'IDPay simulator verify is disabled in production',
        };
      }
      if (input.status && ['FAILED', 'CANCEL', 'NOK'].includes(input.status.toUpperCase())) {
        return { success: false, failureReason: `Gateway status: ${input.status}` };
      }
      return { success: true, gatewayRef: input.gatewayRef };
    }

    const id = input.authority || input.gatewayRef;
    if (!id) return { success: false, failureReason: 'Missing IDPay transaction id' };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-API-KEY': settings.apiKey.trim(),
    };
    if (settings.sandbox) headers['X-SANDBOX'] = '1';

    const res = await fetch('https://api.idpay.ir/v1.1/payment/verify', {
      method: 'POST',
      headers,
      body: JSON.stringify({ id, order_id: input.paymentId }),
    });
    const json = (await res.json()) as { status?: number; track_id?: number; error_message?: string };
    // IDPay status 100 / 101 = paid
    if (json.status === 100 || json.status === 101) {
      return { success: true, gatewayRef: String(json.track_id ?? id), raw: json };
    }
    return {
      success: false,
      failureReason: json.error_message ?? `IDPay status ${json.status ?? 'unknown'}`,
      raw: json,
    };
  }
}

function safeOrigin(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}
