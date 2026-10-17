'use client';

import Link from 'next/link';
import { ClipboardList, Hourglass, Loader2, Wallet } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { AdminPayment, AdminStats } from '@kia./shared';
import { useLanguage } from '@/context/LanguageProvider';
import { api, ApiError } from '@/lib/api';
import {
  AdminSortHeader,
  AdminStatusBadge,
  AdminTableToolbar,
  sortRows,
  type SortState,
} from '@/components/admin/AdminPro';

const PAYMENT_STATUSES = ['COMPLETED', 'PENDING', 'FAILED', 'REFUNDED'] as const;

function paymentTone(status: string): 'ok' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'COMPLETED':
      return 'ok';
    case 'PENDING':
      return 'warning';
    case 'FAILED':
      return 'danger';
    default:
      return 'info';
  }
}

export default function AdminFinancePage() {
  const { t, format } = useLanguage();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort] = useState<SortState>(null);

  useEffect(() => {
    Promise.all([api.adminStats(), api.adminListPayments().catch(() => [] as AdminPayment[])])
      .then(([nextStats, nextPayments]) => {
        setStats(nextStats);
        setPayments(nextPayments);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : t('admin.finance.error'));
      })
      .finally(() => setLoading(false));
  }, [t]);

  const settledRevenue = useMemo(
    () =>
      payments
        .filter((payment) => payment.status === 'COMPLETED')
        .reduce((acc, payment) => acc + payment.amountCents, 0),
    [payments],
  );

  const pendingAmount = useMemo(
    () =>
      payments
        .filter((payment) => payment.status === 'PENDING')
        .reduce((acc, payment) => acc + payment.amountCents, 0),
    [payments],
  );

  const completedCount = useMemo(
    () => payments.filter((payment) => payment.status === 'COMPLETED').length,
    [payments],
  );

  const dailySettlements = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (13 - index));
      return date;
    });
    return days
      .map((day) => {
        const key = day.toISOString().slice(0, 10);
        const dayPayments = payments.filter(
          (payment) => payment.status === 'COMPLETED' && payment.createdAt.slice(0, 10) === key,
        );
        return {
          key,
          count: dayPayments.length,
          total: dayPayments.reduce((acc, payment) => acc + payment.amountCents, 0),
        };
      })
      .reverse();
  }, [payments]);

  const bestDay = useMemo(
    () =>
      dailySettlements.reduce(
        (best, day) => (day.total > best.total ? day : best),
        dailySettlements[0] ?? { key: '', count: 0, total: 0 },
      ),
    [dailySettlements],
  );

  const dailyAverage = useMemo(() => {
    const activeDays = dailySettlements.filter((day) => day.count > 0).length;
    return activeDays > 0 ? settledRevenue / activeDays : 0;
  }, [dailySettlements, settledRevenue]);

  const filteredLedger = useMemo(() => {
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
    () => filteredLedger.reduce((acc, payment) => acc + payment.amountCents, 0),
    [filteredLedger],
  );

  const onSort = (key: string) => {
    setSort((prev) =>
      prev?.key === key ? (prev.dir === 'asc' ? { key, dir: 'desc' } : null) : { key, dir: 'asc' },
    );
  };

  if (loading) {
    return (
      <div className="admin-content auth-loading">
        <Loader2 size={24} className="spin" /> {t('admin.finance.loading')}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="admin-content">
        <p className="form-error" role="alert">
          {error || t('admin.finance.none')}
        </p>
      </div>
    );
  }

  const chartMax = Math.max(...dailySettlements.map((day) => day.total), 1);

  return (
    <div className="admin-content">
      {/* KPI row */}
      <div className="admin-stat-grid">
        <div className="admin-stat-card highlight">
          <div className="admin-stat-row">
            <div>
              <span className="admin-stat-label">{t('admin.finance.settled')}</span>
              <div className="admin-stat-value">{format.currency(settledRevenue)}</div>
            </div>
            <span className="admin-stat-icon">
              <Wallet size={18} />
            </span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-row">
            <div>
              <span className="admin-stat-label">{t('admin.finance.pending')}</span>
              <div className="admin-stat-value">{format.currency(pendingAmount)}</div>
            </div>
            <span className="admin-stat-icon">
              <Hourglass size={18} />
            </span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-row">
            <div>
              <span className="admin-stat-label">{t('admin.stats.payments')}</span>
              <div className="admin-stat-value">{format.number(completedCount)}</div>
            </div>
            <span className="admin-stat-icon">
              <ClipboardList size={18} />
            </span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-row">
            <div>
              <span className="admin-stat-label">{t('admin.finance.ledger')}</span>
              <div className="admin-stat-value">{format.number(payments.length)}</div>
            </div>
            <span className="admin-stat-icon">
              <ClipboardList size={18} />
            </span>
          </div>
        </div>
      </div>

      {/* Daily settlements — chart with table alternative (a11y) */}
      <article className="admin-card" style={{ marginBottom: '1.25rem' }}>
        <div className="admin-section-head">
          <div>
            <h2>{t('admin.finance.dailySettlements')}</h2>
            <p>{t('admin.finance.dailySettlementsSub')}</p>
          </div>
          <div className="admin-quick-links" style={{ marginBottom: 0 }}>
            <span className="admin-badge info">
              {t('admin.pro.average')}: {format.currency(Math.round(dailyAverage))}
            </span>
            <span className="admin-badge ok">
              {t('admin.pro.bestDay')}: {bestDay.count > 0 ? format.date(bestDay.key) : '—'}
            </span>
          </div>
        </div>
        <div
          className="admin-chart"
          role="img"
          aria-label={`${t('admin.finance.dailySettlements')} — ${format.currency(settledRevenue)}`}
        >
          {dailySettlements.map((day) => (
            <div
              key={day.key}
              className="admin-chart-bar"
              style={{ '--value': `${Math.max(4, Math.round((day.total / chartMax) * 100))}%` } as React.CSSProperties}
              data-label={format.date(day.key)}
              title={`${format.date(day.key)} · ${format.currency(day.total)} (${format.number(day.count)})`}
            />
          ))}
        </div>
        <details className="apro-chart-details">
          <summary>{t('admin.finance.date')}</summary>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('admin.finance.date')}</th>
                  <th>{t('admin.analytics.count')}</th>
                  <th>{t('admin.payments.col.amount')}</th>
                </tr>
              </thead>
              <tbody>
                {dailySettlements.map((day) => (
                  <tr key={day.key}>
                    <td>{format.date(day.key)}</td>
                    <td>{format.number(day.count)}</td>
                    <td className="apro-num">{format.currency(day.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </article>

      {/* Ledger */}
      <article className="admin-card">
        <div className="admin-section-head">
          <div>
            <h2>{t('admin.finance.filteredLedger')}</h2>
            <p>{t('admin.finance.filteredLedgerSub')}</p>
          </div>
          <Link href="/admin/payments" className="admin-link">
            {t('admin.nav.financeTransactions')}
          </Link>
        </div>

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
            {format.number(filteredLedger.length)} / {format.number(payments.length)}
          </span>
        </AdminTableToolbar>

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
              </tr>
            </thead>
            <tbody>
              {filteredLedger.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    {payments.length === 0
                      ? t('admin.payments.empty')
                      : t('admin.pro.emptyFiltered')}
                  </td>
                </tr>
              ) : (
                filteredLedger.map((payment) => (
                  <tr key={payment.id}>
                    <td>{format.date(payment.createdAt)}</td>
                    <td>
                      <div>{payment.userName}</div>
                      <div className="ltr-isolate admin-cell-meta">{payment.userEmail}</div>
                    </td>
                    <td>
                      <code>{payment.productType}</code>
                    </td>
                    <td className="apro-num">{format.currency(payment.amountCents)}</td>
                    <td>
                      <AdminStatusBadge tone={paymentTone(payment.status)}>
                        {t(
                          `domain.payments.${payment.status.toLowerCase()}` as 'domain.payments.completed',
                        )}
                      </AdminStatusBadge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredLedger.length > 0 ? (
          <p className="admin-meta" style={{ marginTop: '0.85rem' }}>
            {t('admin.pro.total')}: {format.currency(filteredTotal)}
          </p>
        ) : null}
      </article>
    </div>
  );
}
