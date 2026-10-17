'use client';

import type { BootcampState } from '@kia./shared';
import { Clock, Zap } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageProvider';
import { api, ApiError } from '@/lib/api';
import { CardShell, EmptyState } from './CardShell';

function useCountdown(endIso?: string, endedLabel?: string) {
  const [str, setStr] = useState('');
  useEffect(() => {
    if (!endIso) return;
    const endMs = new Date(endIso).getTime();
    const tick = () => {
      const diff = endMs - Date.now();
      if (diff <= 0) {
        setStr(endedLabel || '---');
        return;
      }
      const d = Math.floor(diff / 86_400_000);
      const h = Math.floor((diff % 86_400_000) / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      setStr(
        `${d.toLocaleString('fa-IR')} روز  ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
      );
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [endIso]);
  return str;
}

export function BootcampCard() {
  const router = useRouter();
  const { t, format } = useLanguage();
  const [state, setState] = useState<BootcampState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setState(await api.getBootcampState());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('dashboard.bootcamps.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const active = state?.challenges?.find((c) => c.status === 'active');
  const countdown = useCountdown(active?.endsAt, t('dashboard.bootcamps.status.ended'));

  const statusLabel = {
    active: t('dashboard.bootcamps.status.active'),
    open: t('dashboard.bootcamps.status.open'),
    ended: t('dashboard.bootcamps.status.ended'),
  } as const;

  return (
    <CardShell
      title={t('dashboard.bootcamps.title')}
      icon={Zap}
      isLoading={loading}
      error={error}
      onRetry={load}
      cta={
        <Link href="/dashboard/bootcamps" className="dash-btn-ghost">
          {t('dashboard.bootcamps.viewAll')}
        </Link>
      }
    >
      {!state?.challenges?.length ? (
        <EmptyState
          icon="⚡"
          text={t('dashboard.bootcamps.empty')}
          cta={t('dashboard.bootcamps.browse')}
          onCta={() => router.push('/bootcamp')}
        />
      ) : (
        <div className="dash-stack">
          <div className="dash-bootcamp-meta">
            <span>
              {t('panel.bootcamps.rank', { rank: format.number(state.rank) })}
            </span>
            <span>
              {t('panel.bootcamps.points', { points: format.number(state.points) })}
            </span>
          </div>
          {state.challenges.slice(0, 3).map((challenge) => (
            <div key={challenge.id} className="dash-bootcamp-item">
              <div className="dash-bootcamp-item__top">
                <span>{challenge.title}</span>
                <span className={`dash-tag dash-tag--${challenge.status}`}>
                  {statusLabel[challenge.status]}
                </span>
              </div>
              <div className="dash-muted">
                {format.date(challenge.startsAt)} — {format.date(challenge.endsAt)}
              </div>
              {challenge.status === 'active' && countdown ? (
                <div className="dash-bootcamp-item__actions">
                  <div className="dash-countdown">
                    <Clock size={12} aria-hidden="true" />
                    <span className="mono ltr-isolate">{countdown}</span>
                  </div>
                  <Link href="/bootcamp" className="dash-btn-primary dash-btn-sm">
                    {t('dashboard.bootcamps.enter')}
                  </Link>
                </div>
              ) : null}
              {challenge.status === 'open' ? (
                <Link href="/bootcamp" className="dash-btn-primary dash-btn-sm">
                  {t('dashboard.bootcamps.register')}
                </Link>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </CardShell>
  );
}
