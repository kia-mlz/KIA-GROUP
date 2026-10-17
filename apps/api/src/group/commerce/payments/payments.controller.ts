import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  RawBodyRequest,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type {
  AuthUser,
  GatewayVerifyResponse,
  InvoiceResponse,
  OrderResponse,
  PaymentResponse,
} from '@kia./shared';
import { IsOptional, IsString } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '@kia./platform';
import { JwtAuthGuard } from '@kia./platform';
import { OptionalJwtAuthGuard } from '@kia./platform';
import { CheckoutBodyDto } from './dto/checkout.dto';
import { PaymentsService } from './payments.service';

class GatewayVerifyBodyDto {
  @IsOptional()
  @IsString()
  paymentId?: string;

  @IsOptional()
  @IsString()
  authority?: string;

  @IsOptional()
  @IsString()
  status?: string;

  // IDPay posts its transaction/order ids under these field names.
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  order_id?: string;
}

class RetryPaymentBodyDto {
  @IsString()
  orderId!: string;
}

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  checkout(@CurrentUser() user: AuthUser, @Body() dto: CheckoutBodyDto): Promise<PaymentResponse> {
    return this.paymentsService.createCheckout(user.id, dto);
  }

  @Post('checkout/cart')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  checkoutCart(@CurrentUser() user: AuthUser): Promise<PaymentResponse> {
    return this.paymentsService.checkoutCart(user.id);
  }

  @Post('retry')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  retry(
    @CurrentUser() user: AuthUser,
    @Body() dto: RetryPaymentBodyDto,
  ): Promise<PaymentResponse> {
    return this.paymentsService.retryPayment(user.id, dto.orderId);
  }

  @Post('confirm/:id')
  @UseGuards(JwtAuthGuard)
  confirm(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<PaymentResponse> {
    return this.paymentsService.confirmPayment(user.id, id);
  }

  @Post('verify')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  verify(
    @CurrentUser() user: AuthUser,
    @Body() dto: GatewayVerifyBodyDto,
  ): Promise<GatewayVerifyResponse> {
    return this.paymentsService.verifyGatewayCallback(user.id, dto);
  }

  /** ZarinPal redirect callback — verifies then redirects the browser. */
  @Get('callback')
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async callbackGet(
    @Res() res: Response,
    @Req() req: Request,
    @Query('payment_id') paymentId?: string,
    @Query('Authority') authority?: string,
    @Query('Status') status?: string,
    @Query('authority') authorityAlt?: string,
    @Query('status') statusAlt?: string,
    // IDPay redirects carry the transaction id as `id` and our id as `order_id`.
    @Query('id') idAlt?: string,
    @Query('order_id') orderIdAlt?: string,
  ): Promise<void> {
    const result = await this.paymentsService.handlePublicCallback({
      paymentId: paymentId || orderIdAlt,
      authority: authority || authorityAlt || idAlt,
      status: status || statusAlt,
    });
    const accept = String(req.headers.accept ?? '');
    if (accept.includes('application/json')) {
      res.json(result);
      return;
    }
    res.redirect(result.redirectUrl);
  }

  @Post('callback')
  @UseGuards(OptionalJwtAuthGuard)
  async callbackPost(
    @Res() res: Response,
    @Req() req: Request,
    @Body() body: GatewayVerifyBodyDto,
    @Query('payment_id') paymentId?: string,
    @Query('Authority') authority?: string,
    @Query('Status') status?: string,
  ): Promise<void> {
    const result = await this.paymentsService.handlePublicCallback({
      paymentId: body.paymentId || body.order_id || paymentId,
      authority: body.authority || body.id || authority,
      status: body.status || status,
    });
    const accept = String(req.headers.accept ?? '');
    if (accept.includes('application/json')) {
      res.json(result);
      return;
    }
    res.redirect(result.redirectUrl);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  getMy(@CurrentUser() user: AuthUser): Promise<PaymentResponse[]> {
    return this.paymentsService.getMyPayments(user.id);
  }

  @Get('wallet')
  @UseGuards(JwtAuthGuard)
  getWallet(
    @CurrentUser() user: AuthUser,
    @Query('limit') limit?: string,
  ): Promise<import('@kia./shared').WalletSummary> {
    const parsed = limit ? Number.parseInt(limit, 10) : 5;
    return this.paymentsService.getWalletSummary(
      user.id,
      Number.isFinite(parsed) ? parsed : 5,
    );
  }

  @Get('transactions')
  @UseGuards(JwtAuthGuard)
  getTransactions(
    @CurrentUser() user: AuthUser,
    @Query('limit') limit?: string,
  ): Promise<import('@kia./shared').WalletTransactionDto[]> {
    const parsed = limit ? Number.parseInt(limit, 10) : 5;
    return this.paymentsService.getWalletTransactions(
      user.id,
      Number.isFinite(parsed) ? parsed : 5,
    );
  }

  @Get('orders')
  @UseGuards(JwtAuthGuard)
  getOrders(@CurrentUser() user: AuthUser): Promise<OrderResponse[]> {
    return this.paymentsService.getMyOrders(user.id);
  }

  @Get('orders/:orderId')
  @UseGuards(JwtAuthGuard)
  getOrder(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
  ): Promise<OrderResponse> {
    return this.paymentsService.getOrderForUser(user.id, orderId);
  }

  @Get('orders/:orderId/invoice')
  @UseGuards(JwtAuthGuard)
  getInvoice(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
  ): Promise<InvoiceResponse> {
    return this.paymentsService.getInvoiceForUser(user.id, orderId);
  }

  @Get('orders/:orderId/invoice.html')
  @UseGuards(JwtAuthGuard)
  async downloadInvoice(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
    @Res() res: Response,
  ): Promise<void> {
    const html = await this.paymentsService.renderInvoiceHtml(user.id, orderId);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="invoice-${orderId}.html"`);
    res.send(html);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  getOne(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<PaymentResponse> {
    return this.paymentsService.getPaymentForUser(user.id, id);
  }

  @Post('webhook')
  webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string | undefined,
  ): Promise<{ received: true }> {
    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException('Raw body is required for Stripe webhook verification');
    }
    return this.paymentsService.handleStripeWebhook(rawBody, signature);
  }
}
