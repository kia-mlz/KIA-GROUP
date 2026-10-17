import { BadRequestException } from '@nestjs/common';
import type { SitePaymentSettings } from '@kia./shared';
import { isProductionEnv } from '@kia./platform';
import type {
  PaymentCreateInput,
  PaymentCreateResult,
  PaymentProvider,
  PaymentVerifyInput,
  PaymentVerifyResult,
} from './payment-provider';

/** In-app / development provider — no external redirect; client confirms. */
export class DevPaymentProvider implements PaymentProvider {
  readonly id = 'dev' as const;

  async createPayment(
    _input: PaymentCreateInput,
    _settings: SitePaymentSettings,
  ): Promise<PaymentCreateResult> {
    if (isProductionEnv()) {
      throw new BadRequestException(
        'Development payment provider is not available in production. Configure a live gateway.',
      );
    }
    return {
      redirectUrl: null,
      gatewayRef: null,
      immediateConfirm: true,
    };
  }

  async verifyPayment(
    _input: PaymentVerifyInput,
    _settings: SitePaymentSettings,
  ): Promise<PaymentVerifyResult> {
    if (isProductionEnv()) {
      return {
        success: false,
        failureReason: 'Development payment provider is not available in production',
      };
    }
    return { success: true, gatewayRef: 'dev' };
  }
}
