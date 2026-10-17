import { Module } from '@nestjs/common';
import { CartModule } from '../cart/cart.module';
import { EmailModule } from '@kia./platform';
import { SiteSettingsModule } from '@kia./platform';
import { StripeModule } from '../stripe/stripe.module';
import { PaymentProviderRegistry } from './providers/payment-provider.registry';
import { StripePaymentProvider } from './providers/stripe.provider';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [StripeModule, EmailModule, SiteSettingsModule, CartModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, StripePaymentProvider, PaymentProviderRegistry],
  exports: [PaymentsService],
})
export class PaymentsModule {}
