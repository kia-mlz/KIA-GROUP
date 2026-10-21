import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { en, fa } from '@/i18n/messages';
import { createTranslator } from '@/i18n/translate';

/**
 * Admin action wiring.
 *
 * Two failure modes this pins down, both of which shipped at least once:
 *
 * 1. A status rendered through a template key (`domain.payments.<status>`) with
 *    no dictionary entry, so the admin sees a raw key path instead of a label.
 *    The contract is the shared `PaymentStatus` union — the label set and the
 *    filter list must cover every member, not just the common ones.
 * 2. An action that exists on the server but is unreachable in the UI, or a UI
 *    that calls a client method that does not exist. Every route the panel
 *    offers is asserted against the controller that authorises it.
 */

const ADMIN_DIR = __dirname;
const SRC = path.resolve(__dirname, '..', '..');
const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..');

const readSrc = (relative: string) => readFileSync(path.join(SRC, relative), 'utf8');
const readRepo = (relative: string) => readFileSync(path.join(REPO, relative), 'utf8');
const adminController = () => readRepo('apps/api/src/group/admin/admin.controller.ts');

/**
 * The section permission decorating a route.
 *
 * This controller writes `@Route(…)\n  @AdminAccess(section, level)` before the
 * handler, so the permission is the decorator that FOLLOWS the route. Reading
 * the one above would silently report the previous handler's permission.
 */
function routePermission(route: string): string {
  const controller = adminController();
  const at = controller.indexOf(route);
  expect(at, `${route} is declared`).toBeGreaterThan(-1);

  const access = controller.indexOf('@AdminAccess(', at);
  expect(access, `${route} has a section permission`).toBeGreaterThan(-1);

  // Text between this route declaration and its permission decorator; another
  // route appearing there would mean the wrong decorator was picked up.
  const between = controller.slice(at + route.length, access);
  expect(between, `${route} must not be followed by another route first`).not.toMatch(
    /@(Get|Post|Patch|Put|Delete)\(/,
  );
  return controller.slice(access, controller.indexOf(')', access) + 1);
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry.name) && !/\.(test|spec)\./.test(entry.name)) out.push(full);
  }
  return out;
}

/** Members of the `PaymentStatus` union exactly as the API can emit them. */
function paymentStatusMembers(): string[] {
  const source = readRepo('packages/shared/src/types/payment.ts');
  const start = source.indexOf('export type PaymentStatus');
  const union = source.slice(start, source.indexOf(';', start));
  return [...union.matchAll(/'([A-Z_]+)'/g)].map((match) => match[1]);
}

describe('admin payment status vocabulary', () => {
  const members = paymentStatusMembers();
  const tEn = createTranslator(en, en);
  const tFa = createTranslator(fa, fa);
  const paymentsPage = readFileSync(path.join(ADMIN_DIR, 'payments', 'page.tsx'), 'utf8');

  it('knows every status the API can emit', () => {
    // Guard against the union being renamed or emptied, which would silently
    // turn the assertions below into no-ops.
    expect(members.length).toBeGreaterThanOrEqual(7);
    expect(members).toContain('PARTIALLY_REFUNDED');
  });

  it('labels every status in both locales instead of leaking the key path', () => {
    const unresolved: string[] = [];
    for (const member of members) {
      const key = `domain.payments.${member.toLowerCase()}`;
      const english = tEn(key);
      const persian = tFa(key);
      if (english === key) unresolved.push(`en ${key}`);
      if (persian === key) unresolved.push(`fa ${key}`);
      if (english === persian) unresolved.push(`untranslated ${key}`);
    }
    expect(unresolved).toEqual([]);
  });

  it('offers every status in the payments filter', () => {
    const filter = paymentsPage.slice(
      paymentsPage.indexOf('const PAYMENT_STATUSES'),
      paymentsPage.indexOf('];', paymentsPage.indexOf('const PAYMENT_STATUSES')),
    );
    const missing = members.filter((member) => !filter.includes(`'${member}'`));
    expect(missing).toEqual([]);
  });
});

describe('admin refund action', () => {
  const paymentsPage = readFileSync(path.join(ADMIN_DIR, 'payments', 'page.tsx'), 'utf8');
  const apiLib = readSrc('lib/api.ts');

  it('is reachable from the payments table', () => {
    expect(paymentsPage).toContain('api.adminRefundPayment(');
    // The id handed to the endpoint is the row the dialog was opened for.
    expect(paymentsPage).toContain('target.payment.id');
  });

  it('is gated by the section permission and only offered on refundable rows', () => {
    expect(paymentsPage).toContain("can('payments', 'manage')");
    expect(paymentsPage).toMatch(/payment\.status === 'COMPLETED'/);
  });

  it('calls an endpoint that exists and is authorised server-side', () => {
    expect(apiLib).toContain('`/admin/payments/${id}/refund`');
    expect(routePermission("@Post('payments/:id/refund')")).toContain(
      "'payments', 'manage'",
    );
  });

  it('requires a reason and never exceeds the payment total client-side', () => {
    expect(paymentsPage).toContain('refundReasonRequired');
    expect(paymentsPage).toContain('refundAmountInvalid');
    expect(paymentsPage).toContain('target.payment.amountCents');
  });
});

describe('admin soft delete + restore', () => {
  const usersPage = readFileSync(path.join(ADMIN_DIR, 'users', 'page.tsx'), 'utf8');
  const apiLib = readSrc('lib/api.ts');
  // The users filter moved out of the AdminService facade into its department
  // service (admin-users.service.ts); assert against the file that owns it.
  const service = readRepo('apps/api/src/group/admin/admin-users.service.ts');

  it('hides deleted accounts unless the view asks for them', () => {
    // Default must stay "active only" — widening it would surprise every caller.
    expect(apiLib).toContain("qs.set('deleted', params.deleted)");
    expect(usersPage).toContain(
      "deleted: deletedFilter === 'active' ? undefined : deletedFilter",
    );

    const filter = service.slice(
      service.indexOf('const deletedView'),
      service.indexOf('const search'),
    );
    expect(filter).toContain("deletedView === 'deleted'");
    expect(filter).toContain("deletedView !== 'all'");
  });

  it('gates delete and restore behind users.manage', () => {
    expect(routePermission("@Delete('users/:id')")).toContain("'users', 'manage'");
    expect(routePermission("@Post('users/:id/restore')")).toContain("'users', 'manage'");
    // The buttons are only rendered for operators holding that permission.
    expect(usersPage).toContain("can('users', 'manage')");
  });

  it('offers restore for deleted rows and delete for the rest', () => {
    expect(usersPage).toContain('adminRestoreUser(user.id)');
    expect(usersPage).toContain('adminSoftDeleteUser(user.id, deleteReason.trim())');
    expect(usersPage).toContain('user.deleted');
    // A reason is mandatory before the delete is sent.
    expect(usersPage).toContain('softDeleteReasonRequired');
  });
});

describe('admin pages only call api methods that exist', () => {
  it('has no call to a missing client method', () => {
    const apiLib = readSrc('lib/api.ts');
    const files = [
      ...walk(ADMIN_DIR),
      ...walk(path.join(SRC, 'components', 'admin')),
    ];
    const missing: string[] = [];
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      for (const match of source.matchAll(/\bapi\.([a-zA-Z]\w*)\(/g)) {
        const name = match[1];
        if (!new RegExp(`\\b${name}\\s*\\(`).test(apiLib)) {
          missing.push(`${name} (${path.relative(SRC, file)})`);
        }
      }
    }
    expect([...new Set(missing)]).toEqual([]);
  });
});
