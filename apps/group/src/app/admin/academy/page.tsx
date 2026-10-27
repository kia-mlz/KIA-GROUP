'use client';

import { BookOpen, ClipboardList, GraduationCap, Layers } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { AdminStats } from '@kia./shared';
import { DepartmentWorkspaceHome } from '@/components/admin/DepartmentWorkspaceHome';
import { AdminErrorState, AdminLoading } from '@/components/admin/AdminStates';
import { useAdminAccess } from '@/components/admin/useAdminAccess';
import { useLanguage } from '@/context/LanguageProvider';
import { api, ApiError } from '@/lib/api';
import { departmentEntryPoints } from '@/lib/adminDepartments';

/** Academy Ops workspace — live counts from admin stats + real module links. */
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
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : t('admin.departments.loadError')),
      )
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

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
    can('courses')
      ? {
          id: 'courses',
          label: t('admin.stats.courses'),
          value: format.number(stats.courses),
          href: '/admin/academy/courses',
          icon: BookOpen,
        }
      : null,
    can('courses')
      ? {
          id: 'lessons',
          label: t('admin.stats.lessons'),
          value: format.number(stats.lessons),
          href: '/admin/academy/courses',
          icon: Layers,
        }
      : null,
    can('stats')
      ? {
          id: 'enrollments',
          label: t('admin.stats.enrollments'),
          value: format.number(stats.enrollments),
          href: '/admin/analytics',
          icon: GraduationCap,
        }
      : null,
  ].filter(Boolean) as {
    id: string;
    label: string;
    value: string;
    href: string;
    icon: typeof BookOpen;
  }[];

  const modules = entryPoints.map((entry) => ({
    href: entry.href,
    label: t(entry.labelKey),
  }));

  const tools = [
    can('courses', 'manage') || can('courses', 'edit')
      ? {
          href: '/admin/academy/courses/new',
          label: t('admin.quick.createCourse'),
          icon: BookOpen,
        }
      : null,
    can('courses')
      ? {
          href: '/admin/academy/courses',
          label: t('admin.nav.coursesList'),
          icon: Layers,
        }
      : null,
    can('courses')
      ? {
          href: '/admin/academy/course-exams',
          label: t('admin.nav.courseExams'),
          icon: ClipboardList,
        }
      : null,
    can('tests')
      ? {
          href: '/admin/academy/tests',
          label: t('admin.nav.tests'),
          icon: ClipboardList,
        }
      : null,
  ].filter(Boolean) as { href: string; label: string; icon: typeof BookOpen }[];

  return (
    <DepartmentWorkspaceHome
      slug="academy"
      description={t('admin.departments.academy.desc')}
      metrics={metrics}
      modules={modules}
      tools={tools}
    />
  );
}
