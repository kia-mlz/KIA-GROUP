import { Injectable } from '@nestjs/common';
import type { PaymentProviderId, SitePaymentSettings } from '@kia./shared';
import { DevPaymentProvider } from './dev.provider';
import { IdPayPaymentProvider } from './idpay.provider';
import type { PaymentProvider } from './payment-provider';
import { StripePaymentProvider } from './stripe.provider';
import { ZarinPalPaymentProvider } from './zarinpal.provider';

/**
 * Resolves the active PaymentProvider from site settings.
 * Add new gateways by implementing PaymentProvider and registering here.
 */
@Injectable()
export class PaymentProviderRegistry {
  private readonly zarinpal = new ZarinPalPaymentProvider();
  private readonly idpay = new IdPayPaymentProvider();
  private readonly dev = new DevPaymentProvider();

  constructor(private readonly stripe: StripePaymentProvider) {}

  resolve(settings: SitePaymentSettings): PaymentProvider {
    return this.resolveById(settings.provider);
  }

  resolveById(id: PaymentProviderId): PaymentProvider {
    switch (id) {
      case 'zarinpal':
        return this.zarinpal;
      case 'idpay':
        return this.idpay;
      case 'stripe':
        return this.stripe;
      case 'dev':
      default:
        return this.dev;
    }
  }
}
