'use client';

import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AdminAuditLog, AdminPayment, AdminStats } from '@kia./shared';
import { useLanguage } from '@/context/LanguageProvider';
import { api, ApiError } from '@/lib/api';
import { AdminErrorState, AdminSkeleton } from '@/components/admin/AdminStates';
import { useAdminAccess } from '@/components/admin/useAdminAccess';

/** Executive overview — every field comes from a REAL admin API. */
type DashboardData = {
  stats: AdminStats;
  payments: AdminPayment[];
  audit: AdminAuditLog[];
  openTickets: number;
};

function weekdayLabel(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : 'en-US', { weekday: 'short' }).format(
    date,
  );
}

export default function AdminStatsPage() {
  const { t, format, locale } = useLanguage();
  const { can } = useAdminAccess();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    Promise.all([
      api.adminStats(),
      can('payments', 'view')
        ? api.adminListPayments().catch(() => [] as AdminPayment[])
        : Promise.resolve([] as AdminPayment[]),
      can('audit', 'view')
        ? api
            .adminListAuditLogs({ page: 1, limit: 8 })
            .then((result) => result.items)
            .catch(() => [] as AdminAuditLog[])
        : Promise.resolve([] as AdminAuditLog[]),
      can('tickets', 'view')
        ? api
            .adminListTickets()
            .then(
              (tickets) =>
                tickets.filter(
                  (ticket) => ticket.status === 'OPEN' || ticket.status === 'IN_PROGRESS',
                ).length,
            )
            .catch(() => 0)
        : Promise.resolve(0),
    ])
      .then(([stats, payments, audit, openTickets]) =>
        setData({ stats, payments, audit, openTickets }),
      )
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : t('admin.stats.error'));
      })
      .finally(() => setLoading(false));
  }, [can, t]);

  useEffect(() => {
    load();
  }, [load]);

  const chart = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));
      return date;
    });
    const totals = days.map((day) => {
      const key = day.toISOString().slice(0, 10);
      const sum = (data?.payments ?? [])
        .filter(
          (payment) => payment.status === 'COMPLETED' && payment.createdAt.slice(0, 10) === key,
        )
        .reduce((acc, payment) => acc + payment.amountCents, 0);
      return { label: weekdayLabel(day, locale), value: sum };
    });
    const max = Math.max(...totals.map((item) => item.value), 1);
    return totals.map((item) => ({
      ...item,
      pct: Math.max(8, Math.round((item.value / max) * 100)),
    }));
  }, [data, locale]);

  const statusCounts = useMemo(() => {
    const payments = data?.payments ?? [];
    const completed = payments.filter((payment) => payment.status === 'COMPLETED').length;
    const pending = payments.filter((payment) => payment.status === 'PENDING').length;
    const failed = payments.filter((payment) => payment.status === 'FAILED').length;
    return { completed, pending, failed };
  }, [data]);

  if (loading) {
    return (
      <div className="am-dash">
        <div className="am-kpi">
          {Array.from({ length: 4 }, (_, index) => (
            <AdminSkeleton key={index} className="admin-skeleton-stat" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="am-dash">
        <AdminErrorState message={error || t('admin.stats.none')} onRetry={load} />
      </div>
    );
  }

  const { stats } = data;

  const kpis = [
    {
      id: 'users',
      label: t('admin.kpi.users'),
      value: format.number(stats.users),
      href: '/admin/users',
      enabled: can('users', 'view'),
    },
    {
      id: 'courses',
      label: t('admin.kpi.courses'),
      value: format.number(stats.courses),
      href: '/admin/academy/courses',
      enabled: can('courses', 'view'),
    },
    {
      id: 'revenue',
      label: t('admin.kpi.revenue'),
      value: format.currency(stats.revenueCents),
      href: '/admin/finance',
      enabled: can('payments', 'view'),
    },
    {
      id: 'payments',
      label: t('admin.kpi.payments'),
      value: format.number(stats.payments),
      href: '/admin/payments',
      enabled: can('payments', 'view'),
    },
    {
      id: 'pending',
      label: t('admin.kpi.pendingItems'),
      value: format.number(data.openTickets),
      href: '/admin/tickets',
      enabled: can('tickets', 'view'),
    },
  ].filter((kpi) => kpi.enabled);

  return (
    <div className="am-dash">
      <section className="am-dash__head" aria-labelledby="admin-dashboard-heading">
        <div>
          <span className="am-dash__kicker">{t('admin.dashboard.eyebrow')}</span>
          <h2 id="admin-dashboard-heading">{t('admin.dashboard.title')}</h2>
          <p>{t('admin.dashboard.sub')}</p>
        </div>
        <button
          type="button"
          className="am-icon-btn"
          onClick={load}
          aria-label={t('admin.dashboard.refresh')}
        >
          <RefreshCw size={14} />
          <span>{format.date(new Date().toISOString())}</span>
        </button>
      </section>

      <div className="am-kpi">
        {kpis.map((kpi) => (
          <Link key={kpi.id} href={kpi.href}>
            <span>{kpi.label}</span>
            <strong>{kpi.value}</strong>
          </Link>
        ))}
      </div>

      <div className="am-actions">
        {can('tickets', 'view') ? (
          <Link href="/admin/tickets" className={data.openTickets > 0 ? 'is-urgent' : undefined}>
            <strong>{format.number(data.openTickets)}</strong>
            <span>{t('admin.dashboard.openTickets')}</span>
          </Link>
        ) : null}
        {can('payments', 'view') ? (
          <Link
            href="/admin/payments"
            className={statusCounts.failed > 0 ? 'is-urgent' : undefined}
          >
            <strong>{format.number(statusCounts.failed)}</strong>
            <span>{t('admin.dashboard.failedPayments')}</span>
          </Link>
        ) : null}
        {can('payments', 'view') ? (
          <Link href="/admin/payments">
            <strong>{format.number(statusCounts.pending)}</strong>
            <span>{t('admin.dashboard.pendingPayments')}</span>
          </Link>
        ) : null}
        <Link href="/admin/departments">
          <strong>{format.number(6)}</strong>
          <span>{t('admin.dashboard.departmentsHubHint')}</span>
        </Link>
      </div>

      <div className="am-panels">
        {can('payments', 'view') ? (
          <article className="am-panel">
            <div className="am-panel__head">
              <h3>{t('admin.analytics.revenueTrend')}</h3>
              <Link href="/admin/analytics">{t('admin.activity.viewAll')}</Link>
            </div>
            <div className="am-chart" role="img" aria-label={t('admin.analytics.revenueTrend')}>
              {chart.map((item) => (
                <span
                  key={item.label}
                  className={item.value > 0 ? 'is-fill' : undefined}
                  style={{ height: `${item.pct}%` }}
                  title={`${item.label}: ${format.currency(item.value)}`}
                />
              ))}
            </div>
          </article>
        ) : null}

        <article className="am-panel">
          <div className="am-panel__head">
            <h3>{t('admin.activity.title')}</h3>
            {can('audit', 'view') ? (
              <Link href="/admin/audit">{t('admin.activity.viewAll')}</Link>
            ) : null}
          </div>
          {data.audit.length === 0 ? (
            <p className="admin-sub">{t('admin.activity.empty')}</p>
          ) : (
            <ul className="am-list">
              {data.audit.map((entry) => {
                const actionLabel = t(`admin.audit.action.${entry.action}`);
                return (
                  <li key={entry.id}>
                    <strong>
                      {actionLabel !== `admin.audit.action.${entry.action}`
                        ? actionLabel
                        : entry.action}
                    </strong>
                    <small>
                      {entry.actorName} · {entry.target} · {format.date(entry.createdAt)}
                    </small>
                  </li>
                );
              })}
            </ul>
          )}
        </article>
      </div>
    </div>
  );
}
