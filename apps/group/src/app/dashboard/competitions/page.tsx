'use client';

import type { CompetitionSummary } from '@kia./shared';
import { Flag, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DashboardGate, PanelPage } from '@/components/dashboard/DashboardShell';
import { useLanguage } from '@/context/LanguageProvider';
import { api, ApiError } from '@/lib/api';

export default function RegisteredCompetitionsPage() {
  const { t, format } = useLanguage();
  const [items, setItems] = useState<CompetitionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api
      .listMyCompetitions()
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : t('panel.competitions.loadError'));
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
    <DashboardGate nextPath="/dashboard/competitions">
      <PanelPage
        eyebrow={
          <>
            <Flag size={14} className="inline-leading-icon" />
            {t('panel.nav.registeredCompetitions')}
          </>
        }
        title={t('panel.competitions.registeredTitle')}
        sub={t('panel.competitions.registeredSub')}
        actions={
          <Link href="/dashboard/events" className="btn btn--secondary">
            {t('panel.competitions.browse')}
          </Link>
        }
      >
        {loading ? (
          <p className="auth-loading">
            <Loader2 size={18} className="spin" /> {t('common.loading')}
          </p>
        ) : null}
        {error ? <p className="form-error">{error}</p> : null}
        {!loading && items.length === 0 ? (
          <p className="panel-muted">{t('panel.competitions.emptyRegistered')}</p>
        ) : null}
        <div className="panel-list">
          {items.map((item) => (
            <div key={item.id} className="panel-row">
              <div className="panel-row__main">
                <b>{item.title}</b>
                <span>
                  {format.date(item.startsAt)} — {format.date(item.endsAt)}
                </span>
              </div>
              <span className="chip chip--mint">{t('panel.competitions.registered')}</span>
            </div>
          ))}
        </div>
      </PanelPage>
    </DashboardGate>
  );
}
