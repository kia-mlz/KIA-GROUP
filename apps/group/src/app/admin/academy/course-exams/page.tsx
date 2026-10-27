'use client';

import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { AdminCourseExam } from '@kia./shared';
import { useLanguage } from '@/context/LanguageProvider';
import { api, ApiError } from '@/lib/api';

export default function AdminCourseExamsIndexPage() {
  const { t, format } = useLanguage();
  const [exams, setExams] = useState<AdminCourseExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .adminListAllCourseExams()
      .then(setExams)
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : t('admin.courses.exams.loadError'));
      })
      .finally(() => setLoading(false));
  }, [t]);

  if (loading) {
    return (
      <div className="admin-content auth-loading">
        <Loader2 size={24} className="spin" /> {t('admin.courses.exams.indexLoading')}
      </div>
    );
  }

  return (
    <div className="admin-content">
      <div className="admin-header-row">
        <div>
          <h1>{t('admin.courses.exams.indexTitle')}</h1>
          <p className="admin-sub">{t('admin.courses.exams.indexSub')}</p>
        </div>
        <Link href="/admin/academy/courses" className="btn-next admin-btn">
          {t('admin.courses.exams.browseCourses')}
        </Link>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t('admin.courses.exams.colCourse')}</th>
              <th>{t('admin.courses.col.title')}</th>
              <th>{t('admin.courses.exams.colKind')}</th>
              <th>{t('admin.courses.exams.colPlacement')}</th>
              <th>{t('admin.courses.exams.colQuestions')}</th>
              <th>{t('common.published')}</th>
              <th>{t('admin.courses.col.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {exams.map((exam) => (
              <tr key={exam.id}>
                <td>
                  <Link
                    href={`/admin/academy/courses/${exam.courseSlug}/edit`}
                    className="admin-link"
                  >
                    {exam.courseTitle}
                  </Link>
                  <br />
                  <code dir="ltr">{exam.courseSlug}</code>
                </td>
                <td>
                  <strong>{exam.title}</strong>
                </td>
                <td>
                  <span className={`admin-badge${exam.kind === 'MIDTERM' ? '' : ' ok'}`}>
                    {exam.kind === 'MIDTERM'
                      ? t('admin.courses.exams.kindMidterm')
                      : t('admin.courses.exams.kindFinal')}
                  </span>
                </td>
                <td>
                  {exam.afterLessonSlug
                    ? t('admin.courses.exams.afterLesson', { lesson: exam.afterLessonSlug })
                    : t('admin.courses.exams.endOfCourse')}
                </td>
                <td>{format.number(exam.questions.length)}</td>
                <td>
                  <span className={`admin-badge${exam.published ? ' ok' : ''}`}>
                    {exam.published ? t('common.yes') : t('common.no')}
                  </span>
                </td>
                <td className="admin-actions">
                  <Link
                    href={`/admin/academy/courses/${exam.courseSlug}/edit`}
                    className="admin-link"
                  >
                    {t('admin.courses.exams.manageInCourse')}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {exams.length === 0 && !error && (
        <p className="admin-sub">{t('admin.courses.exams.indexEmpty')}</p>
      )}
    </div>
  );
}
