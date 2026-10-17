'use client';

import Link from 'next/link';
import {
  BookOpen,
  ClipboardList,
  CreditCard,
  GraduationCap,
  Activity,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Server,
  TriangleAlert,
  LineChart,
  Mail,
  ScrollText,
  Settings,
  Trophy,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AdminAuditLog, AdminPayment, AdminStats } from '@kia./shared';
import { useLanguage } from '@/context/LanguageProvider';
import { api, ApiError } from '@/lib/api';
import { AdminErrorState, AdminSkeleton } from '@/components/admin/AdminStates';
import { useAdminAccess } from '@/components/admin/useAdminAccess';

/** Executive dashboard payload — every field comes from a REAL admin API. */
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

function activityIcon(action: string) {
  if (action.startsWith('user.')) return Users;
  if (action.startsWith('course.') || action.startsWith('lesson.')) return BookOpen;
  if (action.startsWith('message.')) return Mail;
  if (action.startsWith('wallet.') || action.startsWith('entitlement.')) return Wallet;
  if (action.startsWith('settings.')) return Settings;
  if (action.startsWith('ticket.')) return ClipboardList;
  return ScrollText;
}

function activityTone(action: string): '' | 'ok' | 'warning' | 'danger' {
  if (action.includes('delete')) return 'danger';
  if (action.includes('create') || action.includes('video_upload')) return 'ok';
  if (action.startsWith('settings.')) return 'warning';
  return '';
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

  /* 7-day revenue trend derived from real completed payments. */
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
    const total = completed + pending + failed;
    return {
      completed,
      pending,
      failed,
      total,
      successRate: total ? Math.round((completed / total) * 100) : 0,
    };
  }, [data]);

  if (loading) {
    return (
      <div className="admin-content">
        <div className="admin-kpi-grid">
          {Array.from({ length: 6 }, (_, index) => (
            <AdminSkeleton key={index} className="admin-skeleton-stat" />
          ))}
        </div>
        <div className="admin-grid admin-grid-2">
          <AdminSkeleton className="admin-skeleton-row" />
          <AdminSkeleton className="admin-skeleton-row" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="admin-content">
        <div className="admin-card">
          <AdminErrorState message={error || t('admin.stats.none')} onRetry={load} />
        </div>
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
      icon: Users,
      enabled: can('users', 'view'),
      highlight: false,
    },
    {
      id: 'courses',
      label: t('admin.kpi.courses'),
      value: format.number(stats.courses),
      href: '/admin/academy/courses',
      icon: BookOpen,
      enabled: can('courses', 'view'),
      highlight: false,
    },
    {
      id: 'enrollments',
      label: t('admin.kpi.enrollments'),
      value: format.number(stats.enrollments),
      href: '/admin/analytics',
      icon: GraduationCap,
      enabled: can('stats', 'view'),
      highlight: false,
    },
    {
      id: 'revenue',
      label: t('admin.kpi.revenue'),
      value: format.currency(stats.revenueCents),
      href: '/admin/finance',
      icon: Wallet,
      enabled: can('payments', 'view'),
      highlight: true,
    },
    {
      id: 'payments',
      label: t('admin.kpi.payments'),
      value: format.number(stats.payments),
      href: '/admin/payments',
      icon: CreditCard,
      enabled: can('payments', 'view'),
      highlight: false,
    },
    {
      id: 'challenges',
      label: t('admin.kpi.activeChallenges'),
      value: format.number(stats.activeChallenges),
      href: '/admin/events/challenges',
      icon: Trophy,
      enabled: can('challenges', 'view'),
      highlight: false,
    },
    {
      id: 'pending',
      label: t('admin.kpi.pendingItems'),
      value: format.number(data.openTickets),
      href: '/admin/tickets',
      icon: Zap,
      enabled: can('tickets', 'view'),
      highlight: false,
    },
  ].filter((kpi) => kpi.enabled);

  return (
    <div className="admin-content admin-dashboard">
      <section className="admin-dashboard-intro" aria-labelledby="admin-dashboard-heading">
        <div>
          <span className="admin-dashboard-eyebrow">
            <Activity size={14} /> {t('admin.dashboard.eyebrow')}
          </span>
          <h2 id="admin-dashboard-heading">{t('admin.dashboard.title')}</h2>
          <p>{t('admin.dashboard.sub')}</p>
        </div>
        <div className="admin-dashboard-intro-actions">
          <span className="admin-dashboard-date">{format.date(new Date().toISOString())}</span>
          <button
            type="button"
            className="admin-dashboard-refresh"
            onClick={load}
            aria-label={t('admin.dashboard.refresh')}
          >
            <RefreshCw size={16} /> <span>{t('admin.dashboard.refresh')}</span>
          </button>
        </div>
      </section>

      {/* Executive KPI grid */}
      <div className="admin-kpi-grid admin-dashboard-kpis">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link
              key={kpi.id}
              href={kpi.href}
              className={`admin-stat-card${kpi.highlight ? ' highlight' : ''}`}
            >
              <div className="admin-stat-row">
                <div>
                  <span className="admin-stat-label">{kpi.label}</span>
                  <div className="admin-stat-value">{kpi.value}</div>
                </div>
                <span className="admin-stat-icon">
                  <Icon size={18} />
                </span>
              </div>
              <span className="admin-stat-hint">
                {t('admin.kpi.view')} <span aria-hidden>→</span>
              </span>
            </Link>
          );
        })}
      </div>

      <div className="admin-dashboard-overview">
        <article className="admin-card admin-dashboard-health">
          <div className="admin-section-head">
            <div>
              <h2>{t('admin.dashboard.healthTitle')}</h2>
              <p className="admin-sub" style={{ marginBottom: 0 }}>
                {t('admin.dashboard.healthSub')}
              </p>
            </div>
            <span className="admin-dashboard-live">
              <span /> {t('admin.dashboard.live')}
            </span>
          </div>
          <div className="admin-health-score">
            <div
              className="admin-health-ring"
              style={{ '--health-value': `${statusCounts.successRate}%` } as React.CSSProperties}
            >
              <strong>{format.number(statusCounts.successRate)}٪</strong>
              <small>{t('admin.dashboard.successRate')}</small>
            </div>
            <div className="admin-health-list">
              <div>
                <CheckCircle2 size={16} />
                <span>{t('admin.analytics.completed')}</span>
                <b>{format.number(statusCounts.completed)}</b>
              </div>
              <div>
                <Clock3 size={16} />
                <span>{t('admin.analytics.pending')}</span>
                <b>{format.number(statusCounts.pending)}</b>
              </div>
              <div>
                <TriangleAlert size={16} />
                <span>{t('admin.analytics.failed')}</span>
                <b>{format.number(statusCounts.failed)}</b>
              </div>
            </div>
          </div>
          <div className="admin-health-footer">
            <Server size={14} /> {t('admin.dashboard.systemReady')}
          </div>
        </article>

        {/* Revenue trend (real completed payments) */}
        <article className="admin-card admin-dashboard-revenue">
          <div className="admin-section-head">
            <div>
              <h2>{t('admin.analytics.revenueTrend')}</h2>
              <p className="admin-sub" style={{ marginBottom: 0 }}>
                {t('admin.analytics.revenueTrendSub')}
              </p>
            </div>
            <Link href="/admin/analytics" className="admin-link">
              {t('admin.activity.viewAll')}
            </Link>
          </div>
          <div className="admin-chart" role="img" aria-label={t('admin.analytics.revenueTrend')}>
            {chart.map((item) => (
              <div
                key={item.label}
                className="admin-chart-bar"
                style={{ '--value': `${item.pct}%` } as React.CSSProperties}
                data-label={item.label}
              />
            ))}
          </div>
          {can('payments', 'view') ? (
            <div
              className="admin-quick-links"
              style={{ marginTop: 'var(--space-5)', marginBottom: 0 }}
            >
              <span className="admin-badge ok">
                {format.number(statusCounts.completed)} {t('admin.analytics.completed')}
              </span>
              <span className="admin-badge warning">
                {format.number(statusCounts.pending)} {t('admin.analytics.pending')}
              </span>
              <span className="admin-badge danger">
                {format.number(statusCounts.failed)} {t('admin.analytics.failed')}
              </span>
            </div>
          ) : null}
        </article>

        {/* Recent activity — real audit log */}
        <article className="admin-card admin-dashboard-activity">
          <div className="admin-section-head">
            <div>
              <h2>{t('admin.activity.title')}</h2>
              <p className="admin-sub" style={{ marginBottom: 0 }}>
                {t('admin.activity.sub')}
              </p>
            </div>
            {can('audit', 'view') ? (
              <Link href="/admin/audit" className="admin-link">
                {t('admin.activity.viewAll')}
              </Link>
            ) : null}
          </div>
          {data.audit.length === 0 ? (
            <p className="admin-dropdown-empty">{t('admin.activity.empty')}</p>
          ) : (
            <ul className="admin-activity-feed">
              {data.audit.map((entry) => {
                const Icon = activityIcon(entry.action);
                const tone = activityTone(entry.action);
                const actionLabel = t(`admin.audit.action.${entry.action}`);
                return (
                  <li key={entry.id} className="admin-activity-item">
                    <span className={`admin-activity-icon ${tone}`.trim()} aria-hidden>
                      <Icon size={14} />
                    </span>
                    <span className="admin-activity-body">
                      <strong>
                        {actionLabel !== `admin.audit.action.${entry.action}`
                          ? actionLabel
                          : entry.action}
                      </strong>
                      <small>
                        {entry.actorName} · {entry.target}
                      </small>
                      <time dateTime={entry.createdAt}>{format.date(entry.createdAt)}</time>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </article>
      </div>

      {/* Quick actions — permission-aware */}
      <article className="admin-card admin-dashboard-quick">
        <div className="admin-section-head">
          <div>
            <h2>{t('admin.quick.title')}</h2>
            <p className="admin-sub" style={{ marginBottom: 0 }}>
              {t('admin.quick.sub')}
            </p>
          </div>
        </div>
        <div className="admin-quick-tiles">
          {can('users', 'view') ? (
            <Link href="/admin/users" className="admin-quick-tile">
              <Users size={18} aria-hidden />
              {t('admin.quick.users')}
            </Link>
          ) : null}
          {can('courses', 'manage') ? (
            <Link href="/admin/academy/courses/new" className="admin-quick-tile">
              <BookOpen size={18} aria-hidden />
              {t('admin.quick.createCourse')}
            </Link>
          ) : null}
          {can('payments', 'view') ? (
            <Link href="/admin/payments" className="admin-quick-tile">
              <CreditCard size={18} aria-hidden />
              {t('admin.quick.payments')}
            </Link>
          ) : null}
          {can('payments', 'view') ? (
            <Link href="/admin/orders" className="admin-quick-tile">
              <ClipboardList size={18} aria-hidden />
              {t('admin.quick.orders')}
            </Link>
          ) : null}
          {can('tickets', 'view') ? (
            <Link href="/admin/tickets" className="admin-quick-tile">
              <Zap size={18} aria-hidden />
              {t('admin.quick.tickets')}
            </Link>
          ) : null}
          {can('messages', 'view') ? (
            <Link href="/admin/messages" className="admin-quick-tile">
              <Mail size={18} aria-hidden />
              {t('admin.quick.messages')}
            </Link>
          ) : null}
          {can('audit', 'view') ? (
            <Link href="/admin/audit" className="admin-quick-tile">
              <ScrollText size={18} aria-hidden />
              {t('admin.quick.audit')}
            </Link>
          ) : null}
          {can('stats', 'view') ? (
            <Link href="/admin/analytics" className="admin-quick-tile">
              <LineChart size={18} aria-hidden />
              {t('admin.quick.analytics')}
            </Link>
          ) : null}
        </div>
      </article>
    </div>
  );
}
