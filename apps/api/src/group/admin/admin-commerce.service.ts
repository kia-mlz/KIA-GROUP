import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AdminEntitlement,
  AdminOrder,
  AdminPayment,
  AdminWalletDetail,
  AdminWalletSummary,
  AuthUser,
} from '@kia./shared';
import { EntitlementResourceType, PrismaService } from '@kia./platform';
import { PaymentsService } from '../commerce/payments/payments.service';
import {
  AdminAdjustWalletDto,
  AdminGrantEntitlementDto,
  RefundPaymentDto,
} from './dto/admin.dto';
import type { AdminRequestMeta } from './admin-types';
import { AdminAuditService } from './audit.service';

/**
 * Legacy admin-form resource-type labels mapped onto the canonical DB enum
 * (DB-2). The enum now enforces the exact vocabulary the learner-side
 * entitlement checks (`course:…`, `roadmap:…`, `readiness:…`) rely on, so
 * grants written as `readiness_test`/`roadmap_bundle` are normalized at the
 * boundary — previously they were stored verbatim and never matched a
 * learner check.
 */
function toResourceType(value: string): EntitlementResourceType {
  if (value === 'readiness_test') return 'readiness';
  if (value === 'roadmap_bundle') return 'roadmap';
  if (value === 'course' || value === 'roadmap' || value === 'readiness') {
    return value;
  }
  throw new BadRequestException(`Invalid resourceType "${value}"`);
}

/**
 * Commerce department — payments, orders, entitlements, wallets and refunds.
 * Moved verbatim out of the former god-service; behaviour is unchanged.
 */
@Injectable()
export class AdminCommerceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
    private readonly paymentsService: PaymentsService,
  ) {}

  /* --- Payments --------------------------------------------------------------- */

  async listPayments(): Promise<AdminPayment[]> {
    const payments = await this.prisma.payment.findMany({
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return payments.map((p) => ({
      id: p.id,
      userId: p.userId,
      userName: p.user.name,
      userEmail: p.user.email,
      productType: p.productType,
      productRef: p.productRef,
      amountCents: p.amountCents,
      currency: p.currency,
      status: p.status,
      createdAt: p.createdAt.toISOString(),
    }));
  }

  /** Admin-initiated refund (full or partial) — delegates to PaymentsService
   *  which enforces the payment state machine and records a wallet CREDIT. */
  async refundPayment(
    paymentId: string,
    dto: RefundPaymentDto,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminPayment> {
    const before = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: { status: true, amountCents: true, userId: true },
    });
    if (!before) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }

    const result = await this.paymentsService.refundPayment(
      paymentId,
      dto.amountCents,
      dto.reason,
    );

    await this.audit.record({
      actor,
      action: 'payment.refund',
      section: 'payments',
      entityType: 'Payment',
      entityId: paymentId,
      target: before.userId,
      before: { status: before.status, amountCents: before.amountCents },
      after: { status: result.status, refundCents: dto.amountCents ?? before.amountCents },
      reason: dto.reason,
      ...requestMeta,
    });

    return result as unknown as AdminPayment;
  }

  /* --- Orders ----------------------------------------------------------------- */

  async listOrders(): Promise<AdminOrder[]> {
    const orders = await this.prisma.order.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return orders.map((order) => ({
      id: order.id,
      userId: order.user.id,
      userName: order.user.name,
      userEmail: order.user.email,
      status: order.status,
      totalCents: order.totalCents,
      currency: order.currency,
      itemCount: order._count.items,
      createdAt: order.createdAt.toISOString(),
    }));
  }

  /* --- Entitlements ------------------------------------------------------------ */

  async listEntitlements(): Promise<AdminEntitlement[]> {
    const entitlements = await this.prisma.entitlement.findMany({
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return entitlements.map((entitlement) => ({
      id: entitlement.id,
      userId: entitlement.user.id,
      userName: entitlement.user.name,
      userEmail: entitlement.user.email,
      resourceType: entitlement.resourceType as string,
      resourceId: entitlement.resourceId,
      source: entitlement.source,
      createdAt: entitlement.createdAt.toISOString(),
    }));
  }

  async grantEntitlement(
    dto: AdminGrantEntitlementDto,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminEntitlement> {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) {
      throw new NotFoundException(`User ${dto.userId} not found`);
    }
    const resourceType = toResourceType(dto.resourceType);
    const existing = await this.prisma.entitlement.findUnique({
      where: {
        userId_resourceType_resourceId: {
          userId: dto.userId,
          resourceType,
          resourceId: dto.resourceId,
        },
      },
    });
    if (existing) {
      throw new ConflictException('This entitlement already exists for the user');
    }
    const entitlement = await this.prisma.entitlement.create({
      data: {
        userId: dto.userId,
        resourceType,
        resourceId: dto.resourceId,
        source: dto.source ?? 'FREE',
      },
    });
    await this.audit.record({
      actor,
      action: 'entitlement.grant',
      section: 'payments',
      entityType: 'Entitlement',
      entityId: entitlement.id,
      target: user.email ?? user.name,
      ...requestMeta,
      after: {
        resourceType: entitlement.resourceType,
        resourceId: entitlement.resourceId,
        source: entitlement.source,
      },
    });
    return {
      id: entitlement.id,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      resourceType: entitlement.resourceType,
      resourceId: entitlement.resourceId,
      source: entitlement.source,
      createdAt: entitlement.createdAt.toISOString(),
    };
  }

  async revokeEntitlement(
    id: string,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<void> {
    const entitlement = await this.prisma.entitlement.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    if (!entitlement) {
      throw new NotFoundException(`Entitlement ${id} not found`);
    }
    await this.prisma.entitlement.delete({ where: { id } });
    await this.audit.record({
      actor,
      action: 'entitlement.revoke',
      section: 'payments',
      entityType: 'Entitlement',
      entityId: id,
      target: entitlement.user.email ?? entitlement.user.name,
      ...requestMeta,
      before: {
        resourceType: entitlement.resourceType,
        resourceId: entitlement.resourceId,
        source: entitlement.source,
      },
    });
  }

  /* --- Wallets ------------------------------------------------------------------ */

  async listWallets(): Promise<AdminWalletSummary[]> {
    const wallets = await this.prisma.learnerWallet.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        _count: { select: { transactions: true } },
        transactions: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return wallets.map((wallet) => ({
      userId: wallet.user.id,
      userName: wallet.user.name,
      userEmail: wallet.user.email,
      balanceCents: wallet.balanceCents,
      currency: wallet.currency,
      transactionCount: wallet._count.transactions,
      lastTransactionAt: wallet.transactions[0]?.createdAt.toISOString() ?? null,
    }));
  }

  async getWallet(userId: string): Promise<AdminWalletDetail> {
    const wallet = await this.prisma.learnerWallet.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        transactions: { orderBy: { createdAt: 'desc' }, take: 100 },
      },
    });
    if (!wallet) {
      throw new NotFoundException(`Wallet for user ${userId} not found`);
    }
    return {
      userId: wallet.user.id,
      userName: wallet.user.name,
      userEmail: wallet.user.email,
      balanceCents: wallet.balanceCents,
      currency: wallet.currency,
      transactionCount: wallet.transactions.length,
      lastTransactionAt: wallet.transactions[0]?.createdAt.toISOString() ?? null,
      transactions: wallet.transactions.map((transaction) => ({
        id: transaction.id,
        type: transaction.type,
        amountCents: transaction.amountCents,
        description: transaction.description,
        createdAt: transaction.createdAt.toISOString(),
      })),
    };
  }

  async adjustWallet(
    userId: string,
    dto: AdminAdjustWalletDto,
    actor: AuthUser,
    requestMeta: AdminRequestMeta = {},
  ): Promise<AdminWalletDetail> {
    const wallet = await this.prisma.learnerWallet.findUnique({
      where: { userId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    if (!wallet) {
      throw new NotFoundException(`Wallet for user ${userId} not found`);
    }
    if (dto.type === 'DEBIT' && wallet.balanceCents < dto.amountCents) {
      throw new BadRequestException('Debit exceeds the current wallet balance');
    }

    const reason = dto.reason?.trim() ?? '';
    if (!reason) {
      throw new BadRequestException('An adjustment reason is required');
    }
    const description = dto.description?.trim() ? `${dto.description.trim()} — ${reason}` : reason;

    await this.prisma.$transaction([
      this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: dto.type,
          amountCents: dto.amountCents,
          description,
        },
      }),
      this.prisma.learnerWallet.update({
        where: { id: wallet.id },
        data: {
          balanceCents:
            dto.type === 'CREDIT'
              ? wallet.balanceCents + dto.amountCents
              : wallet.balanceCents - dto.amountCents,
        },
      }),
    ]);

    await this.audit.record({
      actor,
      action: 'wallet.adjust',
      section: 'payments',
      entityType: 'LearnerWallet',
      entityId: wallet.id,
      target: wallet.user.email ?? wallet.user.name,
      before: { balanceCents: wallet.balanceCents },
      after: {
        balanceCents:
          dto.type === 'CREDIT'
            ? wallet.balanceCents + dto.amountCents
            : wallet.balanceCents - dto.amountCents,
        type: dto.type,
        amountCents: dto.amountCents,
      },
      reason,
      ...requestMeta,
    });

    return this.getWallet(userId);
  }
}
