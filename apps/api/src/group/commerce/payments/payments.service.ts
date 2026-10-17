import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import {
  hasCourseEntitlement,
  normalizePaymentSettings,
  entitlementKey,
  toDisplayUnits,
  normalizePaymentCurrency,
  type CheckoutDto,
  type GatewayVerifyDto,
  type GatewayVerifyResponse,
  type InvoiceResponse,
  type OrderItemResponse,
  type OrderResponse,
  type OrderStatus,
  type PaymentResponse,
  type PaymentStatus,
  type SitePaymentSettings,
  type RoadmapResponse,
  type WalletSummary,
  type WalletTransactionDto,
} from '@kia./shared';
import type Stripe from 'stripe';
import { isProductionEnv } from '@kia./platform';
import { Prisma } from '@kia./platform';
import { CartService } from '../cart/cart.service';
import { EmailService } from '@kia./platform';
import { EventBusService } from '@kia./platform';
import { PrismaService } from '@kia./platform';
import { SiteSettingsService } from '@kia./platform';
import { StripeService } from '../stripe/stripe.service';
import {
  assertValidPaymentTransition,
  COMPLETABLE_PAYMENT_STATES,
} from './payment-state';
import { PaymentProviderRegistry } from './providers/payment-provider.registry';

type LineDraft = {
  productType: 'READINESS_TEST' | 'ROADMAP_BUNDLE' | 'COURSE';
  productRef: string;
  title: string;
  thumbnail?: string | null;
  instructor?: string | null;
  unitPriceCents: number;
  discountCents: number;
  finalPriceCents: number;
  quantity: number;
  courseId?: string | null;
};

type InvoiceBuyerLike = {
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string | null;
  phone: string | null;
};

type InvoiceOrderItemLike = {
  id: string;
  productType: 'READINESS_TEST' | 'ROADMAP_BUNDLE' | 'COURSE';
  productRef: string;
  title: string;
  thumbnail?: string | null;
  instructor?: string | null;
  unitPriceCents: number;
  discountCents: number;
  finalPriceCents: number;
  quantity: number;
};

type InvoiceOrderLike = {
  id: string;
  currency: string;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  items: InvoiceOrderItemLike[];
};

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly siteSettings: SiteSettingsService,
    private readonly providers: PaymentProviderRegistry,
    private readonly cartService: CartService,
    private readonly events: EventBusService,
  ) {}

  async createCheckout(userId: string, dto: CheckoutDto): Promise<PaymentResponse> {
    if (dto.fromCart) {
      return this.checkoutCart(userId);
    }
    if (!dto.productType) {
      throw new BadRequestException('productType is required');
    }
    const lines = await this.resolveDirectLines(userId, { ...dto, productType: dto.productType });
    return this.createOrderAndPay(userId, lines, 'DIRECT');
  }

  async checkoutCart(userId: string): Promise<PaymentResponse> {
    const cart = await this.cartService.getCart(userId);
    if (!cart.items.length) {
      throw new BadRequestException('Cart is empty');
    }
    const lines: LineDraft[] = cart.items.map((item) => ({
      productType: 'COURSE',
      productRef: item.courseSlug,
      title: item.title,
      thumbnail: item.thumbnail,
      instructor: item.instructor,
      unitPriceCents: item.priceCents,
      discountCents: item.discountCents,
      finalPriceCents: item.finalPriceCents,
      quantity: 1,
      courseId: item.courseId,
    }));
    return this.createOrderAndPay(userId, lines, 'CART');
  }

  async retryPayment(userId: string, orderId: string): Promise<PaymentResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, payment: true },
    });
    if (!order || order.userId !== userId) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }
    if (order.status === 'PAID') {
      throw new BadRequestException('Order is already paid');
    }
    if (order.payment?.status === 'COMPLETED') {
      throw new BadRequestException('Payment already completed');
    }
    // Refunded money must never be silently re-attempted through retry.
    if (order.payment?.status === 'REFUNDED' || order.payment?.status === 'PARTIALLY_REFUNDED') {
      throw new BadRequestException('Refunded payments cannot be retried');
    }

    const lines: LineDraft[] = order.items.map((item) => ({
      productType: item.productType,
      productRef: item.productRef,
      title: item.title,
      thumbnail: item.thumbnail,
      instructor: item.instructor,
      unitPriceCents: item.unitPriceCents,
      discountCents: item.discountCents,
      finalPriceCents: item.finalPriceCents,
      quantity: item.quantity,
      courseId: item.courseId,
    }));

    const paymentCfg = await this.resolvePaymentConfig();
    this.assertPaymentsEnabled(paymentCfg);

    const productType = lines.length === 1 ? lines[0].productType : 'COURSE';
    const productRef =
      lines.length === 1
        ? lines[0].productRef
        : JSON.stringify(lines.filter((l) => l.productType === 'COURSE').map((l) => l.productRef));

    let paymentId: string;
    if (order.payment) {
      const refreshed = await this.prisma.payment.update({
        where: { id: order.payment.id },      data: {
        status: 'PENDING',
          provider: paymentCfg.provider,
          gatewayRef: null,
          stripeId: null,
          metadata: Prisma.JsonNull,
          amountCents: order.totalCents,
          currency: order.currency,
          productType,
          productRef,
        },
      });
      paymentId = refreshed.id;
    } else {
      const created = await this.prisma.payment.create({
        data: {
          userId,
          orderId: order.id,
          productType,
          productRef,
          amountCents: order.totalCents,
          currency: order.currency,
          status: 'PENDING',
          provider: paymentCfg.provider,
        },
      });
      paymentId = created.id;
    }

    await this.prisma.order.update({
      where: { id: order.id },
      data: { status: 'AWAITING_PAYMENT' },
    });

    return this.startProviderCheckout(userId, paymentId, order.id, lines, paymentCfg);
  }

  async confirmPayment(userId: string, paymentId: string): Promise<PaymentResponse> {
    // Free / in-app confirmation must never run in production — use gateway verify.
    if (isProductionEnv()) {
      throw new BadRequestException(
        'Manual payment confirmation is disabled in production. Complete payment via the gateway callback.',
      );
    }

    const paymentCfg = await this.resolvePaymentConfig();
    if (paymentCfg.provider === 'stripe' && this.stripeService.isConfigured()) {
      const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
      if (payment?.stripeId && !paymentCfg.sandbox && payment.provider === 'stripe') {
        throw new BadRequestException(
          'Payment confirmation via API is only available in development without Stripe',
        );
      }
    }

    const existing = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    // Live ZarinPal (merchant configured, not a simulator ref) must use callback verify.
    if (
      paymentCfg.provider === 'zarinpal' &&
      paymentCfg.merchantId &&
      existing?.gatewayRef &&
      !existing.gatewayRef.startsWith('zarinpal-sim-')
    ) {
      throw new BadRequestException(
        'ZarinPal payments must be confirmed via the gateway callback verify endpoint',
      );
    }

    return this.completePayment(userId, paymentId, { skipOwnershipCheck: false });
  }

  async verifyGatewayCallback(
    userId: string | null,
    dto: GatewayVerifyDto,
  ): Promise<GatewayVerifyResponse> {
    const paymentCfg = await this.resolvePaymentConfig();
    const payment = await this.findPaymentForVerify(dto);
    if (!payment) {
      throw new NotFoundException('Payment not found for gateway callback');
    }
    if (userId && payment.userId !== userId) {
      throw new NotFoundException('Payment not found for gateway callback');
    }

    // Public (unauthenticated) callbacks must prove they belong to this
    // payment's gateway session by carrying the provider-issued authority
    // (gatewayRef). Without this, anyone who learns a payment id could forge a
    // failure — or, with a dev/sandbox provider, a SUCCESS — for that payment.
    // Authenticated callbacks are ownership-checked above and verified
    // server-side through the provider, so they need no extra proof.
    if (!userId && dto.authority !== payment.gatewayRef) {
      const redirectUrl = this.resolveUrl(
        paymentCfg.failureUrl,
        `/checkout/cancel?payment_id=${payment.id}`,
      );
      return { success: false, payment: this.toResponse(payment), redirectUrl };
    }

    const successUrl = this.resolveUrl(
      paymentCfg.successUrl,
      `/checkout/success?payment_id=${payment.id}`,
    );
    const failureUrl = this.resolveUrl(
      paymentCfg.failureUrl,
      `/checkout/cancel?payment_id=${payment.id}`,
    );

    if (payment.status === 'COMPLETED') {
      return {
        success: true,
        payment: this.toResponse(payment),
        redirectUrl: successUrl,
      };
    }

    const provider = this.providers.resolveById(
      (payment.provider as SitePaymentSettings['provider']) || paymentCfg.provider,
    );
    const verify = await provider.verifyPayment(
      {
        paymentId: payment.id,
        amountIrr: payment.amountCents,
        gatewayRef: payment.gatewayRef,
        authority: dto.authority,
        status: dto.status,
        metadata: jsonObjectOrNull(payment.metadata),
      },
      paymentCfg,
    );

    if (!verify.success) {
      // Never clobber a COMPLETED (or newer terminal) state — a stale failure
      // callback arriving after a successful one must not flip money-state.
      // Only non-terminal states (PENDING/PROCESSING) may be marked FAILED.
      await this.prisma.payment.updateMany({
        where: { id: payment.id, status: { in: ['PENDING', 'PROCESSING'] } },
        data: {
          status: 'FAILED',
          gatewayRef: verify.gatewayRef ?? payment.gatewayRef,
          metadata: {
            ...(jsonObjectOrNull(payment.metadata) ?? {}),
            verifyFailure: verify.failureReason,
          },
        },
      });
      if (payment.orderId) {
        await this.prisma.order.updateMany({
          where: { id: payment.orderId, status: { in: ['PENDING', 'AWAITING_PAYMENT'] } },
          data: { status: 'FAILED' },
        });
      }
      return {
        success: false,
        payment: this.toResponse({ ...payment, status: 'FAILED' }),
        redirectUrl: failureUrl,
      };
    }

    const completed = await this.completePayment(payment.userId, payment.id, {
      skipOwnershipCheck: true,
      gatewayRef: verify.gatewayRef ?? dto.authority ?? payment.gatewayRef,
    });

    return { success: true, payment: completed, redirectUrl: successUrl };
  }

  /** Public callback used by ZarinPal redirect (may be unauthenticated). */
  async handlePublicCallback(dto: GatewayVerifyDto): Promise<GatewayVerifyResponse> {
    return this.verifyGatewayCallback(null, dto);
  }

    async getPaymentForUser(userId: string, paymentId: string): Promise<PaymentResponse> {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment || payment.userId !== userId) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }
    return this.toResponse(payment);
  }  /**
   * Admin-initiated refund (full or partial). Validates the payment state machine,
   * transitions the payment, records a wallet CREDIT, and — on a full refund —
   * revokes the entitlements the purchase granted, inside a single DB
   * transaction so the ledger, balance and access all stay consistent.
   * Gateway-side money movement (e.g. ZarinPal reversal) remains a manual
   * operator step; see docs/DEPLOY_RUNBOOK.md.
   */
  async refundPayment(
    paymentId: string,
    amountCents?: number,
    _reason?: string,
  ): Promise<PaymentResponse> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { user: true, order: { include: { items: true } } },
    });
    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }

    // Only COMPLETED payments may be refunded.
    assertValidPaymentTransition(payment.status, 'REFUNDED', 'refundPayment');

    const refundAmount = amountCents ?? payment.amountCents;
    if (refundAmount > payment.amountCents) {
      throw new BadRequestException('Refund amount cannot exceed the payment total');
    }
    if (refundAmount <= 0) {
      throw new BadRequestException('Refund amount must be positive');
    }

    const isPartial = refundAmount < payment.amountCents;
    const newStatus = isPartial ? 'PARTIALLY_REFUNDED' : 'REFUNDED';

    if (isPartial) {
      assertValidPaymentTransition(payment.status, 'PARTIALLY_REFUNDED', 'refundPayment');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Atomic single-winner: only COMPLETED may transition; lost-update on a
      // concurrent refund is rejected by the conditional claim.
      const claimed = await tx.payment.updateMany({
        where: { id: paymentId, status: payment.status },
        data: { status: newStatus },
      });
      if (claimed.count === 0) {
        const current = await tx.payment.findUnique({ where: { id: paymentId } });
        throw new BadRequestException(
          `Payment ${paymentId} is in state ${(current?.status ?? 'unknown')} — cannot refund`,
        );
      }

      // Record wallet CREDIT for the refunded amount.
      await this.recordWalletCreditTx(
        tx,
        {
          id: payment.id,
          userId: payment.userId,
          amountCents: payment.amountCents,
          productType: payment.productType,
          productRef: payment.productRef,
        },
        refundAmount,
      );

      // Full refund: revoke exactly the access this payment granted (and only
      // purchase-sourced grants — admin gifts / challenge rewards survive).
      if (!isPartial) {
        await this.revokeEntitlementsTx(tx, payment);
      }

      // Update order status for full refunds.
      if (!isPartial && payment.orderId) {
        await tx.order.updateMany({
          where: { id: payment.orderId, status: 'PAID' },
          data: { status: 'REFUNDED' },
        });
      }

      return tx.payment.findUnique({ where: { id: paymentId } });
    });

    if (!updated) {
      throw new NotFoundException(`Payment ${paymentId} not found after refund`);
    }

    return this.toResponse(updated);
  }


  async handleStripeWebhook(
    rawBody: Buffer,
    signature: string | string[] | undefined,
  ): Promise<{ received: true }> {
    if (!signature || Array.isArray(signature)) {
      throw new BadRequestException('Missing Stripe signature');
    }

    const event = this.stripeService.constructWebhookEvent(rawBody, signature);

    // Exactly-once processing: the event id is the idempotency key. A replayed
    // webhook (same id) hits the unique constraint and is skipped; failed
    // processing deletes the row so the provider retry re-processes.
    let recordId: string;
    try {
      const record = await this.prisma.paymentWebhookEvent.create({
        data: {
          eventId: event.id,
          provider: 'stripe',
          eventType: event.type,
          payload: JSON.stringify({ id: event.id, type: event.type }),
        },
      });
      recordId = record.id;
    } catch (err) {
      if ((err as { code?: string } | null)?.code === 'P2002') {
        // Duplicate delivery — already processed. Idempotent acknowledgement.
        return { received: true };
      }
      throw err;
    }

    try {
      if (event.type === 'checkout.session.completed') {
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      }
    } catch (err) {
      // Release the idempotency claim so a retry can reprocess exactly once.
      await this.prisma.paymentWebhookEvent
        .delete({ where: { id: recordId } })
        .catch(() => undefined);
      throw err;
    }

    return { received: true };
  }

  async getMyPayments(userId: string): Promise<PaymentResponse[]> {
    const payments = await this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return payments.map((payment) => this.toResponse(payment));
  }

  /** Ensure a wallet row exists (lazy create for existing learners). */
  async ensureWallet(userId: string) {
    const existing = await this.prisma.learnerWallet.findUnique({ where: { userId } });
    if (existing) return existing;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true },
    });
    const digits = (user?.phone ?? userId).replace(/\D/g, '');
    const cardLast4 = (digits.slice(-4) || '1234').padStart(4, '0').slice(-4);

    return this.prisma.learnerWallet.create({
      data: {
        userId,
        balanceCents: 0,
        cardLast4,
        expiresLabel: '06/27',
      },
    });
  }

  async getWalletSummary(userId: string, limit = 5): Promise<WalletSummary> {
    const wallet = await this.ensureWallet(userId);
    const take = Math.min(Math.max(limit, 1), 50);

    const [ledger, payments] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        take,
      }),
      this.prisma.payment.findMany({
        where: {
          userId,
          status: { in: ['COMPLETED', 'REFUNDED'] },
        },
        orderBy: { createdAt: 'desc' },
        take,
      }),
    ]);

    const fromLedger: WalletTransactionDto[] = ledger.map((row) => ({
      id: row.id,
      description: row.description,
      amountCents: row.type === 'CREDIT' ? row.amountCents : -row.amountCents,
      type: row.type === 'CREDIT' ? 'credit' : 'debit',
      createdAt: row.createdAt.toISOString(),
      paymentId: row.paymentId,
    }));

    const ledgerPaymentIds = new Set(
      ledger.map((row) => row.paymentId).filter((id): id is string => Boolean(id)),
    );

    const fromPayments: WalletTransactionDto[] = payments
      .filter((payment) => !ledgerPaymentIds.has(payment.id))
      .map((payment) => {
        const isRefund = payment.status === 'REFUNDED';
        return {
          id: `pay-${payment.id}`,
          description: this.paymentDescription(payment.productType, payment.productRef),
          amountCents: isRefund ? payment.amountCents : -payment.amountCents,
          type: isRefund ? ('credit' as const) : ('debit' as const),
          createdAt: payment.createdAt.toISOString(),
          paymentId: payment.id,
        };
      });

    const merged = [...fromLedger, ...fromPayments]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, take);

    return {
      balanceCents: wallet.balanceCents,
      currency: wallet.currency,
      cardLast4: wallet.cardLast4,
      expiresLabel: wallet.expiresLabel,
      transactions: merged,
    };
  }

    async getWalletTransactions(userId: string, limit = 5): Promise<WalletTransactionDto[]> {
    const summary = await this.getWalletSummary(userId, limit);
    return summary.transactions;
  }

  /**
   * Record the payment as a wallet DEBIT — creates (or lazy-creates) the learner's
   * wallet, inserts a DEBIT ledger row linked to the payment, and decrements the
   * running balance. Runs inside the caller's DB transaction so the ledger and
   * balance are always consistent with the payment state machine.
   */
    private async recordWalletDebitTx(
    tx: Prisma.TransactionClient,
    payment: { id: string; userId: string; amountCents: number; productType: PaymentResponse['productType']; productRef: string | null },
  ): Promise<void> {
    const wallet = await this.ensureWalletTx(tx, payment.userId);

    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'DEBIT',
        amountCents: payment.amountCents,
        description: this.paymentDescription(payment.productType, payment.productRef ?? undefined),
        paymentId: payment.id,
      },
    });

    await tx.learnerWallet.update({
      where: { id: wallet.id },
      data: {
        balanceCents: { decrement: payment.amountCents },
      },
    });
  }

  /**
   * Revoke the access a payment granted when its money is fully refunded.
   * Deletes purchase-sourced entitlements + course enrollments derived from
   * this payment's product; wallet balances and the ledger row stay (money
   * returned to the wallet is the learner's). Grants that did not originate
   * from this purchase (admin grants, challenge rewards) are left intact.
   */
  private async revokeEntitlementsTx(
    tx: Prisma.TransactionClient,
    payment: {
      id: string;
      userId: string;
      productType: 'READINESS_TEST' | 'ROADMAP_BUNDLE' | 'COURSE';
      productRef: string | null;
    },
  ): Promise<void> {
    switch (payment.productType) {
      case 'READINESS_TEST':
        await tx.entitlement.deleteMany({
          where: {
            userId: payment.userId,
            resourceType: 'readiness',
            resourceId: 'test',
            source: { in: ['PURCHASE'] },
          },
        });
        break;

      case 'ROADMAP_BUNDLE': {
        await tx.entitlement.deleteMany({
          where: {
            userId: payment.userId,
            resourceType: 'roadmap',
            resourceId: payment.productRef ?? '__none__',
            source: { in: ['PURCHASE', 'BUNDLE'] },
          },
        });
        if (payment.productRef) {
          await tx.roadmap.updateMany({
            where: { id: payment.productRef, paymentId: payment.id },
            data: { enrolled: false, paymentId: null },
          });
        }
        break;
      }

      case 'COURSE': {
        for (const slug of this.parseCourseRefs(payment.productRef)) {
          const course = await tx.course.findFirst({
            where: { OR: [{ slug }, { id: slug }] },
          });
          const courseSlug = course?.slug ?? slug;
          await tx.entitlement.deleteMany({
            where: {
              userId: payment.userId,
              resourceType: 'course',
              resourceId: courseSlug,
              source: { in: ['PURCHASE'] },
            },
          });
          if (course) {
            await tx.enrollment.deleteMany({
              where: { userId: payment.userId, courseId: course.id },
            });
          }
        }
        break;
      }
    }
  }

  /**
   * Record a wallet CREDIT for a refund — links to the original payment so the
   * ledger audit trail is complete. The caller must have validated the refund
   * state transition before reaching here.
   */
    private async recordWalletCreditTx(
    tx: Prisma.TransactionClient,
    payment: { id: string; userId: string; amountCents: number; productType: PaymentResponse['productType']; productRef: string | null },
    refundCents: number,
  ): Promise<void> {
    const wallet = await this.ensureWalletTx(tx, payment.userId);

    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'CREDIT',
        amountCents: refundCents,
        description: `بازپرداخت برای ${this.paymentDescription(payment.productType, payment.productRef ?? undefined)}`,
        paymentId: payment.id,
      },
    });

    await tx.learnerWallet.update({
      where: { id: wallet.id },
      data: {
        balanceCents: { increment: refundCents },
      },
    });
  }

  /** Lazy-create a learner wallet using the provided transaction client. */
  private async ensureWalletTx(tx: Prisma.TransactionClient, userId: string) {
    const existing = await tx.learnerWallet.findUnique({ where: { userId } });
    if (existing) return existing;

    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { phone: true },
    });
    const digits = (user?.phone ?? userId).replace(/\D/g, '');
    const cardLast4 = (digits.slice(-4) || '1234').padStart(4, '0').slice(-4);

    return tx.learnerWallet.create({
      data: { userId, balanceCents: 0, cardLast4, expiresLabel: '06/27' },
    });
  }


  private paymentDescription(
    productType: PaymentResponse['productType'],
    productRef?: string | null,
  ): string {
    switch (productType) {
      case 'ROADMAP_BUNDLE':
        return 'خرید بسته نقشه راه';
      case 'READINESS_TEST':
        return 'پرداخت آزمون آمادگی';
      case 'COURSE':
        return productRef ? `خرید دوره ${productRef}` : 'خرید دوره';
      default:
        return 'تراکنش پرداخت';
    }
  }

  async getMyOrders(userId: string): Promise<OrderResponse[]> {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: { items: true, payment: true, invoice: true },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((o) => this.toOrderResponse(o));
  }

  async getOrderForUser(userId: string, orderId: string): Promise<OrderResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, payment: true, invoice: true },
    });
    if (!order || order.userId !== userId) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }
    return this.toOrderResponse(order);
  }

  async getInvoiceForUser(userId: string, orderId: string): Promise<InvoiceResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { invoice: true, items: true },
    });
    if (!order || order.userId !== userId) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }
    if (!order.invoice) {
      throw new NotFoundException(`Invoice for order ${orderId} not found`);
    }
    return this.toInvoiceResponse(order.invoice, order.items);
  }

  async renderInvoiceHtml(userId: string, orderId: string): Promise<string> {
    const invoice = await this.getInvoiceForUser(userId, orderId);
    const settings = await this.siteSettings.get();
    const siteName = settings.general.siteName || 'kia.';
    const currency = normalizePaymentCurrency(invoice.currency || settings.payment?.currency);
    const label = currency === 'irt' ? 'IRT' : 'IRR';
    const fmt = (amount: number) => `${toDisplayUnits(amount, currency)} ${label}`;
    const rows = invoice.lineItems
      .map(
        (line) =>
          `<tr><td>${escapeHtml(line.title)}</td><td>${line.quantity}</td><td>${fmt(line.finalPriceCents)}</td></tr>`,
      )
      .join('');
    return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(invoice.invoiceNumber)} — ${escapeHtml(siteName)}</title>
  <style>
    body { font-family: Tahoma, sans-serif; padding: 2rem; color: #111; }
    h1 { font-size: 1.25rem; }
    table { width: 100%; border-collapse: collapse; margin-top: 1.5rem; }
    th, td { border: 1px solid #ddd; padding: 0.5rem; text-align: right; }
    th { background: #f5f5f5; }
    .meta { margin: 0.25rem 0; color: #444; font-size: 0.9rem; }
    .total { font-weight: bold; font-size: 1.1rem; margin-top: 1rem; }
    @media print { button { display: none; } }
  </style>
</head>
<body>
  <button onclick="window.print()">Print / Save PDF</button>
  <h1>${escapeHtml(siteName)} — Invoice</h1>
  <p class="meta">Invoice #: ${escapeHtml(invoice.invoiceNumber)}</p>
  <p class="meta">Date: ${escapeHtml(invoice.issuedAt)}</p>
  <p class="meta">Buyer: ${escapeHtml(invoice.buyerName)}</p>
  ${invoice.buyerEmail ? `<p class="meta">Email: ${escapeHtml(invoice.buyerEmail)}</p>` : ''}
  ${invoice.buyerPhone ? `<p class="meta">Phone: ${escapeHtml(invoice.buyerPhone)}</p>` : ''}
  <table>
    <thead><tr><th>Item</th><th>Qty</th><th>Amount (${label})</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <p class="total">Total: ${fmt(invoice.totalCents)}</p>
</body>
</html>`;
  }

  // --- internals -----------------------------------------------------------

  private async createOrderAndPay(
    userId: string,
    lines: LineDraft[],
    source: 'CART' | 'DIRECT',
  ): Promise<PaymentResponse> {
    const paymentCfg = await this.resolvePaymentConfig();
    this.assertPaymentsEnabled(paymentCfg);

    if (!lines.length) {
      throw new BadRequestException('Nothing to checkout');
    }

    await this.assertNotAlreadyOwned(userId, lines);

    const subtotalCents = lines.reduce((s, l) => s + l.unitPriceCents * l.quantity, 0);
    const discountCents = lines.reduce((s, l) => s + l.discountCents, 0);
    const totalCents = lines.reduce((s, l) => s + l.finalPriceCents, 0);
    const currency = paymentCfg.currency;

    const productType = lines.length === 1 ? lines[0].productType : 'COURSE';
    const productRef =
      lines.length === 1
        ? lines[0].productRef
        : JSON.stringify(
            lines.filter((l) => l.productType === 'COURSE').map((l) => l.productRef),
          );

    const order = await this.prisma.order.create({
      data: {
        userId,
        status: 'AWAITING_PAYMENT',
        subtotalCents,
        discountCents,
        totalCents,
        currency,
        source,
        items: {
          create: lines.map((l) => ({
            productType: l.productType,
            productRef: l.productRef,
            title: l.title,
            thumbnail: l.thumbnail ?? null,
            instructor: l.instructor ?? null,
            unitPriceCents: l.unitPriceCents,
            discountCents: l.discountCents,
            finalPriceCents: l.finalPriceCents,
            quantity: l.quantity,
            courseId: l.courseId ?? null,
          })),
        },
      },
    });

    const payment = await this.prisma.payment.create({
      data: {
        userId,
        orderId: order.id,
        productType,
        productRef,
        amountCents: totalCents,
        currency,
        status: 'PENDING',
        provider: paymentCfg.provider,
      },
    });

    return this.startProviderCheckout(userId, payment.id, order.id, lines, paymentCfg);
  }

  private async startProviderCheckout(
    userId: string,
    paymentId: string,
    orderId: string,
    lines: LineDraft[],
    paymentCfg: SitePaymentSettings,
  ): Promise<PaymentResponse> {
    const payment = await this.prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const provider = this.providers.resolve(paymentCfg);

    const callbackUrl = this.resolveUrl(
      paymentCfg.callbackUrl,
      `/api/payments/callback?payment_id=${payment.id}`,
    );
    const successUrl = this.resolveUrl(
      paymentCfg.successUrl,
      `/checkout/success?payment_id=${payment.id}`,
    );
    const cancelUrl = this.resolveUrl(
      paymentCfg.failureUrl,
      `/checkout/cancel?payment_id=${payment.id}`,
    );

    const description =
      paymentCfg.description?.trim() ||
      (lines.length === 1 ? lines[0].title : `${lines.length} courses — kia.`);

    const result = await provider.createPayment(
      {
        paymentId: payment.id,
        amountIrr: payment.amountCents,
        description,
        customerEmail: user.email,
        customerPhone: user.phone,
        callbackUrl,
        successUrl,
        cancelUrl,
        metadata: { orderId },
      },
      paymentCfg,
    );

    const updated = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        gatewayRef: result.gatewayRef,
        stripeId:
          paymentCfg.provider === 'stripe' && result.gatewayRef?.startsWith('cs_')
            ? result.gatewayRef
            : payment.stripeId,
        metadata:
          result.metadata !== undefined
            ? (result.metadata as Prisma.InputJsonValue)
            : (payment.metadata as Prisma.InputJsonValue | undefined),
        provider: paymentCfg.provider,
      },
    });

    if (result.immediateConfirm) {
      // Dev provider — caller will confirm; return without checkoutUrl.
      return this.toResponse(updated);
    }

    return this.toResponse(updated, result.redirectUrl ?? undefined);
  }

  private async completePayment(
    userId: string,
    paymentId: string,
    opts: {
      skipOwnershipCheck: boolean;
      gatewayRef?: string | null;
    },
  ): Promise<PaymentResponse> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { user: true, order: { include: { items: true } } },
    });

    if (!payment || (!opts.skipOwnershipCheck && payment.userId !== userId)) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }

    if (payment.status === 'COMPLETED') {
      return this.toResponse(payment);
    }

    // Strict payment state machine: only PENDING/PROCESSING may reach COMPLETED.
    // FAILED → COMPLETED, REFUNDED → COMPLETED, CANCELLED → COMPLETED are rejected.
    assertValidPaymentTransition(payment.status, 'COMPLETED', 'completePayment');

    // Atomic single-winner transition + atomic financial side effects. Concurrent
    // triggers (gateway redirect callback + client verify POST + Stripe webhook)
    // race here; the one that flips PENDING/PROCESSING → COMPLETED runs the
    // side effects exactly once inside the same transaction.
    const allowedClaim = { in: [...COMPLETABLE_PAYMENT_STATES] } as const;
    const completed = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.payment.updateMany({
        where: { id: paymentId, status: allowedClaim as never },
        data: {
          status: 'COMPLETED',
          ...(opts.gatewayRef ? { gatewayRef: opts.gatewayRef } : {}),
        },
      });
      if (claimed.count === 0) {
        // Lost the race or illegal state. Re-read to give an accurate answer.
        const current = await tx.payment.findUnique({ where: { id: paymentId } });
        if (!current) {
          throw new NotFoundException(`Payment ${paymentId} not found`);
        }
        if (current.status === 'COMPLETED') {
          return current;
        }
        throw new BadRequestException(
          `Cannot complete payment in state ${current.status}`,
        );
      }

            const fresh =
        (await tx.payment.findUnique({ where: { id: paymentId } })) ?? payment;

      await this.grantEntitlements(tx, fresh);

      // Record the payment as a wallet DEBIT inside the same transaction so the
      // ledger and balance are always consistent with the payment state machine.
      await this.recordWalletDebitTx(tx, fresh);

      if (payment.orderId) {
        const order = await tx.order.findUniqueOrThrow({
          where: { id: payment.orderId },
          include: { items: true },
        });

        const existingInvoice = await tx.invoice.findUnique({
          where: { orderId: order.id },
        });
        if (!existingInvoice) {
          await this.markOrderPaidAndCreateInvoiceTx(tx, order, payment);
        }
      }
      return fresh;
    });

    // Cart clearing is cosmetic — safe outside the money transaction and guarded
    // so a failure here never blocks or rolls back the completion.
    if (payment.orderId && payment.order?.source === 'CART') {
      await this.cartService.clearCart(payment.userId).catch(() => undefined);
    }

    await this.emailService.sendPaymentReceipt(
      {
        id: payment.user.id,
        name: payment.user.name,
        email: payment.user.email ?? 'noreply@kia.academy',
      },
      completed,
    );

    // Domain event: commerce announces the completed payment (with the
    // entitlement keys it granted) so departments can react — notification
    // center, analytics — without importing payments services.
    await this.events
      .publish({
        name: 'group.payment.completed',
        occurredAt: new Date().toISOString(),
        userId: payment.userId,
        paymentId: completed.id,
        orderId: completed.orderId ?? '',
        amountCents: completed.amountCents,
        grantedEntitlements: this.grantedEntitlementKeys(completed),
      })
      .catch(() => undefined);

    return this.toResponse(completed);
  }

  private async resolveDirectLines(userId: string, dto: CheckoutDto): Promise<LineDraft[]> {
    const settings = await this.siteSettings.get();
    const siteName = settings.general.siteName || 'کیا.';
    const trackMap = new Map(settings.tracks.map((t) => [t.key, t.name]));

    if (dto.productType === 'READINESS_TEST') {
      throw new BadRequestException('Readiness test is free and no longer sold separately');
    }

    if (dto.productType === 'COURSE') {
      const slugs = dto.courseSlugs?.length
        ? [...new Set(dto.courseSlugs.map((s) => s.trim()).filter(Boolean))]
        : dto.productRef
          ? this.parseCourseRefs(dto.productRef)
          : [];
      if (!slugs.length) {
        throw new BadRequestException('productRef or courseSlugs is required for COURSE checkout');
      }

      const lines: LineDraft[] = [];
      for (const slug of slugs) {
        const course = await this.prisma.course.findFirst({
          where: { OR: [{ slug }, { id: slug }], published: true },
        });
        if (!course) throw new NotFoundException(`Course ${slug} not found`);
        const unit = settings.pricing.courseCents;
        lines.push({
          productType: 'COURSE',
          productRef: course.slug,
          title: course.title,
          thumbnail: course.icon || '📘',
          instructor: (course.trackKey && trackMap.get(course.trackKey)) || siteName,
          unitPriceCents: unit,
          discountCents: 0,
          finalPriceCents: unit,
          quantity: 1,
          courseId: course.id,
        });
      }
      return lines;
    }

    if (dto.productType === 'ROADMAP_BUNDLE') {
      if (!dto.productRef) {
        throw new BadRequestException(
          'productRef (roadmap id) is required for ROADMAP_BUNDLE checkout',
        );
      }
      const roadmap = await this.prisma.roadmap.findUnique({ where: { id: dto.productRef } });
      if (!roadmap || roadmap.userId !== userId) {
        throw new NotFoundException(`Roadmap ${dto.productRef} not found`);
      }
      const pricing = roadmap.pricing as unknown as RoadmapResponse['pricing'];
      return [
        {
          productType: 'ROADMAP_BUNDLE',
          productRef: roadmap.id,
          title: `${roadmap.trackName} roadmap bundle`,
          thumbnail: '🗺️',
          instructor: siteName,
          unitPriceCents: pricing.total,
          discountCents: Math.max(0, pricing.total - pricing.discounted),
          finalPriceCents: pricing.discounted,
          quantity: 1,
        },
      ];
    }

    throw new BadRequestException(`Unsupported product type: ${dto.productType}`);
  }

  private async assertNotAlreadyOwned(userId: string, lines: LineDraft[]): Promise<void> {
    const entitlements = await this.prisma.entitlement.findMany({ where: { userId } });
    const entitlementKeys = entitlements.map((e) => entitlementKey(e.resourceType, e.resourceId));
    for (const line of lines) {
      if (line.productType === 'COURSE' && hasCourseEntitlement(entitlementKeys, line.productRef)) {
        throw new BadRequestException(`Course already purchased: ${line.productRef}`);
      }
      if (line.productType === 'ROADMAP_BUNDLE') {
        const roadmap = await this.prisma.roadmap.findUnique({ where: { id: line.productRef } });
        if (roadmap?.enrolled) {
          throw new BadRequestException('Roadmap bundle already purchased');
        }
      }
    }
  }

  private async findPaymentForVerify(dto: GatewayVerifyDto) {
    if (dto.paymentId) {
      return this.prisma.payment.findUnique({ where: { id: dto.paymentId } });
    }
    if (dto.authority) {
      return this.prisma.payment.findFirst({
        where: { gatewayRef: dto.authority },
        orderBy: { createdAt: 'desc' },
      });
    }
    return null;
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const paymentId = session.metadata?.paymentId;
    if (!paymentId) return;

    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment || payment.status === 'COMPLETED') return;

    await this.completePayment(payment.userId, payment.id, {
      skipOwnershipCheck: true,
      gatewayRef: session.id,
    });
  }

  private async resolvePaymentConfig(): Promise<SitePaymentSettings> {
    const settings = await this.siteSettings.get();
    return normalizePaymentSettings(settings.payment);
  }

  private assertPaymentsEnabled(cfg: SitePaymentSettings): void {
    if (!cfg.enabled) {
      throw new BadRequestException('Payments are currently disabled');
    }
  }

  private resolveUrl(configured: string, fallbackPath: string): string {
    const appUrl = this.configService.get<string>('APP_URL', 'http://localhost:3000');
    const value = (configured || '').trim();
    if (!value) return `${appUrl.replace(/\/$/, '')}${fallbackPath.startsWith('/') ? '' : '/'}${fallbackPath}`;
    if (/^https?:\/\//i.test(value)) {
      // If absolute URL already includes query, append payment context on caller side.
      return value;
    }
    return `${appUrl.replace(/\/$/, '')}${value.startsWith('/') ? '' : '/'}${value}`;
  }

  private parseCourseRefs(productRef: string | null): string[] {
    if (!productRef) return [];
    try {
      const parsed = JSON.parse(productRef) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === 'string' && item.length > 0);
      }
    } catch {
      /* single slug */
    }
    return [productRef];
  }

  /**
   * Collision-safe invoice number: time + CSPRNG instead of the old count-based
   * CONUS race (two concurrent completions could draw the same padded count).
   * Fully unique even under concurrent orders, so no in-transaction retry.
   */
  private nextInvoiceNumber(): string {
    return `INV-${new Date().getFullYear()}-${randomBytes(4).toString('hex').toUpperCase()}`;
  }

  /**
   * Marks the order PAID and creates its invoice INSIDE the same DB transaction
   * as the payment claim — order + invoice + entitlements commit or roll back
   * together, so a failed invoice can never leave a paid order without a
   * financial record (or vice-versa).
   */
  private async markOrderPaidAndCreateInvoiceTx(
    tx: Prisma.TransactionClient,
    order: InvoiceOrderLike,
    buyer: { user: InvoiceBuyerLike },
  ): Promise<void> {
    const invoiceNumber = this.nextInvoiceNumber();
    await tx.order.update({
      where: { id: order.id },
      data: { status: 'PAID', invoiceNumber },
    });
    await tx.invoice.create({
      data: {
        orderId: order.id,
        invoiceNumber,
        buyerName:
          buyer.user.name ||
          [buyer.user.firstName, buyer.user.lastName].filter(Boolean).join(' ') ||
          'Learner',
        buyerEmail: buyer.user.email,
        buyerPhone: buyer.user.phone,
        currency: order.currency,
        subtotalCents: order.subtotalCents,
        discountCents: order.discountCents,
        totalCents: order.totalCents,
        lineItems: JSON.stringify(order.items.map((item) => this.toOrderItemResponse(item))),
      },
    });
  }

  /** Entitlement keys (`<type>:<ref>`) granted by a completed payment. */
  private grantedEntitlementKeys(payment: {
    productType: 'READINESS_TEST' | 'ROADMAP_BUNDLE' | 'COURSE';
    productRef?: string | null;
  }): string[] {
    switch (payment.productType) {
      case 'READINESS_TEST':
        return ['readiness:test'];
      case 'ROADMAP_BUNDLE':
        return payment.productRef ? [`roadmap:${payment.productRef}`] : [];
      case 'COURSE':
        return this.parseCourseRefs(payment.productRef ?? null).map((slug) => `course:${slug}`);
    }
  }

  private async grantEntitlements(
    tx: Prisma.TransactionClient,
    payment: {
      id: string;
      userId: string;
      productType: 'READINESS_TEST' | 'ROADMAP_BUNDLE' | 'COURSE';
      productRef: string | null;
    },
  ): Promise<void> {
    switch (payment.productType) {
      case 'READINESS_TEST':
        await tx.entitlement.upsert({
          where: {
            userId_resourceType_resourceId: {
              userId: payment.userId,
              resourceType: 'readiness',
              resourceId: 'test',
            },
          },
          create: {
            userId: payment.userId,
            resourceType: 'readiness',
            resourceId: 'test',
            source: 'PURCHASE',
          },
          update: { source: 'PURCHASE' },
        });
        break;

      case 'ROADMAP_BUNDLE':
        if (!payment.productRef) {
          throw new BadRequestException('Roadmap reference missing on payment');
        }
        await tx.entitlement.upsert({
          where: {
            userId_resourceType_resourceId: {
              userId: payment.userId,
              resourceType: 'roadmap',
              resourceId: payment.productRef,
            },
          },
          create: {
            userId: payment.userId,
            resourceType: 'roadmap',
            resourceId: payment.productRef,
            source: 'BUNDLE',
          },
          update: { source: 'BUNDLE' },
        });
        await tx.roadmap.update({
          where: { id: payment.productRef },
          data: { enrolled: true, paymentId: payment.id },
        });
        break;

      case 'COURSE':
        for (const slug of this.parseCourseRefs(payment.productRef)) {
          const course = await tx.course.findFirst({
            where: { OR: [{ slug }, { id: slug }] },
          });
          const courseSlug = course?.slug ?? slug;
          await tx.entitlement.upsert({
            where: {
              userId_resourceType_resourceId: {
                userId: payment.userId,
                resourceType: 'course',
                resourceId: courseSlug,
              },
            },
            create: {
              userId: payment.userId,
              resourceType: 'course',
              resourceId: courseSlug,
              source: 'PURCHASE',
            },
            update: { source: 'PURCHASE' },
          });
          if (course) {
            await tx.enrollment.upsert({
              where: { userId_courseId: { userId: payment.userId, courseId: course.id } },
              create: { userId: payment.userId, courseId: course.id },
              update: {},
            });
          }
        }
        break;
    }
  }

  private toResponse(
    payment: {
      id: string;
      productType: 'READINESS_TEST' | 'ROADMAP_BUNDLE' | 'COURSE';
      productRef?: string | null;
      amountCents: number;
      currency: string;
      status: PaymentStatus;
      orderId?: string | null;
      provider?: string | null;
      createdAt?: Date;
      updatedAt?: Date;
    },
    checkoutUrl?: string,
  ): PaymentResponse {
    return {
      id: payment.id,
      productType: payment.productType,
      productRef: payment.productRef ?? null,
      amountCents: payment.amountCents,
      currency: payment.currency,
      status: payment.status,
      checkoutUrl,
      orderId: payment.orderId ?? null,
      provider: payment.provider ?? null,
      createdAt: payment.createdAt?.toISOString(),
      updatedAt: payment.updatedAt?.toISOString(),
    };
  }

  private toOrderItemResponse(item: {
    id: string;
    productType: 'READINESS_TEST' | 'ROADMAP_BUNDLE' | 'COURSE';
    productRef: string;
    title: string;
    thumbnail?: string | null;
    instructor?: string | null;
    unitPriceCents: number;
    discountCents: number;
    finalPriceCents: number;
    quantity: number;
  }): OrderItemResponse {
    return {
      id: item.id,
      productType: item.productType,
      productRef: item.productRef,
      title: item.title,
      thumbnail: item.thumbnail,
      instructor: item.instructor,
      unitPriceCents: item.unitPriceCents,
      discountCents: item.discountCents,
      finalPriceCents: item.finalPriceCents,
      quantity: item.quantity,
    };
  }

  private toInvoiceResponse(
    invoice: {
      id: string;
      orderId: string;
      invoiceNumber: string;
      issuedAt: Date;
      buyerName: string;
      buyerEmail: string | null;
      buyerPhone: string | null;
      currency: string;
      subtotalCents: number;
      discountCents: number;
      totalCents: number;
      lineItems: Prisma.JsonValue;
    },
    fallbackItems: Array<{
      id: string;
      productType: 'READINESS_TEST' | 'ROADMAP_BUNDLE' | 'COURSE';
      productRef: string;
      title: string;
      thumbnail?: string | null;
      instructor?: string | null;
      unitPriceCents: number;
      discountCents: number;
      finalPriceCents: number;
      quantity: number;
    }>,
  ): InvoiceResponse {
    let lineItems: OrderItemResponse[] = fallbackItems.map((i) => this.toOrderItemResponse(i));
    const parsed = invoice.lineItems;
    if (Array.isArray(parsed) && parsed.length) {
      lineItems = parsed as unknown as OrderItemResponse[];
    }
    return {
      id: invoice.id,
      orderId: invoice.orderId,
      invoiceNumber: invoice.invoiceNumber,
      issuedAt: invoice.issuedAt.toISOString(),
      buyerName: invoice.buyerName,
      buyerEmail: invoice.buyerEmail,
      buyerPhone: invoice.buyerPhone,
      currency: invoice.currency,
      subtotalCents: invoice.subtotalCents,
      discountCents: invoice.discountCents,
      totalCents: invoice.totalCents,
      lineItems,
      downloadPath: `/api/payments/orders/${invoice.orderId}/invoice.html`,
    };
  }

  private toOrderResponse(order: {
    id: string;
    status: OrderStatus;
    invoiceNumber: string | null;
    subtotalCents: number;
    discountCents: number;
    totalCents: number;
    currency: string;
    createdAt: Date;
    updatedAt: Date;
    items: Array<{
      id: string;
      productType: 'READINESS_TEST' | 'ROADMAP_BUNDLE' | 'COURSE';
      productRef: string;
      title: string;
      thumbnail?: string | null;
      instructor?: string | null;
      unitPriceCents: number;
      discountCents: number;
      finalPriceCents: number;
      quantity: number;
    }>;
    payment?: {
      id: string;
      status: PaymentStatus;
    } | null;
    invoice?: {
      id: string;
      orderId: string;
      invoiceNumber: string;
      issuedAt: Date;
      buyerName: string;
      buyerEmail: string | null;
      buyerPhone: string | null;
      currency: string;
      subtotalCents: number;
      discountCents: number;
      totalCents: number;
      lineItems: Prisma.JsonValue;
    } | null;
  }): OrderResponse {
    return {
      id: order.id,
      status: order.status,
      invoiceNumber: order.invoiceNumber,
      subtotalCents: order.subtotalCents,
      discountCents: order.discountCents,
      totalCents: order.totalCents,
      currency: order.currency,
      items: order.items.map((i) => this.toOrderItemResponse(i)),
      paymentId: order.payment?.id ?? null,
      paymentStatus: order.payment?.status ?? null,
      invoice: order.invoice ? this.toInvoiceResponse(order.invoice, order.items) : null,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }
}

/** Coerce a nullable jsonb column value into a plain object (or null). */
function jsonObjectOrNull(value: Prisma.JsonValue | null): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
