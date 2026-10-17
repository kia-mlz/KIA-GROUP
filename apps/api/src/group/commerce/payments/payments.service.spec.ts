import { BadRequestException } from '@nestjs/common';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  const prisma = {
    payment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
      // Atomic single-winner completion claim (PENDING→COMPLETED).
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    order: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
      // Conditional terminal-state updates never clobber newer states.
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findMany: jest.fn(),
    },
    invoice: {
      create: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    roadmap: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    entitlement: {
      upsert: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    enrollment: {
      upsert: jest.fn(),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
        user: {
      findUniqueOrThrow: jest.fn(),
      findUnique: jest.fn(),
    },
    learnerWallet: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    walletTransaction: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    course: {
      findFirst: jest.fn(),
    },
    paymentWebhookEvent: {
      create: jest.fn(),
      delete: jest.fn().mockResolvedValue({ id: 'wh-1' }),
    },
    // completePayment runs its money side effects inside a DB transaction that
    // reuses the same delegate mocks as the outer prisma client (implementation
    // attached in beforeEach to avoid a self-referencing initializer).
    $transaction: jest.fn(),
  };

  const stripeService = {
    isConfigured: jest.fn().mockReturnValue(false),
    createSession: jest.fn(),
    constructWebhookEvent: jest.fn(),
  };

  const emailService = {
    sendPaymentReceipt: jest.fn(),
  };

  const configService = {
    get: jest.fn().mockReturnValue('http://localhost:3000'),
  };

  const siteSettings = {
    get: jest.fn().mockResolvedValue({
      general: { siteName: 'kia.' },
      tracks: [],
      pricing: {
        readinessTestCents: 1900,
        courseCents: 490_000,
        modulePrices: [49, 69, 79, 89, 59],
        bundleDiscountPercent: 20,
      },
      payment: {
        enabled: true,
        provider: 'dev',
        currency: 'irr',
        merchantId: '',
        apiKey: '',
        sandbox: true,
        displayName: '',
        description: '',
        callbackUrl: '',
        successUrl: '',
        failureUrl: '',
      },
    }),
  };

  const createPaymentMock = jest.fn().mockResolvedValue({
    redirectUrl: null,
    gatewayRef: null,
    immediateConfirm: true,
  });
  const verifyPaymentMock = jest.fn().mockResolvedValue({ success: true, gatewayRef: 'ok' });

  const providers = {
    resolve: jest.fn().mockReturnValue({
      id: 'dev',
      createPayment: createPaymentMock,
      verifyPayment: verifyPaymentMock,
    }),
    resolveById: jest.fn().mockReturnValue({
      id: 'dev',
      createPayment: createPaymentMock,
      verifyPayment: verifyPaymentMock,
    }),
  };

  const cartService = {
    getCart: jest.fn(),
    clearCart: jest.fn().mockResolvedValue({ items: [] }),
  };

  const service = new PaymentsService(
    prisma as never,
    stripeService as never,
    emailService as never,
    configService as never,
    siteSettings as never,
    providers as never,
    cartService as never,
    { publish: jest.fn().mockResolvedValue(undefined) } as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(
      async (cb: (tx: never) => Promise<unknown>) => cb(prisma as never),
    );
        prisma.entitlement.findMany.mockResolvedValue([]);
    prisma.invoice.count.mockResolvedValue(0);
    prisma.invoice.findUnique.mockResolvedValue(null);
    // Wallet mocks: completePayment creates a DEBIT ledger entry + balance decrement.
    prisma.learnerWallet.findUnique.mockResolvedValue(null);
    prisma.learnerWallet.create.mockResolvedValue({ id: 'w-1', balanceCents: 0 });
    prisma.learnerWallet.update.mockResolvedValue({ id: 'w-1', balanceCents: -1000 });
    prisma.walletTransaction.create.mockResolvedValue({ id: 'wt-1' });
    createPaymentMock.mockResolvedValue({
      redirectUrl: null,
      gatewayRef: null,
      immediateConfirm: true,
    });
    verifyPaymentMock.mockResolvedValue({ success: true, gatewayRef: 'ok' });
    providers.resolve.mockReturnValue({
      id: 'dev',
      createPayment: createPaymentMock,
      verifyPayment: verifyPaymentMock,
    });
    providers.resolveById.mockReturnValue({
      id: 'dev',
      createPayment: createPaymentMock,
      verifyPayment: verifyPaymentMock,
    });
  });

  it('requires productRef for ROADMAP_BUNDLE checkout', async () => {
    await expect(
      service.createCheckout('user-1', { productType: 'ROADMAP_BUNDLE' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates a pending payment using roadmap pricing', async () => {
    prisma.roadmap.findUnique.mockResolvedValue({
      id: 'rm-1',
      userId: 'user-1',
      trackName: 'Web',
      enrolled: false,
      pricing: JSON.stringify({ individual: [], total: 2490000, discounted: 1490000 }),
    });
    prisma.order.create.mockResolvedValue({
      id: 'ord-1',
      totalCents: 1490000,
      currency: 'irr',
    });
    prisma.payment.create.mockResolvedValue({
      id: 'pay-1',
      productType: 'ROADMAP_BUNDLE',
      productRef: 'rm-1',
      amountCents: 1490000,
      currency: 'irr',
      status: 'PENDING',
      orderId: 'ord-1',
      provider: 'dev',
    });
    prisma.payment.findUniqueOrThrow.mockResolvedValue({
      id: 'pay-1',
      productType: 'ROADMAP_BUNDLE',
      productRef: 'rm-1',
      amountCents: 1490000,
      currency: 'irr',
      status: 'PENDING',
      orderId: 'ord-1',
      provider: 'dev',
      stripeId: null,
      metadata: null,
    });
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      id: 'user-1',
      email: 'a@b.c',
      phone: null,
    });
    prisma.payment.update.mockResolvedValue({
      id: 'pay-1',
      productType: 'ROADMAP_BUNDLE',
      productRef: 'rm-1',
      amountCents: 1490000,
      currency: 'irr',
      status: 'PENDING',
      orderId: 'ord-1',
      provider: 'dev',
    });

    const result = await service.createCheckout('user-1', {
      productType: 'ROADMAP_BUNDLE',
      productRef: 'rm-1',
    });

    expect(prisma.order.create).toHaveBeenCalled();
    expect(prisma.payment.create).toHaveBeenCalled();
    expect(result.id).toBe('pay-1');
    expect(result.amountCents).toBe(1490000);
    expect(result.status).toBe('PENDING');
  });

  it('checkouts the cart into a multi-course order', async () => {
    cartService.getCart.mockResolvedValue({
      id: 'cart-1',
      items: [
        {
          id: 'ci-1',
          courseId: 'c1',
          courseSlug: 'js-basics',
          title: 'JS Basics',
          thumbnail: '📘',
          instructor: 'Web',
          trackKey: 'web',
          priceCents: 490_000,
          discountCents: 0,
          finalPriceCents: 490_000,
          addedAt: new Date().toISOString(),
        },
      ],
      itemCount: 1,
      subtotalCents: 490_000,
      discountCents: 0,
      totalCents: 490_000,
      currency: 'irr',
      updatedAt: new Date().toISOString(),
    });
    prisma.order.create.mockResolvedValue({
      id: 'ord-cart',
      totalCents: 490_000,
      currency: 'irr',
    });
    prisma.payment.create.mockResolvedValue({
      id: 'pay-cart',
      productType: 'COURSE',
      productRef: 'js-basics',
      amountCents: 490_000,
      currency: 'irr',
      status: 'PENDING',
      orderId: 'ord-cart',
      provider: 'dev',
    });
    prisma.payment.findUniqueOrThrow.mockResolvedValue({
      id: 'pay-cart',
      productType: 'COURSE',
      productRef: 'js-basics',
      amountCents: 490_000,
      currency: 'irr',
      status: 'PENDING',
      orderId: 'ord-cart',
      provider: 'dev',
      stripeId: null,
      metadata: null,
    });
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      id: 'user-1',
      email: 'a@b.c',
      phone: null,
    });
    prisma.payment.update.mockResolvedValue({
      id: 'pay-cart',
      productType: 'COURSE',
      productRef: 'js-basics',
      amountCents: 490_000,
      currency: 'irr',
      status: 'PENDING',
      orderId: 'ord-cart',
      provider: 'dev',
    });

    const result = await service.checkoutCart('user-1');
    expect(cartService.getCart).toHaveBeenCalledWith('user-1');
    expect(prisma.order.create).toHaveBeenCalled();
    expect(result.productType).toBe('COURSE');
    expect(result.amountCents).toBe(490_000);
  });

  it('rejects empty cart checkout', async () => {
    cartService.getCart.mockResolvedValue({
      id: 'cart-1',
      items: [],
      itemCount: 0,
      subtotalCents: 0,
      discountCents: 0,
      totalCents: 0,
      currency: 'irr',
      updatedAt: new Date().toISOString(),
    });
    await expect(service.checkoutCart('user-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('verifies gateway callback and completes payment', async () => {
    prisma.payment.findUnique.mockResolvedValue({
      id: 'pay-1',
      userId: 'user-1',
      productType: 'COURSE',
      productRef: 'js-basics',
      amountCents: 490_000,
      currency: 'irr',
      status: 'PENDING',
      orderId: 'ord-1',
      provider: 'dev',
      gatewayRef: 'auth-1',
      metadata: null,
      user: {
        id: 'user-1',
        name: 'Alex',
        firstName: 'Alex',
        lastName: null,
        email: 'a@b.c',
        phone: null,
      },
      order: {
        id: 'ord-1',
        source: 'CART',
        items: [],
      },
    });
    prisma.payment.update.mockResolvedValue({
      id: 'pay-1',
      productType: 'COURSE',
      productRef: 'js-basics',
      amountCents: 490_000,
      currency: 'irr',
      status: 'COMPLETED',
      orderId: 'ord-1',
      provider: 'dev',
    });
    prisma.order.update.mockResolvedValue({});
    prisma.order.findUniqueOrThrow.mockResolvedValue({
      id: 'ord-1',
      source: 'CART',
      subtotalCents: 490_000,
      discountCents: 0,
      totalCents: 490_000,
      currency: 'irr',
      items: [
        {
          id: 'oi-1',
          productType: 'COURSE',
          productRef: 'js-basics',
          title: 'JS',
          thumbnail: null,
          instructor: null,
          unitPriceCents: 490_000,
          discountCents: 0,
          finalPriceCents: 490_000,
          quantity: 1,
        },
      ],
    });
    prisma.course.findFirst.mockResolvedValue({
      id: 'c1',
      slug: 'js-basics',
    });
    // Atomic completion claim wins; post-claim re-read returns COMPLETED state.
    prisma.payment.updateMany.mockResolvedValue({ count: 1 });
    prisma.payment.findUniqueOrThrow.mockResolvedValue({
      id: 'pay-1',
      userId: 'user-1',
      productType: 'COURSE',
      productRef: 'js-basics',
      amountCents: 490_000,
      currency: 'irr',
      status: 'COMPLETED',
      orderId: 'ord-1',
      provider: 'dev',
      gatewayRef: null,
      stripeId: null,
      metadata: null,
    });

    const result = await service.handlePublicCallback({
      paymentId: 'pay-1',
      authority: 'auth-1',
      status: 'OK',
    });

    expect(result.success).toBe(true);
    expect(verifyPaymentMock).toHaveBeenCalled();
    expect(prisma.entitlement.upsert).toHaveBeenCalled();
    expect(prisma.enrollment.upsert).toHaveBeenCalled();
    expect(cartService.clearCart).toHaveBeenCalledWith('user-1');
    expect(prisma.invoice.create).toHaveBeenCalled();
  });

  it('marks payment failed when gateway verify fails', async () => {
    verifyPaymentMock.mockResolvedValue({
      success: false,
      failureReason: 'NOK',
      gatewayRef: 'auth-1',
    });
    prisma.payment.findUnique.mockResolvedValue({
      id: 'pay-1',
      userId: 'user-1',
      productType: 'COURSE',
      productRef: 'js-basics',
      amountCents: 490_000,
      currency: 'irr',
      status: 'PENDING',
      orderId: 'ord-1',
      provider: 'dev',
      gatewayRef: 'auth-1',
      metadata: null,
    });
    prisma.payment.update.mockResolvedValue({
      id: 'pay-1',
      status: 'FAILED',
      productType: 'COURSE',
      amountCents: 490_000,
      currency: 'irr',
    });

    const result = await service.handlePublicCallback({
      paymentId: 'pay-1',
      authority: 'auth-1',
      status: 'NOK',
    });

    expect(result.success).toBe(false);
    // Failure path must be conditional so a stale NOK callback can never
    // clobber an already-COMPLETED payment / PAID order.
    expect(prisma.payment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'FAILED' }),
      }),
    );
    expect(prisma.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'FAILED' },
      }),
    );
  });

  it('ignores public failure callbacks that do not carry the payment gateway authority', async () => {
    verifyPaymentMock.mockResolvedValue({
      success: false,
      failureReason: 'NOK',
    });
    prisma.payment.findUnique.mockResolvedValue({
      id: 'pay-1',
      userId: 'user-1',
      productType: 'COURSE',
      productRef: 'js-basics',
      amountCents: 490_000,
      currency: 'irr',
      status: 'PENDING',
      orderId: 'ord-1',
      provider: 'dev',
      gatewayRef: 'auth-1',
      metadata: null,
    });

    // Forged callback: knows only the payment id, not the gateway authority.
    const result = await service.handlePublicCallback({
      paymentId: 'pay-1',
      status: 'NOK',
    });

    expect(result.success).toBe(false);
    // The pending payment must be left untouched.
    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
    expect(prisma.order.updateMany).not.toHaveBeenCalled();
  });

  it('ignores public SUCCESS callbacks that carry no gateway authority (dev provider cannot be forced)', async () => {
    // The dev provider verifies everything as success outside production —
    // which is exactly why the authority proof must gate BEFORE provider verify.
    verifyPaymentMock.mockResolvedValue({ success: true, gatewayRef: 'dev' });
    prisma.payment.findUnique.mockResolvedValue({
      id: 'pay-1',
      userId: 'user-1',
      productType: 'COURSE',
      productRef: 'js-basics',
      amountCents: 490_000,
      currency: 'irr',
      status: 'PENDING',
      orderId: 'ord-1',
      provider: 'dev',
      gatewayRef: 'auth-1',
      metadata: null,
    });

    // Attacker knows only the payment id and forges status=OK.
    const result = await service.handlePublicCallback({
      paymentId: 'pay-1',
      status: 'OK',
    });

    expect(result.success).toBe(false);
    // Provider verify must never have been reached, and nothing completed.
    expect(verifyPaymentMock).not.toHaveBeenCalled();
    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
    expect(prisma.order.updateMany).not.toHaveBeenCalled();
  });

  it('ignores public callbacks whose authority does not match the payment gatewayRef', async () => {
    verifyPaymentMock.mockResolvedValue({ success: true, gatewayRef: 'dev' });
    prisma.payment.findUnique.mockResolvedValue({
      id: 'pay-1',
      userId: 'user-1',
      productType: 'COURSE',
      productRef: 'js-basics',
      amountCents: 490_000,
      currency: 'irr',
      status: 'PENDING',
      orderId: 'ord-1',
      provider: 'dev',
      gatewayRef: 'auth-1',
      metadata: null,
    });

    const result = await service.handlePublicCallback({
      paymentId: 'pay-1',
      authority: 'someone-elses-authority',
      status: 'OK',
    });

    expect(result.success).toBe(false);
    expect(verifyPaymentMock).not.toHaveBeenCalled();
    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
  });

  it('rejects checkout when payments are disabled', async () => {
    siteSettings.get.mockResolvedValue({
      general: { siteName: 'Kia' },
      tracks: [],
      pricing: {
        readinessTestCents: 0,
        courseCents: 1000,
        modulePrices: [1],
        bundleDiscountPercent: 0,
      },
      payment: {
        enabled: false,
        provider: 'dev',
        currency: 'irr',
        merchantId: '',
        apiKey: '',
        sandbox: true,
        displayName: '',
        description: '',
        callbackUrl: '',
        successUrl: '',
        failureUrl: '',
      },
    });
    cartService.getCart.mockResolvedValue({
      id: 'cart-1',
      items: [
        {
          id: 'ci-1',
          courseId: 'c1',
          courseSlug: 'js',
          title: 'JS',
          thumbnail: '📘',
          instructor: 'Web',
          trackKey: 'web',
          priceCents: 1000,
          discountCents: 0,
          finalPriceCents: 1000,
          addedAt: new Date().toISOString(),
        },
      ],
      itemCount: 1,
      subtotalCents: 1000,
      discountCents: 0,
      totalCents: 1000,
      currency: 'irr',
      updatedAt: new Date().toISOString(),
    });
    await expect(service.checkoutCart('user-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  describe('payment state machine enforcement', () => {
    it('rejects completing a FAILED payment (FAILED → COMPLETED is illegal)', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: 'pay-failed',
        userId: 'user-1',
        productType: 'COURSE',
        productRef: 'js-basics',
        amountCents: 490_000,
        currency: 'irr',
        status: 'FAILED',
        orderId: 'ord-1',
        provider: 'dev',
        gatewayRef: null,
        metadata: null,
        user: { id: 'user-1', name: 'Alex', email: 'a@b.c', phone: null },
        order: { id: 'ord-1', source: 'DIRECT', items: [] },
      });
      await expect(
        service.confirmPayment('user-1', 'pay-failed'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.payment.updateMany).not.toHaveBeenCalled();
    });

    it('rejects completing a REFUNDED payment (REFUNDED → COMPLETED is illegal)', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: 'pay-refunded',
        userId: 'user-1',
        productType: 'COURSE',
        productRef: 'js-basics',
        amountCents: 490_000,
        currency: 'irr',
        status: 'REFUNDED',
        orderId: 'ord-1',
        provider: 'dev',
        gatewayRef: null,
        metadata: null,
        user: { id: 'user-1', name: 'Alex', email: 'a@b.c', phone: null },
        order: { id: 'ord-1', source: 'DIRECT', items: [] },
      });
      await expect(
        service.confirmPayment('user-1', 'pay-refunded'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.payment.updateMany).not.toHaveBeenCalled();
    });

    it('rejects completing a CANCELLED payment', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: 'pay-cancelled',
        userId: 'user-1',
        productType: 'COURSE',
        productRef: 'js-basics',
        amountCents: 490_000,
        currency: 'irr',
        status: 'CANCELLED',
        orderId: null,
        provider: 'dev',
        gatewayRef: null,
        metadata: null,
        user: { id: 'user-1', name: 'Alex', email: 'a@b.c', phone: null },
        order: null,
      });
      await expect(
        service.confirmPayment('user-1', 'pay-cancelled'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.payment.updateMany).not.toHaveBeenCalled();
    });

    it('atomically claims only from PENDING/PROCESSING and runs side effects in a transaction', async () => {
      // confirmPayment reads the payment once (PENDING), completePayment reads
      // it again (PENDING) and the post-claim re-read returns COMPLETED.
      prisma.payment.findUnique
        .mockResolvedValueOnce({
          id: 'pay-1',
          userId: 'user-1',
          productType: 'COURSE',
          productRef: 'js-basics',
          amountCents: 490_000,
          currency: 'irr',
          status: 'PENDING',
          orderId: 'ord-1',
          provider: 'dev',
          gatewayRef: 'auth-1',
          metadata: null,
          user: { id: 'user-1', name: 'Alex', email: 'a@b.c', phone: null },
          order: { id: 'ord-1', source: 'DIRECT', items: [] },
        })
        .mockResolvedValueOnce({
          id: 'pay-1',
          userId: 'user-1',
          productType: 'COURSE',
          productRef: 'js-basics',
          amountCents: 490_000,
          currency: 'irr',
          status: 'PENDING',
          orderId: 'ord-1',
          provider: 'dev',
          gatewayRef: 'auth-1',
          metadata: null,
          user: { id: 'user-1', name: 'Alex', email: 'a@b.c', phone: null },
          order: { id: 'ord-1', source: 'DIRECT', items: [] },
        })
        .mockResolvedValueOnce({
          id: 'pay-1',
          userId: 'user-1',
          productType: 'COURSE',
          productRef: 'js-basics',
          amountCents: 490_000,
          currency: 'irr',
          status: 'COMPLETED',
          orderId: 'ord-1',
          provider: 'dev',
          gatewayRef: 'auth-1',
          metadata: null,
          user: { id: 'user-1', name: 'Alex', email: 'a@b.c', phone: null },
          order: { id: 'ord-1', source: 'DIRECT', items: [] },
        });
      prisma.order.findUnique.mockResolvedValue(null);
      prisma.invoice.findUnique.mockResolvedValue(null);
      prisma.order.findUniqueOrThrow.mockResolvedValue({
        id: 'ord-1',
        source: 'DIRECT',
        subtotalCents: 490_000,
        discountCents: 0,
        totalCents: 490_000,
        currency: 'irr',
        items: [],
      });

      const result = await service.confirmPayment('user-1', 'pay-1');

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.payment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ['PENDING', 'PROCESSING'] },
          }),
          data: expect.objectContaining({ status: 'COMPLETED' }),
        }),
      );
      expect(prisma.invoice.create).toHaveBeenCalled();
      expect(cartService.clearCart).not.toHaveBeenCalled();
      expect(result.status).toBe('COMPLETED');
    });
  });

  describe('stripe webhook idempotency', () => {
    const event = {
      id: 'evt_dup',
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_1', metadata: { paymentId: 'pay-9' } } },
    };

    it('skips duplicate deliveries (same event id processed twice)', async () => {
      stripeService.constructWebhookEvent.mockReturnValue(event);
      prisma.paymentWebhookEvent.create.mockRejectedValue({
        code: 'P2002',
        message: 'unique violation',
      });

      await expect(
        service.handleStripeWebhook(Buffer.from('{}'), 'sig-1'),
      ).resolves.toEqual({ received: true });

      // A duplicate webhook must not touch the payment at all.
      expect(prisma.payment.findUnique).not.toHaveBeenCalled();
      expect(prisma.paymentWebhookEvent.delete).not.toHaveBeenCalled();
    });

    it('deletes the idempotency row when processing fails so the provider can retry', async () => {
      stripeService.constructWebhookEvent.mockReturnValue(event);
      prisma.paymentWebhookEvent.create.mockResolvedValue({
        id: 'wh-row',
        eventId: 'evt_dup',
        provider: 'stripe',
        eventType: 'checkout.session.completed',
        payload: '{}',
        processedAt: new Date(),
      });
      prisma.payment.findUnique.mockRejectedValue(new Error('db down'));

      await expect(
        service.handleStripeWebhook(Buffer.from('{}'), 'sig-1'),
      ).rejects.toThrow('db down');

      // The claim is released so a retried webhook processes exactly once later.
      expect(prisma.paymentWebhookEvent.delete).toHaveBeenCalledWith({
        where: { id: 'wh-row' },
      });
    });

    it('acks a fresh event id exactly once and processes it', async () => {
      stripeService.constructWebhookEvent.mockReturnValue(event);
      prisma.paymentWebhookEvent.create.mockResolvedValue({
        id: 'wh-row-2',
        eventId: 'evt_dup',
        provider: 'stripe',
        eventType: 'checkout.session.completed',
        payload: '{}',
        processedAt: new Date(),
      });
      prisma.payment.findUnique.mockResolvedValue({
        id: 'pay-9',
        userId: 'user-1',
        productType: 'COURSE',
        productRef: 'js-basics',
        amountCents: 490_000,
        currency: 'irr',
        status: 'COMPLETED',
        orderId: null,
        gatewayRef: null,
        metadata: null,
      });

      await expect(
        service.handleStripeWebhook(Buffer.from('{}'), 'sig-1'),
      ).resolves.toEqual({ received: true });
      expect(prisma.paymentWebhookEvent.create).toHaveBeenCalledTimes(1);
    });
  });

  /* -------------------------------------------------------------- refunds ---- */

  describe('refundPayment', () => {
    const baseCompletedPayment = {
      id: 'pay-1',
      userId: 'user-1',
      productType: 'COURSE',
      productRef: 'js-basics',
      amountCents: 490_000,
      currency: 'irr',
      status: 'COMPLETED',
      orderId: 'ord-1',
      provider: 'dev',
      gatewayRef: 'ok',
      metadata: null,
      user: { id: 'user-1', name: 'Alex', email: 'a@b.c', phone: null },
      order: { id: 'ord-1', source: 'DIRECT', items: [] },
    };

    beforeEach(() => {
      prisma.payment.updateMany.mockResolvedValue({ count: 1 });
      prisma.payment.findUnique.mockResolvedValue(baseCompletedPayment);
      prisma.course.findFirst.mockResolvedValue({ id: 'c-1', slug: 'js-basics' });
      prisma.roadmap.updateMany.mockResolvedValue({ count: 1 });
    });

    it('performs a full refund: COMPLETED → REFUNDED with wallet credit + order update', async () => {
      prisma.payment.findUnique
        .mockResolvedValueOnce(baseCompletedPayment) // initial fetch
        .mockResolvedValueOnce({ ...baseCompletedPayment, status: 'REFUNDED' }); // final re-read in tx

      const result = await service.refundPayment('pay-1', undefined, 'duplicate charge');

      expect(result.status).toBe('REFUNDED');
      expect(prisma.payment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pay-1', status: 'COMPLETED' },
          data: { status: 'REFUNDED' },
        }),
      );
      expect(prisma.walletTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'CREDIT', amountCents: 490_000 }),
        }),
      );
      expect(prisma.order.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ord-1', status: 'PAID' },
          data: { status: 'REFUNDED' },
        }),
      );
    });

    it('revokes the purchase-sourced entitlement + enrollment on a full COURSE refund', async () => {
      await service.refundPayment('pay-1', undefined, 'duplicate charge');

      expect(prisma.entitlement.deleteMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          userId: 'user-1',
          resourceType: 'course',
          resourceId: 'js-basics',
        }),
      });
      expect(prisma.enrollment.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', courseId: 'c-1' },
      });
    });

    it('un-enrolls the roadmap on a full ROADMAP_BUNDLE refund', async () => {
      prisma.payment.findUnique
        .mockResolvedValueOnce({
          ...baseCompletedPayment,
          productType: 'ROADMAP_BUNDLE',
          productRef: 'rm-1',
          orderId: null,
          order: null,
        })
        .mockResolvedValueOnce({
          ...baseCompletedPayment,
          productType: 'ROADMAP_BUNDLE',
          productRef: 'rm-1',
          status: 'REFUNDED',
          orderId: null,
          order: null,
        });

      await service.refundPayment('pay-1', undefined, 'customer request');

      expect(prisma.entitlement.deleteMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          userId: 'user-1',
          resourceType: 'roadmap',
          resourceId: 'rm-1',
        }),
      });
      expect(prisma.roadmap.updateMany).toHaveBeenCalledWith({
        where: { id: 'rm-1', paymentId: 'pay-1' },
        data: { enrolled: false, paymentId: null },
      });
    });

    it('keeps access on a PARTIAL refund (amount below total)', async () => {
      prisma.payment.findUnique
        .mockResolvedValueOnce(baseCompletedPayment)
        .mockResolvedValueOnce({ ...baseCompletedPayment, status: 'PARTIALLY_REFUNDED' });

      const result = await service.refundPayment('pay-1', 100_000, 'goodwill');

      expect(result.status).toBe('PARTIALLY_REFUNDED');
      expect(prisma.entitlement.deleteMany).not.toHaveBeenCalled();
      expect(prisma.enrollment.deleteMany).not.toHaveBeenCalled();
      expect(prisma.order.updateMany).not.toHaveBeenCalled();
      expect(prisma.walletTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'CREDIT', amountCents: 100_000 }),
        }),
      );
    });

    it('rejects refunding a PENDING payment (state machine)', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        ...baseCompletedPayment,
        status: 'PENDING',
      });

      await expect(service.refundPayment('pay-1', undefined, 'nope')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.payment.updateMany).not.toHaveBeenCalled();
      expect(prisma.entitlement.deleteMany).not.toHaveBeenCalled();
    });

    it('rejects a refund exceeding the payment total', async () => {
      await expect(service.refundPayment('pay-1', 600_000, 'too much')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.payment.updateMany).not.toHaveBeenCalled();
    });

    it('rejects a zero/negative refund amount', async () => {
      await expect(service.refundPayment('pay-1', 0, 'zero')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.payment.updateMany).not.toHaveBeenCalled();
    });

    it('rejects a concurrent double refund via the conditional claim (lost update)', async () => {
      prisma.payment.updateMany.mockResolvedValue({ count: 0 }); // another admin won

      await expect(service.refundPayment('pay-1', undefined, 'double')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.entitlement.deleteMany).not.toHaveBeenCalled();
    });

    it('preserves non-purchase grants (admin gift) when revoking', async () => {
      // deleteMany where-clause must restrict to purchase sources.
      await service.refundPayment('pay-1', undefined, 'duplicate charge');

      const call = prisma.entitlement.deleteMany.mock.calls[0][0] as {
        where: { source: { in: string[] } };
      };
      expect(call.where.source.in).toEqual(['PURCHASE']);
    });

    it('404s for an unknown payment id', async () => {
      prisma.payment.findUnique.mockResolvedValue(null);

      await expect(service.refundPayment('pay-404', undefined, 'x')).rejects.toMatchObject({
        status: 404,
      });
    });
  });
});
