import { Module } from '@nestjs/common';
import { SiteSettingsModule } from '@kia./platform';
import { DiscountModule } from '../discounts/discount.module';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

@Module({
  imports: [SiteSettingsModule, DiscountModule],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
