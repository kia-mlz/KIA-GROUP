'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  AdminChallenge,
  AdminCompetition,
  AdminCourse,
  AdminStats,
} from '@kia./shared';
import { AdminErrorState, AdminLoading } from '@/components/admin/AdminStates';
import { useAdminAccess } from '@/components/admin/useAdminAccess';
import { BrandMark } from '@/components/brand/BrandMark';
import { DEPARTMENTS, type DepartmentSlug } from '@/components/brand/departments';
import { useLanguage } from '@/context/LanguageProvider';
import { api } from '@/lib/api';
import {
  DEPARTMENT_MODULES,
  departmentEntryPoints,
  departmentModCount,
  hasDepartmentMetrics,
} from '@/lib/adminDepartments';
import { DEPARTMENT_WORKSPACES } from '@/lib/adminNav';
import { ArrowLeft, ExternalLink } from 'lucide-react';

/**
 * Ops Center departments hub — six branded workspaces.
 * Counts only render when a real endpoint answered; empty departments stay honest.
 */

type DepartmentMetrics = {
  stats: AdminStats | null;
  courses: AdminCourse[] | null;
  challenges: AdminChallenge[] | null;
  competitions: AdminCompetition[] | null;
};

const EMPTY_METRICS: DepartmentMetrics = {
  stats: null,
  courses: null,
  challenges: null,
  competitions: null,
};

type Metric = { labelKey: string; value: number | null };
type LiveMetric = { labelKey: string; value: number };

function academyMetrics(data: DepartmentMetrics): Metric[] {
  return [
    { labelKey: 'admin.stats.courses', value: data.stats?.courses ?? data.courses?.length ?? null },
    { labelKey: 'admin.stats.lessons', value: data.stats?.lessons ?? null },
    { labelKey: 'admin.stats.enrollments', value: data.stats?.enrollments ?? null },
  ];
}

function eventMetrics(data: DepartmentMetrics): Metric[] {
  const competitions = data.competitions;
  return [
    {
      labelKey: 'admin.departments.metric.competitions',
      value: competitions ? competitions.length : null,
    },
    {
      labelKey: 'admin.departments.metric.activeCompetitions',
      value: competitions ? competitions.filter((item) => item.active).length : null,
    },
    {
      labelKey: 'admin.departments.metric.registrations',
      value: competitions
        ? competitions.reduce((total, item) => total + item.registrationCount, 0)
        : null,
    },
    {
      labelKey: 'admin.stats.challenges',
      value: data.challenges?.length ?? data.stats?.challenges ?? null,
    },
  ];
}

const METRICS_BY_DEPARTMENT: Record<DepartmentSlug, (data: DepartmentMetrics) => Metric[]> = {
  academy: academyMetrics,
  events: eventMetrics,
  work: () => [],
  material: () => [],
  community: () => [],
  labs: () => [],
};

export default function AdminDepartmentsPage() {
  const { t, format } = useLanguage();
  const { can } = useAdminAccess();

  const canStats = can('stats');
  const canCourses = can('courses');
  const canChallenges = can('challenges');
  const canCompetitions = can('competitions');

  const [data, setData] = useState<DepartmentMetrics>(EMPTY_METRICS);
  const [loading, setLoading] = useState(true);
  const [attempted, setAttempted] = useState(0);
  const [failed, setFailed] = useState(0);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    const calls: Promise<unknown>[] = [];
    const next: DepartmentMetrics = { ...EMPTY_METRICS };
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

    if (canStats) track(api.adminStats(), (value) => (next.stats = value));
    else if (canCourses) track(api.adminListCourses(), (value) => (next.courses = value));
    if (canChallenges) track(api.adminListChallenges(), (value) => (next.challenges = value));
    if (canCompetitions) track(api.adminListCompetitions(), (value) => (next.competitions = value));

    setLoading(true);
    void Promise.all(calls).then(() => {
      if (cancelled) return;
      setData(next);
      setAttempted(attempts);
      setFailed(failures);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [canStats, canCourses, canChallenges, canCompetitions, nonce]);

  const departments = useMemo(
    () =>
      DEPARTMENTS.map((department) => {
        const workspace = DEPARTMENT_WORKSPACES[department.slug];
        const metrics = METRICS_BY_DEPARTMENT[department.slug](data).filter(
          (metric): metric is LiveMetric => metric.value !== null,
        );
        const entryPoints = departmentEntryPoints(department.slug, can);
        return {
          ...department,
          name: t(department.titleKey),
          description: t(`admin.departments.${department.slug}.desc`),
          metrics,
          entryPoints,
          modCount: departmentModCount(department.slug),
          live: workspace.live,
          manageHref: workspace.href,
        };
      }),
    [data, can, t],
  );

  if (loading) return <AdminLoading label={t('admin.departments.loading')} />;

  if (attempted > 0 && failed === attempted) {
    return (
      <div className="admin-content">
        <AdminErrorState message={t('admin.departments.loadError')} onRetry={reload} />
      </div>
    );
  }

  return (
    <div className="ops-dept-hub">
      <section className="ops-dept-hub__intro" aria-labelledby="ops-dept-hub-title">
        <div>
          <span className="ops-dept-hub__kicker">{t('admin.departments.what')}</span>
          <h2 id="ops-dept-hub-title">{t('admin.nav.departments')}</h2>
          <p>{t('admin.departments.onePlatform')}</p>
        </div>
        <Link href="/admin/users/roles" className="btn-next admin-btn">
          {t('admin.departments.accessAction')}
        </Link>
      </section>

      {failed > 0 ? (
        <p className="admin-departments-note" role="status">
          {t('admin.departments.partialError')}
        </p>
      ) : null}

      <div className="ops-dept-grid">
        {departments.map((department) => (
          <article
            key={department.slug}
            className={`ops-dept-card ops-dept-card--${department.slug} dept--${department.slug}`}
            aria-labelledby={`admin-dept-${department.slug}`}
          >
            <div className="ops-dept-card__head">
              <span className="ops-dept-card__mark" aria-hidden>
                <BrandMark size={20} title="" />
              </span>
              <div className="ops-dept-card__copy">
                <h3 id={`admin-dept-${department.slug}`}>{department.name}</h3>
                <p>{department.description}</p>
              </div>
              <span
                className={`ops-dept-card__status ${department.live ? 'is-live' : 'is-soon'}`}
              >
                {department.live
                  ? t('admin.departments.status.live')
                  : t('admin.departments.noModule')}
              </span>
            </div>

            {department.metrics.length ? (
              <dl className="ops-dept-card__metrics">
                {department.metrics.map((metric) => (
                  <div key={metric.labelKey}>
                    <dt>{t(metric.labelKey)}</dt>
                    <dd>{format.number(metric.value)}</dd>
                  </div>
                ))}
              </dl>
            ) : null}

            {!DEPARTMENT_MODULES[department.slug].length ? (
              <div className="ops-dept-card__empty">
                <span>{t('admin.departments.noModuleHint')}</span>
              </div>
            ) : null}

            {DEPARTMENT_MODULES[department.slug].length && !department.entryPoints.length ? (
              <div className="ops-dept-card__empty">
                <span>{t('admin.departments.noAccess')}</span>
              </div>
            ) : null}

            {hasDepartmentMetrics(department.slug) && !department.entryPoints.length ? (
              <div className="ops-dept-card__empty">
                <span>{t('admin.departments.metricsHidden')}</span>
              </div>
            ) : null}

            <div className="ops-dept-card__actions">
              <Link href={department.manageHref} className="ops-dept-card__cta">
                {t('admin.departments.enterWorkspace')}
                <ArrowLeft size={14} aria-hidden />
              </Link>
              {department.entryPoints.slice(0, 2).map((entry) => (
                <Link key={entry.href} href={entry.href} className="ops-dept-card__ghost">
                  {t(entry.labelKey)}
                </Link>
              ))}
              <Link
                href={department.href}
                className="ops-dept-card__ghost"
                aria-label={t('admin.departments.publicAria', { name: department.name })}
              >
                <ExternalLink size={13} aria-hidden />
                {t('admin.departments.publicLabel')}
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
