'use client';

import Link from 'next/link';
import { ChevronRight, Flag, Trophy, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { AdminChallenge, AdminCompetition } from '@kia-group/shared';
import { AdminErrorState, AdminLoading } from '@/components/admin/AdminStates';
import { useAdminAccess } from '@/components/admin/useAdminAccess';
import { useLanguage } from '@/context/LanguageProvider';
import { api } from '@/lib/api';
import { DEPARTMENT_MODULES, departmentEntryPoints } from '@/lib/adminDepartments';

/**
 * Events department panel — competitions, challenges and registrations, all
 * from the real endpoints; a count is shown only when its endpoint answered.
 */
export default function AdminEventsDashboardPage() {
  const { t, format } = useLanguage();
  const { can } = useAdminAccess();
  const [competitions, setCompetitions] = useState<AdminCompetition[] | null>(null);
  const [challenges, setChallenges] = useState<AdminChallenge[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempted, setAttempted] = useState(0);
  const [failed, setFailed] = useState(0);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    const calls: Promise<unknown>[] = [];
    let attempts = 0;
    let failures = 0;

    const track = <T,>(promise: Promise<T>, assign: (value: T | null) => void) => {
      attempts += 1;
      calls.push(
        promise
          .then((value) => assign(value))
          .catch(() => {
            failures += 1;
            assign(null);
          }),
      );
    };

    if (can('competitions')) track(api.adminListCompetitions(), (value) => setCompetitions(value as AdminCompetition[] | null));
    if (can('challenges')) track(api.adminListChallenges(), (value) => setChallenges(value as AdminChallenge[] | null));

    setLoading(true);
    void Promise.all(calls).then(() => {
      if (cancelled) return;
      setAttempted(attempts);
      setFailed(failures);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [can, nonce]);

  const entryPoints = departmentEntryPoints('events', can);

  if (loading) return <AdminLoading label={t('admin.departments.loading')} />;
  if (attempted > 0 && failed === attempted) {
    return (
      <div className="admin-content">
        <div className="admin-card">
          <AdminErrorState message={t('admin.departments.loadError')} onRetry={reload} />
        </div>
      </div>
    );
  }

  const activeCompetitions = competitions?.filter((item) => item.active).length ?? null;
  const registrations =
    competitions?.reduce((total, item) => total + item.registrationCount, 0) ?? null;
  const challengeCount = challenges?.length ?? null;

  const metrics = [
    { labelKey: 'admin.departments.metric.competitions', value: competitions?.length ?? null, icon: Flag },
    { labelKey: 'admin.departments.metric.activeCompetitions', value: activeCompetitions, icon: Flag },
    { labelKey: 'admin.departments.metric.registrations', value: registrations, icon: Users },
    { labelKey: 'admin.stats.challenges', value: challengeCount, icon: Trophy },
  ].filter((metric) => metric.value !== null);

  return (
    <div className="admin-content">
      <div className="breadcrumbs" aria-label={t('admin.breadcrumb')}>
        <Link href="/admin">{t('admin.breadcrumbRoot')}</Link>
        <ChevronRight size={10} className="admin-breadcrumb-sep" aria-hidden />
        <Link href="/admin/departments">{t('admin.nav.departments')}</Link>
        <ChevronRight size={10} className="admin-breadcrumb-sep" aria-hidden />
        <strong>{t('dashboard.doors.eventsTitle')}</strong>
      </div>

      <section className="page-intro">
        <div>
          <span className="section-kicker">{t('admin.departments.what')}</span>
          <h1>{t('dashboard.doors.eventsTitle')}</h1>
          <p>{t('admin.departments.events.desc')}</p>
        </div>
      </section>

      <div className="admin-kpi-grid">
        {metrics.map((metric) => (
          <div key={metric.labelKey} className="admin-stat-card">
            <div className="admin-stat-row">
              <div>
                <span className="admin-stat-label">{t(metric.labelKey)}</span>
                <div className="admin-stat-value">{format.number(metric.value as number)}</div>
              </div>
              <span className="admin-stat-icon">
                <metric.icon size={18} />
              </span>
            </div>
          </div>
        ))}
      </div>

      <article className="admin-card">
        <h2>{t('admin.departmentPanel.modules')}</h2>
        {DEPARTMENT_MODULES.events.length && entryPoints.length ? (
          <div className="admin-department-actions">
            {entryPoints.map((entry) => (
              <Link key={entry.href} href={entry.href} className="btn-next admin-btn">
                {t(entry.labelKey)}
              </Link>
            ))}
          </div>
        ) : (
          <p className="admin-department-status">
            {entryPoints.length ? t('admin.departments.noModule') : t('admin.departments.noAccess')}
          </p>
        )}
      </article>
    </div>
  );
}
