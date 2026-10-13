'use client';

import { Loader2, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  fromDisplayUnits,
  normalizePaymentCurrency,
  type AdminPayment,
  type PaymentStatus,
} from '@kia-group/shared';
import { useAdminAccess } from '@/components/admin/useAdminAccess';
import { useLanguage } from '@/context/LanguageProvider';
import { api, ApiError } from '@/lib/api';
import {
  AdminSortHeader,
  AdminStatusBadge,
  AdminTableToolbar,
  sortRows,
  type SortState,
} from '@/components/admin/AdminPro';

/** Every member of the shared `PaymentStatus` union — the filter must not drift. */
const PAYMENT_STATUSES: readonly PaymentStatus[] = [
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
];

type PaymentTone = 'ok' | 'warning' | 'danger' | 'info';

/** Redundant tone mapping: status text is always shown beside the badge color. */
function paymentTone(status: string): PaymentTone {
  switch (status) {
    case 'COMPLETED':
      return 'ok';
    case 'PENDING':
    case 'PROCESSING':
      return 'warning';
    case 'FAILED':
    case 'CANCELLED':
      return 'danger';
    default:
      return 'info';
  }
}

type RefundTarget = {
  payment: AdminPayment;
  amount: string;
  reason: string;
  busy: boolean;
  error: string;
};

export default function AdminPaymentsPage() {
  const { t, format } = useLanguage();
  const { can } = useAdminAccess();
  const canRefund = can('payments', 'manage');
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refund, setRefund] = useState<RefundTarget | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort] = useState<SortState>(null);

  useEffect(() => {
    api
      .adminListPayments()
      .then(setPayments)
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : t('admin.payments.loadError'));
      })
      .finally(() => setLoading(false));
  }, [t]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = payments.filter((payment) => {
      if (statusFilter && payment.status !== statusFilter) return false;
      if (!q) return true;
      return (
        payment.userName.toLowerCase().includes(q) ||
        (payment.userEmail ?? '').toLowerCase().includes(q) ||
        payment.productType.toLowerCase().includes(q) ||
        payment.status.toLowerCase().includes(q) ||
        payment.id.toLowerCase().includes(q)
      );
    });
    return sortRows(rows, sort, {
      date: (row) => row.createdAt,
      user: (row) => row.userName,
      product: (row) => row.productType,
      amount: (row) => row.amountCents,
      status: (row) => row.status,
    });
  }, [payments, search, statusFilter, sort]);

  const filteredTotal = useMemo(
    () => filtered.reduce((acc, payment) => acc + payment.amountCents, 0),
    [filtered],
  );

  const onSort = (key: string) => {
    setSort((prev) =>
      prev?.key === key ? (prev.dir === 'asc' ? { key, dir: 'desc' } : null) : { key, dir: 'asc' },
    );
  };

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setSort(null);
  };

  const openRefund = (payment: AdminPayment) => {
    setError('');
    setNotice('');
    setRefund({ payment, amount: '', reason: '', busy: false, error: '' });
  };

  /**
   * The admin enters the amount in the currency the table displays, so a
   * Persian operator types تومان — never the stored ریال. `fromDisplayUnits`
   * converts it back; the empty field means "refund the full amount".
   */
  const refundAmountCents = (target: RefundTarget): number | undefined => {
    const digits = target.amount.replace(/[^\d]/g, '');
    if (!digits) return undefined;
    return fromDisplayUnits(
      Number(digits),
      normalizePaymentCurrency(target.payment.currency),
    );
  };

  const submitRefund = async () => {
    const target = refund;
    if (!target || target.busy) return;
    const amountCents = refundAmountCents(target);
    if (!target.reason.trim()) {
      setRefund({ ...target, error: t('admin.payments.refundReasonRequired') });
      return;
    }
    if (amountCents !== undefined && (amountCents <= 0 || amountCents > target.payment.amountCents)) {
      setRefund({ ...target, error: t('admin.payments.refundAmountInvalid') });
      return;
    }

    setRefund({ ...target, busy: true, error: '' });
    try {
      const updated = await api.adminRefundPayment(
        target.payment.id,
        amountCents === undefined
          ? { reason: target.reason.trim() }
          : { amountCents, reason: target.reason.trim() },
      );
      setPayments((rows) => rows.map((row) => (row.id === updated.id ? updated : row)));
      setRefund(null);
      setNotice(t('admin.payments.refundSuccess'));
    } catch (err) {
      setRefund({
        ...target,
        busy: false,
        error: err instanceof ApiError ? err.message : t('admin.payments.refundError'),
      });
    }
  };

  if (loading) {
    return (
      <div className="admin-content auth-loading">
        <Loader2 size={24} className="spin" /> {t('admin.payments.loading')}
      </div>
    );
  }

  const hasFilters = Boolean(search || statusFilter || sort);
  const columnCount = canRefund ? 6 : 5;

  return (
    <div className="admin-content">
      <h1>{t('admin.payments.title')}</h1>
      <p className="admin-sub">{t('admin.payments.sub')}</p>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="form-success" role="status">
          {notice}
        </p>
      ) : null}

      <div className="apro-toolbar">
        <AdminTableToolbar
          search={search}
          onSearchChange={setSearch}
          searchLabel={t('admin.finance.search')}
          searchPlaceholder={t('admin.finance.searchPlaceholder')}
        >
          <select
            className="admin-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label={t('admin.payments.col.status')}
          >
            <option value="">{t('admin.finance.allStatuses')}</option>
            {PAYMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {t(`domain.payments.${status.toLowerCase()}` as 'domain.payments.completed')}
              </option>
            ))}
          </select>
          <span className="admin-badge info">
            {format.number(filtered.length)} / {format.number(payments.length)}
          </span>
          {hasFilters ? (
            <button type="button" className="admin-link-btn" onClick={resetFilters}>
              {t('admin.pro.resetFilters')}
            </button>
          ) : null}
        </AdminTableToolbar>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <AdminSortHeader
                label={t('admin.payments.col.date')}
                sortKey="date"
                sort={sort}
                onSort={onSort}
              />
              <AdminSortHeader
                label={t('admin.payments.col.user')}
                sortKey="user"
                sort={sort}
                onSort={onSort}
              />
              <AdminSortHeader
                label={t('admin.payments.col.product')}
                sortKey="product"
                sort={sort}
                onSort={onSort}
              />
              <AdminSortHeader
                label={t('admin.payments.col.amount')}
                sortKey="amount"
                sort={sort}
                onSort={onSort}
              />
              <AdminSortHeader
                label={t('admin.payments.col.status')}
                sortKey="status"
                sort={sort}
                onSort={onSort}
              />
              {canRefund ? <th scope="col">{t('admin.payments.col.actions')}</th> : null}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={columnCount}>
                  {payments.length === 0
                    ? t('admin.payments.empty')
                    : t('admin.pro.emptyFiltered')}
                </td>
              </tr>
            ) : (
              filtered.map((payment) => (
                <tr key={payment.id}>
                  <td>{format.date(payment.createdAt)}</td>
                  <td>
                    <div>{payment.userName}</div>
                    <div className="ltr-isolate admin-cell-meta">{payment.userEmail}</div>
                  </td>
                  <td>
                    <code>{payment.productType}</code>
                  </td>
                  <td className="apro-num">
                    {format.currency(payment.amountCents, payment.currency)}
                  </td>
                  <td>
                    <AdminStatusBadge tone={paymentTone(payment.status)}>
                      {t(
                        `domain.payments.${payment.status.toLowerCase()}` as 'domain.payments.completed',
                      )}
                    </AdminStatusBadge>
                  </td>
                  {canRefund ? (
                    <td>
                      {/* Only a COMPLETED payment can move to a refunded state; the
                          server enforces the same transition. */}
                      {payment.status === 'COMPLETED' ? (
                        <button
                          type="button"
                          className="admin-link-btn"
                          onClick={() => openRefund(payment)}
                        >
                          <RotateCcw size={14} aria-hidden /> {t('admin.payments.refund')}
                        </button>
                      ) : (
                        <span className="admin-cell-meta">—</span>
                      )}
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 ? (
        <p className="admin-meta" style={{ marginTop: '0.75rem' }}>
          {t('admin.pro.total')}: {format.currency(filteredTotal)}
        </p>
      ) : null}

      {refund ? (
        <div
          className="modal-overlay active"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget && !refund.busy) setRefund(null);
          }}
        >
          <div className="modal" role="dialog" aria-modal="true" aria-label={t('admin.payments.refundTitle')}>
            <h4>{t('admin.payments.refundTitle')}</h4>
            <p>{t('admin.payments.refundBody')}</p>
            <p className="admin-cell-meta">
              {refund.payment.userName} ·{' '}
              {format.currency(refund.payment.amountCents, refund.payment.currency)}
            </p>

            <label className="form-field" style={{ width: '100%', textAlign: 'start' }}>
              <span>
                {t('admin.payments.refundAmount', {
                  unit:
                    normalizePaymentCurrency(refund.payment.currency) === 'irt'
                      ? t('admin.payments.unitToman')
                      : t('admin.payments.unitRial'),
                })}
              </span>
              <input
                className="admin-input"
                inputMode="numeric"
                value={refund.amount}
                disabled={refund.busy}
                placeholder={t('admin.payments.refundAmountPlaceholder')}
                onChange={(e) => setRefund({ ...refund, amount: e.target.value })}
              />
              <span className="admin-cell-meta">
                {refundAmountCents(refund) === undefined
                  ? t('admin.payments.refundFullHint')
                  : format.currency(
                      refundAmountCents(refund)!,
                      refund.payment.currency,
                    )}
              </span>
            </label>

            <label className="form-field" style={{ width: '100%', textAlign: 'start' }}>
              <span>{t('admin.payments.refundReason')}</span>
              <textarea
                className="admin-input"
                rows={3}
                value={refund.reason}
                disabled={refund.busy}
                placeholder={t('admin.payments.refundReasonPlaceholder')}
                onChange={(e) => setRefund({ ...refund, reason: e.target.value })}
              />
            </label>

            {refund.error ? <p className="form-error">{refund.error}</p> : null}

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
              <button
                type="button"
                className="cta-primary"
                disabled={refund.busy}
                onClick={() => void submitRefund()}
              >
                {refund.busy ? (
                  <>
                    <Loader2 size={14} className="spin" /> {t('admin.payments.refundWorking')}
                  </>
                ) : (
                  t('admin.payments.refundConfirm')
                )}
              </button>
              <button
                type="button"
                className="btn-next admin-btn"
                disabled={refund.busy}
                onClick={() => setRefund(null)}
              >
                {t('admin.payments.refundCancel')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
