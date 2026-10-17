'use client';

import type { CourseSummary } from '@kia./shared';
import { ShoppingBag, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { DashboardGate, PanelPage } from '@/components/dashboard/DashboardShell';
import { useApp } from '@/context/AppProvider';
import { useAuth } from '@/context/AuthProvider';
import { useLanguage } from '@/context/LanguageProvider';
import { api, ApiError } from '@/lib/api';
import { localizeCourse } from '@/lib/courseLocalization';

export default function PurchasesPage() {
  const { t, locale } = useLanguage();
  const { hasRoadmap, roadmap } = useApp();
  const { learnerState } = useAuth();
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api
      .listMyCourses()
      .then((data) => {
        if (!cancelled) setCourses(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : t('panel.purchases.loadError'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const localized = useMemo(
    () => courses.map((course) => localizeCourse(course, locale)),
    [courses, locale],
  );

  const ownsRoadmap = hasRoadmap || Boolean(learnerState?.hasRoadmap);
  const roadmapEnrolled = Boolean(learnerState?.roadmapEnrolled || roadmap);

  return (
    <DashboardGate nextPath="/dashboard/purchases">
      <PanelPage
        eyebrow={
          <>
            <ShoppingBag size={14} className="inline-leading-icon" />
            {t('panel.nav.purchases')}
          </>
        }
        title={t('panel.purchases.title')}
        sub={t('panel.purchases.sub')}
      >
        {loading ? (
          <p className="auth-loading">
            <Loader2 size={18} className="spin" /> {t('common.loading')}
          </p>
        ) : null}
        {error ? <p className="form-error">{error}</p> : null}

        <section className="panel-section">
          <h2>{t('panel.purchases.roadmaps')}</h2>
          {ownsRoadmap ? (
            <div className="panel-row">
              <div className="panel-row__main">
                <b>{roadmap?.trackName || t('panel.purchases.yourRoadmap')}</b>
                <span>
                  {roadmapEnrolled
                    ? t('panel.purchases.enrolled')
                    : t('panel.purchases.notEnrolled')}
                </span>
              </div>
              <div className="panel-row__actions">
                <Link href="/roadmap" className="btn btn--secondary">
                  {t('panel.purchases.openRoadmap')}
                </Link>
              </div>
            </div>
          ) : (
            <p className="panel-muted">{t('panel.purchases.noRoadmap')}</p>
          )}
        </section>

        <section className="panel-section">
          <h2>{t('panel.purchases.courses')}</h2>
          {!loading && localized.length === 0 ? (
            <p className="panel-muted">{t('panel.purchases.noCourses')}</p>
          ) : null}
          <div className="panel-list">
            {localized.map((course) => (
              <div key={course.id} className="panel-row">
                <div className="panel-row__main">
                  <b>{course.title}</b>
                  <span>{t('common.percentComplete', { pct: course.progressPct })}</span>
                </div>
                <div className="panel-row__actions">
                  <Link
                    href={
                      course.firstLessonSlug
                        ? `/learn/${course.slug}/${course.firstLessonSlug}`
                        : `/courses/${course.slug}`
                    }
                    className="btn btn--primary"
                  >
                    {t('courses.enter')}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      </PanelPage>
    </DashboardGate>
  );
}
