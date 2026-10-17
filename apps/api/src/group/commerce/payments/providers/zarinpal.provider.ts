import { BadRequestException, Logger } from '@nestjs/common';
import { toGatewayRials, type SitePaymentSettings } from '@kia./shared';
import { isProductionEnv } from '@kia./platform';
import type {
  PaymentCreateInput,
  PaymentCreateResult,
  PaymentProvider,
  PaymentVerifyInput,
  PaymentVerifyResult,
} from './payment-provider';

interface ZarinPalRequestResponse {
  data?: {
    code?: number;
    message?: string;
    authority?: string;
    fee_type?: string;
    fee?: number;
  };
  errors?: unknown;
}

interface ZarinPalVerifyResponse {
  data?: {
    code?: number;
    message?: string;
    ref_id?: number;
    card_pan?: string;
    card_hash?: string;
    fee_type?: string;
    fee?: number;
  };
  errors?: unknown;
}

/**
 * ZarinPal (v4 JSON API). Sandbox uses sandbox.zarinpal.com hosts.
 * Amounts are always sent in Rials.
 */
export class ZarinPalPaymentProvider implements PaymentProvider {
  readonly id = 'zarinpal' as const;
  private readonly logger = new Logger(ZarinPalPaymentProvider.name);

  async createPayment(
    input: PaymentCreateInput,
    settings: SitePaymentSettings,
  ): Promise<PaymentCreateResult> {
    const merchantId = settings.merchantId?.trim();
    // Without a merchant id, keep the legacy in-app simulator so local/dev still works.
    if (!merchantId) {
      if (isProductionEnv()) {
        throw new BadRequestException(
          'ZarinPal merchant id is required in production. Simulator checkout is disabled.',
        );
      }
      const origin = safeOrigin(input.successUrl) ?? safeOrigin(input.callbackUrl) ?? '';
      const params = new URLSearchParams({
        payment_id: input.paymentId,
        provider: 'zarinpal',
      });
      if (settings.sandbox) params.set('sandbox', '1');
      return {
        redirectUrl: `${origin}/checkout/gateway?${params.toString()}`,
        gatewayRef: `zarinpal-sim-${input.paymentId}`,
        metadata: { simulated: true },
      };
    }

    const amount = toGatewayRials(input.amountIrr);
    if (amount < 1000) {
      throw new BadRequestException('ZarinPal minimum amount is 1000 Rials');
    }

    const apiBase = settings.sandbox
      ? 'https://sandbox.zarinpal.com/pg/v4/payment'
      : 'https://api.zarinpal.com/pg/v4/payment';
    const startPayBase = settings.sandbox
      ? 'https://sandbox.zarinpal.com/pg/StartPay'
      : 'https://www.zarinpal.com/pg/StartPay';

    const body = {
      merchant_id: merchantId,
      amount,
      callback_url: input.callbackUrl,
      description: input.description.slice(0, 255),
      metadata: {
        payment_id: input.paymentId,
        email: input.customerEmail || undefined,
        mobile: input.customerPhone || undefined,
        ...input.metadata,
      },
    };

    let json: ZarinPalRequestResponse;
    try {
      const res = await fetch(`${apiBase}/request.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
      });
      json = (await res.json()) as ZarinPalRequestResponse;
    } catch (err) {
      this.logger.error('ZarinPal request failed', err instanceof Error ? err.stack : err);
      throw new BadRequestException('Failed to contact ZarinPal gateway');
    }

    const code = json.data?.code;
    const authority = json.data?.authority;
    if (code !== 100 || !authority) {
      this.logger.warn(`ZarinPal request rejected: ${JSON.stringify(json)}`);
      throw new BadRequestException(
        `ZarinPal request failed (code ${code ?? 'unknown'}): ${json.data?.message ?? 'unknown error'}`,
      );
    }

    return {
      redirectUrl: `${startPayBase}/${authority}`,
      gatewayRef: authority,
      metadata: { zarinpalCode: code, sandbox: settings.sandbox },
    };
  }

  async verifyPayment(
    input: PaymentVerifyInput,
    settings: SitePaymentSettings,
  ): Promise<PaymentVerifyResult> {
    const merchantId = settings.merchantId?.trim();
    const authority = (input.authority || input.gatewayRef || '').trim();

    // Explicit cancel / NOK from return URL
    if (input.status && input.status.toUpperCase() !== 'OK') {
      return {
        success: false,
        gatewayRef: authority || null,
        failureReason: `Gateway status: ${input.status}`,
      };
    }

    // Simulator / missing merchant — only allowed outside production.
    if (!merchantId || authority.startsWith('zarinpal-sim-')) {
      if (isProductionEnv()) {
        return {
          success: false,
          failureReason: 'ZarinPal simulator verify is disabled in production',
        };
      }
      return { success: true, gatewayRef: authority || input.gatewayRef };
    }

    if (!authority) {
      return { success: false, failureReason: 'Missing ZarinPal authority' };
    }

    const apiBase = settings.sandbox
      ? 'https://sandbox.zarinpal.com/pg/v4/payment'
      : 'https://api.zarinpal.com/pg/v4/payment';

    const body = {
      merchant_id: merchantId,
      amount: toGatewayRials(input.amountIrr),
      authority,
    };

    let json: ZarinPalVerifyResponse;
    try {
      const res = await fetch(`${apiBase}/verify.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
      });
      json = (await res.json()) as ZarinPalVerifyResponse;
    } catch (err) {
      this.logger.error('ZarinPal verify failed', err instanceof Error ? err.stack : err);
      return { success: false, failureReason: 'Failed to contact ZarinPal verify API' };
    }

    const code = json.data?.code;
    // 100 = first verify success, 101 = already verified
    if (code === 100 || code === 101) {
      return {
        success: true,
        gatewayRef: String(json.data?.ref_id ?? authority),
        raw: json,
      };
    }

    return {
      success: false,
      gatewayRef: authority,
      failureReason: `ZarinPal verify code ${code ?? 'unknown'}: ${json.data?.message ?? ''}`,
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
