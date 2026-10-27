'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { BookOpen, Compass } from 'lucide-react';
import { AcademyOverviewTiles } from '@/components/dashboard/AcademyOverviewTiles';
import { EnrolledCourses } from '@/components/dashboard/EnrolledCourses';
import { ProgressChart } from '@/components/dashboard/ProgressChart';
import { TestResultsCard } from '@/components/dashboard/TestResultsCard';
import { ToastProvider } from '@/components/dashboard/ToastProvider';
import { useApp } from '@/context/AppProvider';
import { useAuth } from '@/context/AuthProvider';
import { useLanguage } from '@/context/LanguageProvider';

/**
 * Kia Academy learner panel — courses, progress and exam results only.
 * Events / wallet / support live in their own department or platform menus.
 */
export default function AcademyDashboardPage() {
  const router = useRouter();
  const { hasRoadmap, hydrated } = useApp();
  const { user, learnerState, loading: authLoading, isAuthenticated } = useAuth();
  const { t } = useLanguage();

  const ownsRoadmap = hasRoadmap || Boolean(learnerState?.hasRoadmap);
  const ready = hydrated && !authLoading;

  useEffect(() => {
    if (!ready) return;
    if (!isAuthenticated) {
      router.replace(`/education?next=${encodeURIComponent('/dashboard')}`);
    }
  }, [ready, isAuthenticated, router]);

  if (!ready || !isAuthenticated) {
    return <div className="page-content auth-loading">{t('dashboard.loading')}</div>;
  }

  if (!ownsRoadmap) {
    return (
      <div className="page-content dept--academy">
        <div className="container hub">
          <header className="page-head">
            <div>
              <span className="eyebrow">{t('panel.departments.academy')}</span>
              <h1>
                {user?.name
                  ? t('dashboard.welcomeNamed', { name: user.name.split(' ')[0] })
                  : t('dashboard.welcome')}
              </h1>
              <p>{t('dashboard.empty.sub')}</p>
            </div>
          </header>

          <AcademyOverviewTiles />

          <div className="bento">
            <Link href="/assessment" className="tile tile--half tile--feature">
              <span className="t-icon t-icon--brand" aria-hidden="true">
                <Compass size={22} />
              </span>
              <b>{t('dashboard.empty.startAssessment.title')}</b>
              <span>{t('dashboard.empty.startAssessment.desc')}</span>
              <span className="t-status t-status--brand">
                {t('dashboard.empty.startAssessment.status')}
              </span>
            </Link>
            <Link href="/courses" className="tile tile--half">
              <span className="t-icon" aria-hidden="true">
                <BookOpen size={22} />
              </span>
              <b>{t('dashboard.empty.browseCourses.title')}</b>
              <span>{t('dashboard.empty.browseCourses.desc')}</span>
              <span className="t-status">{t('dashboard.empty.browseCourses.status')}</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="page-content dash-panel dept--academy">
        <div className="dash-panel__inner">
          <header className="dept-learner-panel__head">
            <span className="eyebrow">{t('panel.departments.academy')}</span>
            <h1>
              {user?.name
                ? t('dashboard.welcomeNamed', { name: user.name.split(' ')[0] })
                : t('panel.departmentPanel.academy.title')}
            </h1>
            <p>{t('panel.departmentPanel.academy.sub')}</p>
          </header>

          <AcademyOverviewTiles />

          <div className="dash-grid dash-grid--academy">
            <ProgressChart />
            <TestResultsCard />
            <EnrolledCourses />
          </div>
        </div>
      </div>
    </ToastProvider>
  );
}
