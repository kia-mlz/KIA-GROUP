'use client';

import type { CourseSummary } from '@kia./shared';
import { BookOpen, Play } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { useLanguage } from '@/context/LanguageProvider';
import { api, ApiError } from '@/lib/api';
import { CardShell, EmptyState, ProgressBar } from './CardShell';

const COURSE_TONES = ['brand', 'mint', 'amber', 'brand-soft', 'brand-strong', 'value'] as const;

function courseToneVars(tone: (typeof COURSE_TONES)[number]): CSSProperties {
  switch (tone) {
    case 'mint':
      return {
        '--dash-course-fill': 'var(--mint-500)',
        '--dash-course-tint': 'var(--progress-tint)',
      } as CSSProperties;
    case 'amber':
    case 'value':
      return {
        '--dash-course-fill': 'var(--amber-500)',
        '--dash-course-tint': 'var(--value-tint)',
      } as CSSProperties;
    case 'brand-soft':
      return {
        '--dash-course-fill': 'var(--brand-400)',
        '--dash-course-tint': 'var(--brand-tint)',
      } as CSSProperties;
    case 'brand-strong':
      return {
        '--dash-course-fill': 'var(--brand-600)',
        '--dash-course-tint': 'var(--brand-tint-strong)',
      } as CSSProperties;
    default:
      return {
        '--dash-course-fill': 'var(--brand-500)',
        '--dash-course-tint': 'var(--brand-tint)',
      } as CSSProperties;
  }
}

function courseStatus(progress: number): 'learning' | 'completed' | 'notStarted' {
  if (progress >= 100) return 'completed';
  if (progress > 0) return 'learning';
  return 'notStarted';
}

export function EnrolledCourses() {
  const router = useRouter();
  const { t, format } = useLanguage();
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const mine = await api.listMyCourses();
      setCourses(mine.slice(0, 6));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('dashboard.courses.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const statusLabel = {
    learning: t('dashboard.courses.status.learning'),
    completed: t('dashboard.courses.status.completed'),
    notStarted: t('dashboard.courses.status.notStarted'),
  };

  return (
    <CardShell
      title={t('dashboard.courses.title')}
      icon={BookOpen}
      span="full"
      isLoading={loading}
      error={error}
      onRetry={load}
      cta={
        <Link href="/dashboard/my-courses" className="dash-btn-ghost">
          {t('dashboard.courses.viewAll')}
        </Link>
      }
    >
      {courses.length === 0 ? (
        <EmptyState
          icon="📚"
          text={t('panel.purchases.noCourses')}
          cta={t('dashboard.courses.browse')}
          onCta={() => router.push('/courses')}
        />
      ) : (
        <div className="dash-course-grid">
          {courses.map((course, index) => {
            const status = courseStatus(course.progressPct);
            const tone = COURSE_TONES[index % COURSE_TONES.length];
            return (
              <article
                key={course.id}
                className="dash-course-card"
                style={courseToneVars(tone)}
              >
                <div className="dash-course-card__thumb">
                  <div className="dash-course-card__icon">
                    <BookOpen size={20} color="var(--on-fill)" aria-hidden="true" />
                  </div>
                  <span className={`dash-tag dash-tag--${status}`}>{statusLabel[status]}</span>
                </div>
                <div className="dash-course-card__body">
                  <div className="dash-course-card__title">{course.title}</div>
                  <div className="dash-skill-meta">
                    <span>{t('dashboard.courses.progress')}</span>
                    <span className="mono ltr-isolate dash-course-card__pct">
                      {format.number(Math.round(course.progressPct))}٪
                    </span>
                  </div>
                  <ProgressBar value={course.progressPct} color="var(--dash-course-fill)" height={5} />
                  <Link
                    href={
                      course.firstLessonSlug
                        ? `/learn/${course.slug}/${course.firstLessonSlug}`
                        : `/courses/${course.slug}`
                    }
                    className="dash-btn-primary dash-btn-block dash-course-card__cta"
                  >
                    <Play size={10} aria-hidden="true" /> {t('dashboard.courses.enter')}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </CardShell>
  );
}
