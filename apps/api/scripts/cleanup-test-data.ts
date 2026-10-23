/**
 * Cleanup of dev/test data in the local dev database.
 *
 * Removes:
 *  1. PENDING payments created against the `dev` provider (no real gateway
 *     was ever contacted) together with their AWAITING_PAYMENT orders.
 *  2. "Smoke" admin audit-log entries left by smoke tests (target Smoke /
 *     SMOKE10 — the underlying challenge/discount rows were already deleted).
 *
 * Preserves everything real: COMPLETED payments + PAID orders + invoices,
 * entitlements, users, courses, discount codes, support data, all other
 * audit history. Tickets are untouched (none existed to clean).
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@kia./platform';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }),
});

const SMOKE_ACTIONS = ['challenge.create', 'challenge.delete', 'discount.create', 'discount.delete'];

async function main() {
  // 1) Pending dev-gateway payments and their awaiting-payment orders.
  const pendingDevPayments = await prisma.payment.findMany({
    where: { status: 'PENDING', provider: 'dev' },
    select: { id: true, orderId: true, walletTransaction: { select: { id: true } } },
  });
  const paymentIds = pendingDevPayments.map((p) => p.id);
  const orderIds = pendingDevPayments.map((p) => p.orderId).filter((v): v is string => Boolean(v));

  // Wallet ledger rows pointing at a deleted payment keep (paymentId is SetNull).
  for (const orderId of orderIds) {
    await prisma.orderItem.deleteMany({ where: { orderId } });
  }
  for (const orderId of orderIds) {
    await prisma.order.deleteMany({ where: { id: orderId, status: 'AWAITING_PAYMENT' } });
  }
  const payments = await prisma.payment.deleteMany({
    where: { id: { in: paymentIds }, status: 'PENDING' },
  });

  // 2) Smoke test audit-log rows.
  const smokeLogs = await prisma.adminAuditLog.deleteMany({
    where: {
      OR: [
        { target: { in: ['Smoke', 'SMOKE10'] } },
        {
          action: { in: SMOKE_ACTIONS },
          section: { in: ['challenges', 'discounts'] },
          target: { in: ['Smoke', 'SMOKE10'] },
        },
      ],
    },
  });

  console.log(
    JSON.stringify(
      {
        removedPayments: payments.count,
        removedOrders: orderIds.length,
        removedSmokeAuditEntries: smokeLogs.count,
        keptCompletedPayments: await prisma.payment.count({
          where: { status: 'COMPLETED' },
        }),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
