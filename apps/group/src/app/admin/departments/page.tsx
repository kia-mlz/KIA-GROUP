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
  departmentTags,
  hasDepartmentMetrics,
} from '@/lib/adminDepartments';
import { ChevronRight } from 'lucide-react';


/**
 * One place to answer "where do I manage this department?".
 *
 * The six departments are already written down once (`DEPARTMENTS`), and so are
 * the admin modules that manage them, so this page invents no second list: it
 * walks the registry, attaches the real modules a department owns, and prints
 * counts that come from those modules' own endpoints.
 *
 * Honesty rules the page follows (an admin panel that lies is worse than one
 * that is incomplete):
 *  - A count is only shown when the endpoint that owns it answered. Nothing is
 *    estimated, and a department with no admin module says so instead of
 *    showing zeros that look like empty data.
 *  - Modules the current admin cannot open are never rendered (UI gating; the
 *    API enforces the same sections on every route).
 *  - Work / Material / Community / Labs have no admin module yet. Their cards
 *    offer the public page and say plainly that there is nothing to manage.
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

/** A single live number: where its label comes from and what the endpoint said. */
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
    // Each call is permission-gated on the same section its route guards, and
    // isolated: one failing endpoint must not blank the whole page.
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
        // Only numbers an endpoint actually returned are rendered.
        const metrics = METRICS_BY_DEPARTMENT[department.slug](data).filter(
          (metric): metric is LiveMetric => metric.value !== null,
        );
        const entryPoints = departmentEntryPoints(department.slug, can);
        // Tags show the module areas a department owns. When every module is
        // also rendered as an entry-point button, the tag row only repeats the
        // buttons' own labels — suppress it there so the card reads once.
        const entryPointKeys = new Set(
          entryPoints.map((entry) => t(entry.labelKey)),
        );
        const tags = departmentTags(department.slug)
          .map((labelKey) => t(labelKey))
          .filter((label) => !entryPointKeys.has(label));
        return {
          ...department,
          name: t(department.titleKey),
          description: t(`admin.departments.${department.slug}.desc`),
          metrics,
          entryPoints,
          tags,
          modCount: departmentModCount(department.slug),
        };
      }),
    [data, can, t],
  );

  if (loading) return <AdminLoading label={t('admin.departments.loading')} />;

  // Every endpoint we were allowed to ask failed: that is a page-level error,
  // not six quiet em-dashes.
  if (attempted > 0 && failed === attempted) {
    return (
      <div className="admin-content">
        <AdminErrorState message={t('admin.departments.loadError')} onRetry={reload} />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="workspace">
        <div className="content">
          <div className="breadcrumbs" aria-label={t('admin.breadcrumb')}>
            <Link href="/admin">{t('admin.breadcrumbRoot')}</Link>
            <ChevronRight size={10} className="admin-breadcrumb-sep" aria-hidden />
            <strong>{t('admin.nav.departments')}</strong>
          </div>

          <section className="page-intro">
            <div>
              <span className="section-kicker">{t('admin.departments.what')}</span>
              <h1>{t('admin.nav.departments')}</h1>
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

          <div className="admin-department-grid">
            {departments.map((department) => (
              <article
                key={department.slug}
                className={`admin-card admin-department dept--${department.slug}`}
                aria-labelledby={`admin-dept-${department.slug}`}
              >
                <div className="admin-department-head">
                  <span className="department-icon admin-department-icon" aria-hidden>
                    <BrandMark size={22} title="" />
                  </span>
                  <div className="admin-department-copy">
                    <h3 id={`admin-dept-${department.slug}`}>{department.name}</h3>
                    <p>{department.description}</p>
                  </div>
                  {department.tags.length ? (
                    <div className="admin-department-tags">
                      {department.tags.map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>
                  ) : null}
                  {department.modCount != null ? (
                    <span className="admin-badge control-badge">
                      {department.modCount}
                    </span>
                  ) : null}
                </div>

                {department.metrics.length ? (
                  <dl className="admin-department-metrics">
                    {department.metrics.map((metric) => (
                      <div key={metric.labelKey}>
                        <dt>{t(metric.labelKey)}</dt>
                        <dd>{format.number(metric.value)}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}

                {department.tags.length ? (
                  <div className="admin-department-tags">
                    {department.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                ) : null}

                {department.entryPoints.length ? (
                  <div className="admin-department-actions">
                    {department.entryPoints.map((entry) => (
                      <Link key={entry.href} href={entry.href} className="btn-next admin-btn">
                        {t(entry.labelKey)}
                      </Link>
                    ))}
                  </div>
                ) : null}

                {!DEPARTMENT_MODULES[department.slug].length ? (
                  <p className="admin-department-status">
                    <span className="admin-badge">{t('admin.departments.noModule')}</span>
                    <span>{t('admin.departments.noModuleHint')}</span>
                  </p>
                ) : null}

                {DEPARTMENT_MODULES[department.slug].length && !department.entryPoints.length ? (
                  <p className="admin-department-status">
                    <span>{t('admin.departments.noAccess')}</span>
                  </p>
                ) : null}

                {hasDepartmentMetrics(department.slug) && !department.entryPoints.length ? (
                  <p className="admin-department-status admin-department-status--muted">
                    <span>{t('admin.departments.metricsHidden')}</span>
                  </p>
                ) : null}

                <footer className="admin-department-footer">
                  <Link
                    href={department.href}
                    className="admin-link"
                    aria-label={t('admin.departments.publicAria', { name: department.name })}
                  >
                    {t('admin.departments.publicLabel')}
                  </Link>
                </footer>
              </article>
            ))}
          </div>

          <footer className="site-footer">
            <span>{t('admin.departments.footerLine')}</span>
            <span>{t('admin.departments.footerNote')}</span>
          </footer>
        </div>
      </div>
    </div>
  );
}
