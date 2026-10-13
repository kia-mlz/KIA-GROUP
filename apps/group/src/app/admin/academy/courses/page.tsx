'use client';

import Link from 'next/link';
import { Loader2, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageProvider';
import { api, ApiError } from '@/lib/api';
import type { AdminCourse } from '@kia-group/shared';

export default function AdminCoursesPage() {
  const { t } = useLanguage();
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .adminListCourses()
      .then(setCourses)
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : t('admin.courses.loadError'));
      })
      .finally(() => setLoading(false));
  }, [t]);

  const handleDelete = async (slug: string) => {
    if (!confirm(t('admin.courses.deleteConfirm', { slug }))) return;
    try {
      await api.adminDeleteCourse(slug);
      setCourses((prev) => prev.filter((c) => c.slug !== slug));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.courses.deleteError'));
    }
  };

  const handleToggleComingSoon = async (course: AdminCourse) => {
    setError('');
    try {
      const updated = await api.adminUpdateCourse(course.slug, {
        comingSoon: !course.comingSoon,
      });
      setCourses((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.courses.saveError'));
    }
  };

  if (loading) {
    return (
      <div className="admin-content auth-loading">
        <Loader2 size={24} className="spin" /> {t('admin.courses.loading')}
      </div>
    );
  }

  return (
    <div className="admin-content">
      <div className="admin-header-row">
        <div>
          <h1>{t('admin.courses.title')}</h1>
          <p className="admin-sub">{t('admin.courses.sub')}</p>
        </div>
        <Link href="/admin/academy/courses/new" className="btn-next admin-btn">
          <Plus size={16} /> {t('admin.courses.new')}
        </Link>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t('admin.courses.col.title')}</th>
              <th>{t('admin.courses.col.slug')}</th>
              <th>{t('admin.courses.col.lessons')}</th>
              <th>{t('admin.courses.col.status')}</th>
              <th>{t('admin.courses.col.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((course) => (
              <tr key={course.id}>
                <td>
                  <span className="admin-table-icon">{course.icon || '📘'}</span>
                  {course.title}
                </td>
                <td>
                  <code>{course.slug}</code>
                </td>
                <td>{course.lessonCount ?? course.lessons?.length ?? 0}</td>
                <td>
                  <span className={`admin-badge${course.published ? ' ok' : ''}`}>
                    {course.published
                      ? t('domain.courseStatuses.published')
                      : t('domain.courseStatuses.draft')}
                  </span>
                  {course.comingSoon ? (
                    <span className="admin-badge soon">{t('admin.courses.comingSoon')}</span>
                  ) : null}
                </td>
                <td className="admin-actions">
                  <Link href={`/admin/academy/courses/${course.slug}/edit`} className="admin-link">
                    {t('common.edit')}
                  </Link>
                  <button
                    type="button"
                    className={`admin-link${course.comingSoon ? ' active-soon' : ''}`}
                    onClick={() => handleToggleComingSoon(course)}
                  >
                    {course.comingSoon
                      ? t('admin.courses.comingSoonOff')
                      : t('admin.courses.comingSoon')}
                  </button>
                  <button
                    type="button"
                    className="admin-link danger"
                    onClick={() => handleDelete(course.slug)}
                  >
                    {t('common.delete')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {courses.length === 0 && <p className="admin-sub">{t('admin.courses.empty')}</p>}
    </div>
  );
}
