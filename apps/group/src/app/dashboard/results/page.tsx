'use client';

import type { ReadinessTestSummary } from '@kia./shared';
import { ArrowRight, ClipboardCheck, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DashboardGate, PanelPage } from '@/components/dashboard/DashboardShell';
import { useLanguage } from '@/context/LanguageProvider';
import { api, ApiError } from '@/lib/api';

export default function ResultsPage() {
  const { t, format } = useLanguage();
  const [history, setHistory] = useState<ReadinessTestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api
      .listReadinessTests()
      .then((data) => {
        if (!cancelled) setHistory(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : t('dashboard.testHistory.loadError'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  return (
    <DashboardGate nextPath="/dashboard/results">
      <PanelPage
        eyebrow={
          <>
            <ClipboardCheck size={14} className="inline-leading-icon" />
            {t('panel.nav.results')}
          </>
        }
        title={t('panel.results.title')}
        sub={t('panel.results.sub')}
        actions={
          <Link href="/readiness" className="btn btn--secondary">
            {t('panel.results.retake')}
          </Link>
        }
      >
        {loading ? (
          <p className="auth-loading">
            <Loader2 size={18} className="spin" /> {t('common.loading')}
          </p>
        ) : null}
        {error ? <p className="form-error">{error}</p> : null}
        {!loading && !error && history.length === 0 ? (
          <p className="panel-muted">{t('dashboard.testHistory.empty')}</p>
        ) : null}
        <div className="panel-list">
          {history.map((item) => (
            <div key={item.id} className="panel-row">
              <div className="panel-row__main">
                <b className="mono ltr-isolate">{format.number(item.average)}%</b>
                <span>{format.date(item.createdAt)}</span>
              </div>
              <div className="panel-row__actions">
                <span className={`chip ${item.passed ? 'chip--mint' : 'chip--amber'}`}>
                  {item.passed
                    ? t('dashboard.testHistory.passed')
                    : t('dashboard.testHistory.needsWork')}
                </span>
                <Link href={`/readiness/results?testId=${item.id}`} className="link-quiet">
                  {t('dashboard.testHistory.view')}
                  <ArrowRight className="nav-arrow" size={13} aria-hidden="true" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </PanelPage>
    </DashboardGate>
  );
}
