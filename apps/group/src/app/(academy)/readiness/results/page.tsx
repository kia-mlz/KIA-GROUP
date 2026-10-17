'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import {
  computeReadinessResult,
  type ExamSubmitResult,
  type LearnerTestReport,
  type LearnerTestReportReadiness,
} from '@kia./shared';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { FullTestReport } from '@/components/test/FullTestReport';
import { useApp } from '@/context/AppProvider';
import { useLanguage } from '@/context/LanguageProvider';
import { api, ApiError } from '@/lib/api';

function pickLocale(
  text: { fa: string; en: string } | string,
  locale: string,
): string {
  if (typeof text === 'string') return text;
  return locale === 'fa' ? text.fa : text.en;
}

function fromExamResult(activeExam: ExamSubmitResult): LearnerTestReportReadiness {
  return {
    id: activeExam.attemptId,
    createdAt: activeExam.submittedAt,
    percentages: activeExam.percentages,
    average: activeExam.average,
    passed: activeExam.passed,
    verdict: activeExam.verdict,
    outcome: activeExam.outcome,
  };
}

function ReadinessResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const testId = searchParams.get('testId');
  const { t, locale } = useLanguage();
  const {
    readinessScores,
    readinessResult,
    examResult,
    testCompleted,
    hydrated,
    roadmap,
    answers,
  } = useApp();
  const [report, setReport] = useState<LearnerTestReport | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  const hasScores = Object.keys(readinessScores).length > 0;
  const localFallback = useMemo(
    () => readinessResult ?? (hasScores ? computeReadinessResult(readinessScores) : null),
    [readinessResult, readinessScores, hasScores],
  );

  const localReadinessOverride = useMemo(() => {
    if (testId) return null;
    if (examResult) return fromExamResult(examResult);
    if (localFallback) {
      return {
        id: 'local',
        createdAt: new Date().toISOString(),
        ...localFallback,
      } satisfies LearnerTestReportReadiness;
    }
    return null;
  }, [testId, examResult, localFallback]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    api
      .getTestReport(testId ?? undefined)
      .then((res) => {
        if (cancelled) return;
        setReport(res);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        // Offline / unauthenticated fallback: compose from in-memory app state.
        if (!testId && (examResult || localFallback || answers.goal)) {
          setReport({
            personality: null,
            assessment: answers.goal
              ? {
                  id: 'local',
                  answers,
                  createdAt: new Date().toISOString(),
                }
              : null,
            readiness: examResult
              ? fromExamResult(examResult)
              : localFallback
                ? {
                    id: 'local',
                    createdAt: new Date().toISOString(),
                    ...localFallback,
                  }
                : null,
            roadmap: roadmap
              ? {
                  id: roadmap.id,
                  trackKey: roadmap.trackKey,
                  trackName: roadmap.trackName,
                  level: roadmap.level,
                  profile: roadmap.profile,
                }
              : null,
          });
          setLoading(false);
          return;
        }
        setLoadError(err instanceof ApiError ? err.message : t('common.errorFallback'));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [testId, t, examResult, localFallback, answers, roadmap]);

  useEffect(() => {
    if (!hydrated || loading || report) return;
    if (testId) return;
    if (!testCompleted && !hasScores && !readinessResult && !examResult) {
      router.replace('/readiness');
    }
  }, [
    hydrated,
    loading,
    report,
    testCompleted,
    hasScores,
    readinessResult,
    examResult,
    router,
    testId,
  ]);

  if (loadError && !report) {
    return (
      <div className="page-content">
        <div className="container results">
          <p className="form-error">{loadError}</p>
          <button type="button" className="cta-secondary" onClick={() => router.push('/dashboard')}>
            {t('readiness.results.backDashboard')}
          </button>
        </div>
      </div>
    );
  }

  if (loading || !report) {
    return (
      <div className="page-content">
        <div className="container results">
          <p className="sub">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  const readiness = localReadinessOverride ?? report.readiness;
  const roadmapId = readiness?.outcome?.roadmapId ?? report.roadmap?.id ?? roadmap?.id;
  const roadmapHref = roadmapId
    ? `/roadmap?roadmapId=${encodeURIComponent(roadmapId)}`
    : '/roadmap';

  const unlockTitle = readiness
    ? pickLocale(readiness.verdict.unlockTitle, locale)
    : t('tests.report.continueTitle');
  const unlockSub = readiness
    ? pickLocale(readiness.verdict.unlockSub, locale)
    : t('tests.report.continueSub');

  return (
    <div className="page-content">
      <div className="container results exam-results">
        <div className="results-tag">{t('tests.report.tag')}</div>
        <h2>{t('tests.report.title')}</h2>
        <p className="sub">{t('tests.report.sub')}</p>

        <FullTestReport report={report} readinessOverride={localReadinessOverride} />

        <div className="unlock-cta">
          <div>
            <h5>{unlockTitle}</h5>
            <p>{unlockSub}</p>
          </div>
          <div className="results-actions">
            <button type="button" className="cta-primary" onClick={() => router.push(roadmapHref)}>
              {t('readiness.results.viewRoadmap')}
            </button>
            <button type="button" className="cta-secondary" onClick={() => router.push('/dashboard')}>
              {t('readiness.results.backDashboard')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReadinessResultsPage() {
  return (
    <RequireAuth nextPath="/readiness/results" learnerFlow>
      <Suspense
        fallback={
          <div className="page-content auth-loading">
            {/* loading text filled by inner content */}
          </div>
        }
      >
        <ReadinessResultsContent />
      </Suspense>
    </RequireAuth>
  );
}
