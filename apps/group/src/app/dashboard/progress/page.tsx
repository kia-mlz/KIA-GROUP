'use client';

import type { LearnerProgressSummary } from '@kia./shared';
import { LineChart, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DashboardGate, PanelPage } from '@/components/dashboard/DashboardShell';
import { useLanguage } from '@/context/LanguageProvider';
import { api, ApiError } from '@/lib/api';

export default function ProgressPage() {
  const { t, format } = useLanguage();
  const [summary, setSummary] = useState<LearnerProgressSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api
      .getProgress()
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : t('panel.progress.loadError'));
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
    <DashboardGate nextPath="/dashboard/progress">
      <PanelPage
        eyebrow={
          <>
            <LineChart size={14} className="inline-leading-icon" />
            {t('panel.nav.progress')}
          </>
        }
        title={t('panel.progress.title')}
        sub={t('panel.progress.sub')}
      >
        {loading ? (
          <p className="auth-loading">
            <Loader2 size={18} className="spin" /> {t('common.loading')}
          </p>
        ) : null}
        {error ? <p className="form-error">{error}</p> : null}
        {summary ? (
          <>
            <div className="panel-list" style={{ marginBottom: '1.5rem' }}>
              <div className="panel-row">
                <div className="panel-row__main">
                  <b>{t('panel.progress.examAverage')}</b>
                  <span>
                    {summary.examAverage != null
                      ? `${format.number(summary.examAverage)}%`
                      : t('panel.progress.noExam')}
                  </span>
                </div>
              </div>
              <div className="panel-row">
                <div className="panel-row__main">
                  <b>{t('panel.progress.bootcampPoints')}</b>
                  <span className="mono ltr-isolate">
                    {format.number(summary.bootcampPoints)}
                  </span>
                </div>
              </div>
            </div>
            <div className="progress-bars">
              {summary.points.map((point) => (
                <div key={`${point.kind}-${point.label}`} className="progress-bar-row">
                  <div>
                    <div className="panel-row__main" style={{ marginBottom: '0.35rem' }}>
                      <b>{point.label}</b>
                    </div>
                    <div className="progress-bar-track">
                      <div
                        className={`progress-bar-fill progress-bar-fill--${point.kind}`}
                        style={{ width: `${Math.max(0, Math.min(100, point.value))}%` }}
                      />
                    </div>
                  </div>
                  <span className="mono ltr-isolate">{format.number(point.value)}%</span>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </PanelPage>
    </DashboardGate>
  );
}
