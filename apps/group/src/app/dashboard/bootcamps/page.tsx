'use client';

import type { BootcampState } from '@kia./shared';
import { Loader2, Trophy } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DashboardGate, PanelPage } from '@/components/dashboard/DashboardShell';
import { useLanguage } from '@/context/LanguageProvider';
import { api, ApiError } from '@/lib/api';

export default function EnrolledBootcampsPage() {
  const { t, format } = useLanguage();
  const [state, setState] = useState<BootcampState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api
      .getBootcampState()
      .then((data) => {
        if (!cancelled) setState(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : t('panel.bootcamps.loadError'));
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
    <DashboardGate nextPath="/dashboard/bootcamps">
      <PanelPage
        eyebrow={
          <>
            <Trophy size={14} className="inline-leading-icon" />
            {t('panel.nav.enrolledBootcamps')}
          </>
        }
        title={t('panel.bootcamps.title')}
        sub={t('panel.bootcamps.sub')}
        actions={
          <Link href="/bootcamp" className="btn btn--primary">
            {t('panel.bootcamps.openArena')}
          </Link>
        }
      >
        {loading ? (
          <p className="auth-loading">
            <Loader2 size={18} className="spin" /> {t('common.loading')}
          </p>
        ) : null}
        {error ? <p className="form-error">{error}</p> : null}
        {state ? (
          <div className="panel-list">
            <div className="panel-row">
              <div className="panel-row__main">
                <b>{t('panel.bootcamps.active')}</b>
                <span>
                  {t('panel.bootcamps.rank', { rank: format.number(state.rank) })} ·{' '}
                  {t('panel.bootcamps.points', { points: format.number(state.points) })}
                </span>
              </div>
              <div className="panel-row__actions">
                <Link href="/bootcamp/challenge" className="btn btn--secondary">
                  {t('panel.bootcamps.challenge')}
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </PanelPage>
    </DashboardGate>
  );
}
