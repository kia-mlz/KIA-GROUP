'use client';

import type { LearnerProgressSummary } from '@kia./shared';
import { BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageProvider';
import { api, ApiError } from '@/lib/api';
import { CardShell } from './CardShell';

function relativeTime(iso: string, locale: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / 86_400_000);
  if (days <= 0) return locale.startsWith('fa') ? 'امروز' : 'Today';
  if (days === 1) return locale.startsWith('fa') ? '۱ روز پیش' : '1 day ago';
  if (days < 7) {
    return locale.startsWith('fa')
      ? `${days.toLocaleString('fa-IR')} روز پیش`
      : `${days} days ago`;
  }
  const weeks = Math.floor(days / 7);
  return locale.startsWith('fa')
    ? `${weeks.toLocaleString('fa-IR')} هفته پیش`
    : `${weeks} week(s) ago`;
}

export function ProgressChart() {
  const { t, format, locale } = useLanguage();
  const [summary, setSummary] = useState<LearnerProgressSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setSummary(await api.getProgress());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('dashboard.progress.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const pct = summary?.overallPct ?? 0;
  const r = 44;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <CardShell
      title={t('dashboard.progress.title')}
      icon={BarChart3}
      isLoading={loading}
      error={error}
      onRetry={load}
      cta={
        <Link href="/dashboard/progress" className="dash-btn-ghost">
          {t('dashboard.progress.viewAll')}
        </Link>
      }
    >
      {summary ? (
        <>
          <div className="dash-progress-overview">
            <svg
              width="100"
              height="100"
              viewBox="0 0 100 100"
              aria-label={`${t('dashboard.progress.title')} ${format.number(pct)}%`}
            >
              <circle
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke="var(--card-border)"
                strokeWidth="10"
              />
              <circle
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke="var(--brand)"
                strokeWidth="10"
                strokeDasharray={`${dash} ${circ}`}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
                className="dash-doughnut"
              />
              <text
                x="50"
                y="46"
                textAnchor="middle"
                fontSize="16"
                fontWeight="700"
                fill="var(--text)"
              >
                {format.number(pct)}
              </text>
              <text
                x="50"
                y="60"
                textAnchor="middle"
                fontSize="9"
                fill="var(--text-faint)"
              >
                {t('dashboard.progress.percent')}
              </text>
            </svg>
            <div>
              <div className="dash-progress-heading">{t('dashboard.progress.academic')}</div>
              <div className="dash-muted">{t('dashboard.progress.basedOn')}</div>
              <div className="dash-stat-row">
                {[
                  { l: t('dashboard.progress.courses'), v: summary.courseCount },
                  { l: t('dashboard.progress.exams'), v: summary.examCount },
                  { l: t('dashboard.progress.certs'), v: summary.certificateCount },
                ].map((item) => (
                  <div key={item.l} className="dash-stat">
                    <div className="mono ltr-isolate">{format.number(item.v)}</div>
                    <span>{item.l}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="dash-divider-block">
            <p className="dash-section-label">{t('dashboard.progress.activity')}</p>
            {summary.activity.length === 0 ? (
              <p className="dash-muted">{t('dashboard.progress.noActivity')}</p>
            ) : (
              summary.activity.map((item) => (
                <div key={item.id} className="dash-activity-row">
                  <span aria-hidden="true">•</span>
                  <span className="dash-activity-text">{item.text}</span>
                  <span className="dash-muted">
                    {relativeTime(item.createdAt, locale)}
                  </span>
                </div>
              ))
            )}
          </div>
        </>
      ) : null}
    </CardShell>
  );
}
