'use client';

import type { ReadinessTestSummary } from '@kia./shared';
import { CheckCircle2, ClipboardList, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageProvider';
import { api, ApiError } from '@/lib/api';
import { CardShell, EmptyState, ProgressBar } from './CardShell';

export function TestResultsCard() {
  const router = useRouter();
  const { t, format } = useLanguage();
  const [tests, setTests] = useState<ReadinessTestSummary[]>([]);
  const [skills, setSkills] = useState<Array<{ label: string; value: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [history, report] = await Promise.all([
        api.listReadinessTests(),
        api.getTestReport().catch(() => null),
      ]);
      setTests(history.slice(0, 4));
      const moduleScores = report?.readiness?.percentages
        ? Object.entries(report.readiness.percentages).map(([label, value]) => ({
            label,
            value: Number(value) || 0,
          }))
        : [];
      if (moduleScores.length) {
        setSkills(moduleScores.slice(0, 5));
      } else if (history[0]) {
        setSkills([
          { label: t('dashboard.tests.overall'), value: Math.round(history[0].average) },
        ]);
      } else {
        setSkills([]);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('dashboard.tests.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <CardShell
      title={t('dashboard.tests.title')}
      icon={ClipboardList}
      isLoading={loading}
      error={error}
      onRetry={load}
      cta={
        <button
          type="button"
          className="dash-btn-ghost"
          onClick={() => router.push('/readiness')}
        >
          {t('dashboard.tests.cta')}
        </button>
      }
    >
      {tests.length === 0 ? (
        <EmptyState
          icon="📝"
          text={t('dashboard.tests.empty')}
          cta={t('dashboard.tests.cta')}
          onCta={() => router.push('/readiness')}
        />
      ) : (
        <div className="dash-stack">
          {skills.length > 0 ? (
            <div>
              <p className="dash-section-label">{t('dashboard.tests.skills')}</p>
              {skills.map((skill) => (
                <div key={skill.label} className="dash-skill-row">
                  <div className="dash-skill-meta">
                    <span>{skill.label}</span>
                    <span className="mono ltr-isolate">
                      {format.number(skill.value)}٪
                    </span>
                  </div>
                  <ProgressBar value={skill.value} />
                </div>
              ))}
            </div>
          ) : null}
          <div className="dash-divider-block">
            <p className="dash-section-label">{t('dashboard.tests.recent')}</p>
            {tests.map((test) => (
              <button
                key={test.id}
                type="button"
                className="dash-test-row"
                onClick={() => router.push(`/readiness/results?testId=${test.id}`)}
              >
                {test.passed ? (
                  <CheckCircle2 size={14} color="var(--progress)" aria-label={t('dashboard.testHistory.passed')} />
                ) : (
                  <XCircle size={14} color="var(--negative)" aria-label={t('dashboard.testHistory.needsWork')} />
                )}
                <span className="dash-test-row__title">
                  {t('dashboard.tests.itemLabel')} · {format.date(test.createdAt)}
                </span>
                <span
                  className={`mono ltr-isolate ${test.passed ? 'is-pass' : 'is-fail'}`}
                >
                  {format.number(Math.round(test.average))}٪
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </CardShell>
  );
}
