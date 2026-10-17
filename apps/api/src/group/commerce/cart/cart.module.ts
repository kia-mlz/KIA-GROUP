import { Module } from '@nestjs/common';
import { SiteSettingsModule } from '@kia./platform';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

@Module({
  imports: [SiteSettingsModule],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
