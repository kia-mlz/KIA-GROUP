'use client';

import type { CourseAttachmentDto, CourseSummary } from '@kia./shared';
import { BookOpen, Loader2, Paperclip, Ticket } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { CourseTileIcon } from '@/components/catalog/CourseTileIcon';
import { useAuth } from '@/context/AuthProvider';
import { useLanguage } from '@/context/LanguageProvider';
import { api, ApiError } from '@/lib/api';
import { assignCardAccents, tintClass } from '@/lib/cardAccent';
import { localizeCourse } from '@/lib/courseLocalization';

export default function MyCoursesPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { t, locale } = useLanguage();
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [attachmentsBySlug, setAttachmentsBySlug] = useState<Record<string, CourseAttachmentDto[]>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace('/education?next=/dashboard/my-courses');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const mine = await api.listMyCourses();
        if (cancelled) return;
        setCourses(mine);
        const attachmentEntries = await Promise.all(
          mine.map(async (course) => {
            try {
              const files = await api.listCourseAttachments(course.slug);
              return [course.slug, files] as const;
            } catch {
              return [course.slug, []] as const;
            }
          }),
        );
        if (!cancelled) {
          setAttachmentsBySlug(Object.fromEntries(attachmentEntries));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : t('courses.loadError'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, router, t]);

  const localizedCourses = useMemo(
    () => courses.map((course) => localizeCourse(course, locale)),
    [courses, locale],
  );
  // Same accents as the public catalog: a course keeps its colour on both grids.
  const accents = useMemo(
    () => assignCardAccents(localizedCourses.map((course) => course.slug)),
    [localizedCourses],
  );

  if (authLoading || loading) {
    return (
      <div className="page-content auth-loading">
        <Loader2 size={24} className="spin" /> {t('courses.loading')}
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="container catalog-shell">
        <span className="eyebrow">
          <BookOpen size={14} className="inline-leading-icon" />
          {t('panel.nav.myCourses')}
        </span>
        <h1>{t('courses.title')}</h1>
        <p className="auth-sub">{t('courses.sub')}</p>
        {error ? <p className="form-error">{error}</p> : null}
        <div className="catalog-grid">
          {localizedCourses.map((course, index) => {
            const attachments = attachmentsBySlug[course.slug] ?? [];
            return (
              <article key={course.id} className={`catalog-card ${tintClass(accents[index])}`}>
                <CourseTileIcon icon={course.icon} />
                <h3>
                  {course.title}
                  {course.comingSoon ? (
                    <span className="catalog-soon">{t('common.comingSoon')}</span>
                  ) : null}
                </h3>
                <div className="catalog-meta">
                  <span>{t('common.percentComplete', { pct: course.progressPct })}</span>
                  <span>{t('common.lessonsCount', { count: course.lessonCount })}</span>
                </div>
                <div className="catalog-actions">
                  <Link
                    className="btn btn--primary"
                    href={
                      course.firstLessonSlug
                        ? `/learn/${course.slug}/${course.firstLessonSlug}`
                        : `/courses/${course.slug}`
                    }
                  >
                    <BookOpen size={14} aria-hidden="true" />
                    {t('courses.enter')}
                  </Link>
                  <Link
                    className="btn btn--secondary"
                    href={`/dashboard/tickets/new?course=${encodeURIComponent(course.slug)}`}
                  >
                    <Ticket size={14} aria-hidden="true" />
                    {t('panel.courses.createTicket')}
                  </Link>
                </div>
                <div className="attachment-list">
                  <span className="eyebrow">
                    <Paperclip size={12} className="inline-leading-icon" />
                    {t('panel.courses.attachments')}
                  </span>
                  {attachments.length === 0 ? (
                    <p className="panel-muted">{t('panel.courses.noAttachments')}</p>
                  ) : (
                    attachments.map((file) => (
                      <a
                        key={file.id}
                        className="link-quiet"
                        href={file.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {file.title}
                      </a>
                    ))
                  )}
                </div>
              </article>
            );
          })}
        </div>
        {!error && localizedCourses.length === 0 ? (
          <p className="auth-sub">{t('courses.empty')}</p>
        ) : null}
      </div>
    </div>
  );
}
