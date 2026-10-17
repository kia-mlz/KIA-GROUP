'use client';

import type { BootcampState, CompetitionSummary } from '@kia./shared';
import { Loader2, Trophy } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DashboardGate, PanelPage } from '@/components/dashboard/DashboardShell';
import { useLanguage } from '@/context/LanguageProvider';
import { api, ApiError } from '@/lib/api';

export default function EventsPage() {
  const { t, format } = useLanguage();
  const [bootcamp, setBootcamp] = useState<BootcampState | null>(null);
  const [competitions, setCompetitions] = useState<CompetitionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [registering, setRegistering] = useState<string | null>(null);

  const refresh = async () => {
    const [bootcampState, comps] = await Promise.all([
      api.getBootcampState(),
      api.listCompetitions(),
    ]);
    setBootcamp(bootcampState);
    setCompetitions(comps);
  };

  useEffect(() => {
    let cancelled = false;
    refresh()
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : t('panel.events.loadError'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const handleRegister = async (slug: string) => {
    setRegistering(slug);
    setError('');
    try {
      await api.registerCompetition(slug);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('panel.competitions.registerError'));
    } finally {
      setRegistering(null);
    }
  };

  return (
    <DashboardGate nextPath="/dashboard/events">
      <PanelPage
        eyebrow={
          <>
            <Trophy size={14} className="inline-leading-icon" />
            {t('panel.nav.events')}
          </>
        }
        title={t('panel.events.title')}
        sub={t('panel.events.sub')}
      >
        {loading ? (
          <p className="auth-loading">
            <Loader2 size={18} className="spin" /> {t('common.loading')}
          </p>
        ) : null}
        {error ? <p className="form-error">{error}</p> : null}

        <section className="panel-section">
          <h2>{t('panel.events.bootcamps')}</h2>
          {bootcamp ? (
            <div className="panel-row">
              <div className="panel-row__main">
                <b>{t('panel.bootcamps.active')}</b>
                <span>
                  {t('panel.bootcamps.rank', { rank: format.number(bootcamp.rank) })} ·{' '}
                  {t('panel.bootcamps.points', { points: format.number(bootcamp.points) })}
                </span>
              </div>
              <div className="panel-row__actions">
                <Link href="/bootcamp" className="btn btn--primary">
                  {t('panel.bootcamps.openArena')}
                </Link>
              </div>
            </div>
          ) : null}
        </section>

        <section className="panel-section">
          <h2>{t('panel.events.competitions')}</h2>
          {competitions.length === 0 ? (
            <p className="panel-muted">{t('panel.competitions.empty')}</p>
          ) : null}
          <div className="panel-list">
            {competitions.map((item) => (
              <div key={item.id} className="panel-row">
                <div className="panel-row__main">
                  <b>{item.title}</b>
                  <span>{item.description}</span>
                  <span>
                    {format.date(item.startsAt)} — {format.date(item.endsAt)}
                  </span>
                </div>
                <div className="panel-row__actions">
                  {item.registered ? (
                    <span className="chip chip--mint">{t('panel.competitions.registered')}</span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn--secondary"
                      disabled={registering === item.slug}
                      onClick={() => handleRegister(item.slug)}
                    >
                      {registering === item.slug
                        ? t('common.processing')
                        : t('panel.competitions.register')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </PanelPage>
    </DashboardGate>
  );
}
