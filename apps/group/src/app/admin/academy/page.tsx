'use client';

import Link from 'next/link';
import { BookOpen, ChevronRight, ClipboardList, GraduationCap, Layers } from 'lucide-react';
import type { AdminStats } from '@kia./shared';
import { AdminErrorState, AdminLoading } from '@/components/admin/AdminStates';
import { useAdminAccess } from '@/components/admin/useAdminAccess';
import { useLanguage } from '@/context/LanguageProvider';
import { api, ApiError } from '@/lib/api';
import { useCallback, useEffect, useState } from 'react';
import { DEPARTMENT_MODULES, departmentEntryPoints } from '@/lib/adminDepartments';
import { useEffect as useEffectNamed } from 'react';

/**
 * Academy department panel — one screen answering "what does Academy manage
 * and where?". Counts come from the same real endpoints the global dashboard
 * uses; nothing is estimated.
 */
export default function AdminAcademyDashboardPage() {
  const { t, format } = useLanguage();
  const { can } = useAdminAccess();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    api
      .adminStats()
      .then(setStats)
      .catch((err) => setError(err instanceof ApiError ? err.message : t('admin.departments.loadError')))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  // Named import above kept for symmetry with sibling department pages.
  useEffectNamed(() => {}, []);

  const entryPoints = departmentEntryPoints('academy', can);

  if (loading) return <AdminLoading label={t('admin.departments.loading')} />;
  if (error || !stats) {
    return (
      <div className="admin-content">
        <div className="admin-card">
          <AdminErrorState message={error || t('admin.departments.loadError')} onRetry={load} />
        </div>
      </div>
    );
  }

  const metrics = [
    { labelKey: 'admin.stats.courses', value: stats.courses, href: '/admin/academy/courses', icon: BookOpen, gated: can('courses') },
    { labelKey: 'admin.stats.lessons', value: stats.lessons, href: '/admin/academy/courses', icon: Layers, gated: can('courses') },
    { labelKey: 'admin.stats.enrollments', value: stats.enrollments, href: '/admin/analytics', icon: GraduationCap, gated: can('stats') },
  ];

  return (
    <div className="admin-content">
      <div className="breadcrumbs" aria-label={t('admin.breadcrumb')}>
        <Link href="/admin">{t('admin.breadcrumbRoot')}</Link>
        <ChevronRight size={10} className="admin-breadcrumb-sep" aria-hidden />
        <Link href="/admin/departments">{t('admin.nav.departments')}</Link>
        <ChevronRight size={10} className="admin-breadcrumb-sep" aria-hidden />
        <strong>{t('dashboard.doors.academyTitle')}</strong>
      </div>

      <section className="page-intro">
        <div>
          <span className="section-kicker">{t('admin.departments.what')}</span>
          <h1>{t('dashboard.doors.academyTitle')}</h1>
          <p>{t('admin.departments.academy.desc')}</p>
        </div>
      </section>

      <div className="admin-kpi-grid">
        {metrics.map((metric) => (
          <Link
            key={metric.labelKey}
            href={metric.gated ? metric.href : '/admin/academy'}
            className="admin-stat-card"
          >
            <div className="admin-stat-row">
              <div>
                <span className="admin-stat-label">{t(metric.labelKey)}</span>
                <div className="admin-stat-value">{format.number(metric.value)}</div>
              </div>
              <span className="admin-stat-icon">
                <metric.icon size={18} />
              </span>
            </div>
          </Link>
        ))}
      </div>

      <article className="admin-card">
        <h2>{t('admin.departmentPanel.modules')}</h2>
        {DEPARTMENT_MODULES.academy.length && entryPoints.length ? (
          <div className="admin-department-actions">
            {entryPoints.map((entry) => (
              <Link key={entry.href} href={entry.href} className="btn-next admin-btn">
                {t(entry.labelKey)}
              </Link>
            ))}
          </div>
        ) : (
          <p className="admin-department-status">
            {entryPoints.length
              ? t('admin.departments.noModule')
              : t('admin.departments.noAccess')}
          </p>
        )}
      </article>

      <article className="admin-card">
        <h2>{t('admin.departmentPanel.tools')}</h2>
        <div className="admin-quick-tiles">
          {can('courses') ? (
            <Link href="/admin/academy/courses/new" className="admin-quick-tile">
              <BookOpen size={18} aria-hidden /> {t('admin.quick.createCourse')}
            </Link>
          ) : null}
          {can('courses') ? (
            <Link href="/admin/academy/courses" className="admin-quick-tile">
              <Layers size={18} aria-hidden /> {t('admin.nav.coursesList')}
            </Link>
          ) : null}
          {can('tests') ? (
            <Link href="/admin/academy/tests" className="admin-quick-tile">
              <ClipboardList size={18} aria-hidden /> {t('admin.nav.tests')}
            </Link>
          ) : null}
        </div>
      </article>
    </div>
  );
}
