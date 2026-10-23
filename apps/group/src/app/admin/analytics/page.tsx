'use client';

import { Loader2, Percent, UserPlus, Users, Wallet } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { AdminPayment, AdminStats } from '@kia./shared';
import { useLanguage } from '@/context/LanguageProvider';
import { api, ApiError } from '@/lib/api';
import { useAdminAccess } from '@/components/admin/useAdminAccess';

function monthLabel(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : 'en-US', {
    month: 'short',
    year: '2-digit',
  }).format(date);
}

export default function AdminAnalyticsPage() {
  const { t, format, locale } = useLanguage();
  const { can } = useAdminAccess();
  const canViewPayments = can('payments', 'view');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.adminStats(),
      canViewPayments
        ? api.adminListPayments().catch(() => [] as AdminPayment[])
        : Promise.resolve([] as AdminPayment[]),
    ])
      .then(([nextStats, nextPayments]) => {
        setStats(nextStats);
        setPayments(nextPayments);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : t('admin.analytics.error'));
      })
      .finally(() => setLoading(false));
  }, [t, canViewPayments]);

  const enrollmentRate = useMemo(() => {
    if (!stats || stats.users <= 0) return 0;
    return Math.round((stats.enrollments / stats.users) * 1000) / 10;
  }, [stats]);

  const monthlyChart = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setDate(1);
      date.setHours(0, 0, 0, 0);
      date.setMonth(date.getMonth() - (5 - index));
      return date;
    });
    const totals = months.map((month) => {
      const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
      const sum = payments
        .filter(
          (payment) =>
            payment.status === 'COMPLETED' && payment.createdAt.slice(0, 7) === key,
        )
        .reduce((acc, payment) => acc + payment.amountCents, 0);
      return { label: monthLabel(month, locale), value: sum, key };
    });
    const max = Math.max(...totals.map((item) => item.value), 1);
    return totals.map((item) => ({
      ...item,
      pct: Math.max(8, Math.round((item.value / max) * 100)),
    }));
  }, [payments, locale]);

  const statusMix = useMemo(() => {
    const counts = new Map<string, number>();
    for (const payment of payments) {
      counts.set(payment.status, (counts.get(payment.status) ?? 0) + 1);
    }
    const total = payments.length || 1;
    return [...counts.entries()]
      .map(([status, count]) => ({
        status,
        count,
        pct: Math.round((count / total) * 1000) / 10,
      }))
      .sort((a, b) => b.count - a.count);
  }, [payments]);

  const byProduct = useMemo(() => {
    const map = new Map<string, { count: number; revenue: number }>();
    for (const payment of payments) {
      if (payment.status !== 'COMPLETED') continue;
      const prev = map.get(payment.productType) ?? { count: 0, revenue: 0 };
      map.set(payment.productType, {
        count: prev.count + 1,
        revenue: prev.revenue + payment.amountCents,
      });
    }
    return [...map.entries()]
      .map(([productType, data]) => ({ productType, ...data }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [payments]);

  if (loading) {
    return (
      <div className="admin-content auth-loading">
        <Loader2 size={24} className="spin" /> {t('admin.analytics.loading')}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="admin-content">
        <p className="form-error">{error || t('admin.analytics.none')}</p>
      </div>
    );
  }

  return (
    <div className="admin-content">
      <div className="admin-stat-grid">
        {canViewPayments ? <div className="admin-stat-card highlight">
          <div className="admin-stat-row">
            <div>
              <span className="admin-stat-label">{t('admin.stats.revenue')}</span>
              <div className="admin-stat-value">{format.currency(stats.revenueCents)}</div>
            </div>
            <span className="admin-stat-icon">
              <Wallet size={18} />
            </span>
          </div>
        </div> : null}
        <div className="admin-stat-card">
          <div className="admin-stat-row">
            <div>
              <span className="admin-stat-label">{t('admin.stats.users')}</span>
              <div className="admin-stat-value">{format.number(stats.users)}</div>
            </div>
            <span className="admin-stat-icon">
              <Users size={18} />
            </span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-row">
            <div>
              <span className="admin-stat-label">{t('admin.analytics.conversion')}</span>
              <div className="admin-stat-value">{format.number(enrollmentRate)}%</div>
            </div>
            <span className="admin-stat-icon">
              <Percent size={18} />
            </span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-row">
            <div>
              <span className="admin-stat-label">{t('admin.stats.enrollments')}</span>
              <div className="admin-stat-value">{format.number(stats.enrollments)}</div>
            </div>
            <span className="admin-stat-icon">
              <UserPlus size={18} />
            </span>
          </div>
        </div>
      </div>

      {canViewPayments ? <div className="admin-grid admin-grid-3" style={{ marginBottom: '1.5rem' }}>
        <article className="admin-card admin-span-2">
          <div className="admin-section-head">
            <div>
              <h2>{t('admin.analytics.monthlyRevenue')}</h2>
              <p>{t('admin.analytics.monthlyRevenueSub')}</p>
            </div>
          </div>
          <div className="admin-chart" aria-label={t('admin.analytics.monthlyRevenue')}>
            {monthlyChart.map((bar) => (
              <span
                key={bar.key}
                className="admin-chart-bar"
                style={{ ['--value' as string]: `${bar.pct}%` }}
                data-label={bar.label}
                title={format.currency(bar.value)}
              />
            ))}
          </div>
        </article>

        <article className="admin-card">
          <div className="admin-section-head">
            <div>
              <h2>{t('admin.analytics.statusMix')}</h2>
              <p>{t('admin.analytics.statusMixSub')}</p>
            </div>
          </div>
          <div className="admin-list">
            {statusMix.length === 0 ? (
              <p className="admin-sub">{t('admin.payments.empty')}</p>
            ) : (
              statusMix.map((item) => (
                <div key={item.status} className="admin-list-item">
                  <div className="admin-list-copy" style={{ flex: 1 }}>
                    <strong>
                      {t(`domain.payments.${item.status.toLowerCase()}` as 'domain.payments.completed')}
                    </strong>
                    <small>
                      {format.number(item.count)} · {format.number(item.pct)}%
                    </small>
                    <div
                      className="admin-progress"
                      style={{
                        marginTop: '0.45rem',
                        ['--admin-progress-value' as string]: `${Math.min(100, item.pct)}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </div> : null}

      {canViewPayments ? <article className="admin-card">
        <div className="admin-section-head">
          <div>
            <h2>{t('admin.analytics.byProduct')}</h2>
            <p>{t('admin.analytics.byProductSub')}</p>
          </div>
        </div>
        <div className="admin-table-wrap" style={{ marginBottom: 0 }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('admin.payments.col.product')}</th>
                <th>{t('admin.analytics.count')}</th>
                <th>{t('admin.payments.col.amount')}</th>
              </tr>
            </thead>
            <tbody>
              {byProduct.length === 0 ? (
                <tr>
                  <td colSpan={3}>{t('admin.payments.empty')}</td>
                </tr>
              ) : (
                byProduct.map((row) => (
                  <tr key={row.productType}>
                    <td>
                      <code>{row.productType}</code>
                    </td>
                    <td>{format.number(row.count)}</td>
                    <td>{format.currency(row.revenue)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article> : null}
    </div>
  );
}
