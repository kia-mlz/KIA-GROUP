import { Module } from '@nestjs/common';
import { DiscountService } from './discount.service';

/**
 * The discount engine (validate + compute + record usage). Cart and payments
 * modules import it; admin CRUD lives in the admin module so it reuses the
 * shared audit trail and guard stack.
 */
@Module({
  providers: [DiscountService],
  exports: [DiscountService],
})
export class DiscountModule {}
