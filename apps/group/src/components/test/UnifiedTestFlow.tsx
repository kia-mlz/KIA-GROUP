'use client';

import {
  WIZARD_STAGES,
  type AssessmentAnswers,
  type ExamSubmitResult,
  type MiniIpipAnswers,
} from '@kia./shared';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ExamPlayer } from '@/components/exam/ExamPlayer';
import { PersonalityTestPlayer } from '@/components/test/PersonalityTestPlayer';
import { TestBoard } from '@/components/test/TestBoard';
import { ProgressTrack } from '@/components/ui/ProgressTrack';
import { GoalStage } from '@/components/wizard/stages/GoalStage';
import { HoursStage } from '@/components/wizard/stages/HoursStage';
import { InterestsStage } from '@/components/wizard/stages/InterestsStage';
import { PersonalityStage } from '@/components/wizard/stages/PersonalityStage';
import { SkillsStage } from '@/components/wizard/stages/SkillsStage';
import { StyleStage } from '@/components/wizard/stages/StyleStage';
import { isWizardStageValid } from '@/components/wizard/wizardOptions';
import { useApp } from '@/context/AppProvider';
import { AssessmentBankProvider, useAssessmentBank } from '@/context/AssessmentBankProvider';
import { useLanguage } from '@/context/LanguageProvider';
import { localeText } from '@/lib/localeText';
import { api, ApiError } from '@/lib/api';
import type { ExamAttemptSession, ExamResponse } from '@kia./shared';

type FlowPhase = 'board' | 'personality' | 'wizard' | 'exam';

interface UnifiedTestFlowProps {
  /** When true, starts at the timed exam (retake / gate entry). */
  readinessOnly?: boolean;
  /** Skip the board and jump into the personality → wizard → exam sequence. */
  skipBoard?: boolean;
  backHref?: string;
}

export function UnifiedTestFlow(props: UnifiedTestFlowProps) {
  return (
    <AssessmentBankProvider>
      <UnifiedTestFlowInner {...props} />
    </AssessmentBankProvider>
  );
}

function UnifiedTestFlowInner({
  readinessOnly = false,
  skipBoard = false,
}: UnifiedTestFlowProps) {
  const router = useRouter();
  const { t, locale } = useLanguage();
  const { questions: assessmentQuestions } = useAssessmentBank();
  const {
    answers,
    stageIndex,
    setAnswers,
    setStageIndex,
    completeWizard,
    roadmap,
    completeExam,
    resetReadinessTest,
  } = useApp();

  const initialPhase: FlowPhase = readinessOnly
    ? 'exam'
    : skipBoard
      ? 'personality'
      : 'board';

  const [phase, setPhase] = useState<FlowPhase>(initialPhase);
  const [transitioning, setTransitioning] = useState(false);
  const [session, setSession] = useState<ExamAttemptSession | null>(null);
  const [loadError, setLoadError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const wizardTotal = assessmentQuestions.length || WIZARD_STAGES.length;
  const isLastWizardStage = stageIndex >= wizardTotal - 1;

  const patchAnswers = useCallback(
    (partial: Partial<AssessmentAnswers>) => {
      setAnswers({ ...answers, ...partial });
    },
    [answers, setAnswers],
  );

  const wizardValid = useMemo(
    () =>
      isWizardStageValid(
        stageIndex,
        answers,
        assessmentQuestions[stageIndex]?.id,
      ),
    [stageIndex, answers, assessmentQuestions],
  );

  const bootExam = useCallback(async () => {
    setLoadError('');
    try {
      const next = await api.startExam(roadmap?.id);
      setSession(next);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : t('common.errorFallback'));
    }
  }, [roadmap?.id, t]);

  useEffect(() => {
    if (phase !== 'exam') return;
    if (session) return;
    void bootExam();
  }, [phase, session, bootExam]);

  const enterPersonality = () => {
    setLoadError('');
    setPhase('personality');
  };

  const enterWizardPhase = () => {
    setStageIndex(0);
    setPhase('wizard');
  };

  const enterExamPhase = useCallback(async () => {
    setTransitioning(true);
    await completeWizard();
    resetReadinessTest();
    setSession(null);
    setPhase('exam');
    setTransitioning(false);
  }, [completeWizard, resetReadinessTest]);

  const handlePersonalitySubmit = async (personalityAnswers: MiniIpipAnswers) => {
    setSubmitting(true);
    setLoadError('');
    try {
      await api.submitPersonality(personalityAnswers);
      setSubmitting(false);
      enterWizardPhase();
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : t('common.errorFallback'));
      setSubmitting(false);
    }
  };

  const handleWizardNext = () => {
    if (!isLastWizardStage) {
      setStageIndex(stageIndex + 1);
      return;
    }
    void enterExamPhase();
  };

  const handleSave = async (examAnswers: Record<string, ExamResponse>) => {
    if (!session) return;
    await api.saveExamAnswers(session.attemptId, examAnswers);
  };

  const handleSubmit = async (examAnswers: Record<string, ExamResponse>) => {
    if (!session || submitting) return;
    setSubmitting(true);
    try {
      const result: ExamSubmitResult = await api.submitExam(session.attemptId, examAnswers);
      await completeExam(result);
      router.replace(`/readiness/results?testId=${encodeURIComponent(result.attemptId)}`);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : t('common.errorFallback'));
      setSubmitting(false);
    }
  };

  const stageQuestion = assessmentQuestions[stageIndex];
  const stageKey = stageQuestion?.id ?? WIZARD_STAGES[stageIndex] ?? 'goal';
  const stageName = stageQuestion
    ? localeText(stageQuestion.stageLabel, locale)
    : t(`domain.wizardStages.${stageKey}`);

  const renderWizardStage = () => {
    const id = stageQuestion?.id ?? WIZARD_STAGES[stageIndex];
    if (id === 'skill' || stageIndex === 1) {
      return <SkillsStage answers={answers} onChange={patchAnswers} />;
    }
    if (id === 'personality' || stageIndex === 2) {
      return <PersonalityStage answers={answers} onChange={patchAnswers} />;
    }
    if (id === 'interest' || stageIndex === 3) {
      return <InterestsStage answers={answers} onChange={patchAnswers} />;
    }
    if (id === 'learningStyle' || stageIndex === 4) {
      return <StyleStage answers={answers} onChange={patchAnswers} />;
    }
    if (id === 'time' || stageIndex === 5) {
      return <HoursStage answers={answers} onChange={patchAnswers} />;
    }
    return <GoalStage answers={answers} onChange={patchAnswers} />;
  };

  return (
    <div className={`unified-test-flow${transitioning ? ' unified-test-flow--transition' : ''}`}>
      {phase === 'board' && !readinessOnly && (
        <div className="unified-test-panel">
          <TestBoard onStart={enterPersonality} />
        </div>
      )}

      {phase === 'personality' && !readinessOnly && (
        <div className="unified-test-panel">
          {loadError && <p className="form-error">{loadError}</p>}
          <PersonalityTestPlayer
            onSubmit={handlePersonalitySubmit}
            onBack={() => setPhase('board')}
            submitting={submitting}
          />
        </div>
      )}

      {phase === 'wizard' && !readinessOnly && (
        <>
          <ProgressTrack
            total={wizardTotal}
            current={stageIndex}
            doneClass="test-seg"
            segClass="test-progress"
          />
          <div className="unified-test-panel" key={`wizard-${stageIndex}`}>
            <div className="stage-label">
              {t('wizard.stageLabel', {
                current: stageIndex + 1,
                name: stageName,
              })}
            </div>

            {renderWizardStage()}

            <div className="wizard-nav">
              <button
                type="button"
                className="btn-ghost"
                onClick={() =>
                  stageIndex > 0
                    ? setStageIndex(stageIndex - 1)
                    : setPhase('personality')
                }
              >
                {t('wizard.backPlain')}
              </button>
              <button
                type="button"
                className="btn-next"
                onClick={handleWizardNext}
                disabled={!wizardValid || transitioning}
              >
                {transitioning
                  ? t('exam.starting')
                  : isLastWizardStage
                    ? t('exam.startCta')
                    : t('wizard.continue')}
              </button>
            </div>
          </div>
        </>
      )}

      {phase === 'exam' && (
        <div className="unified-test-panel unified-test-panel--exam">
          {loadError && <p className="form-error">{loadError}</p>}
          {!session && !loadError && <p className="sub">{t('exam.loading')}</p>}
          {session && (
            <ExamPlayer
              session={session}
              onSaveAnswers={handleSave}
              onSubmit={handleSubmit}
              submitting={submitting}
            />
          )}
          {!session && loadError && (
            <button type="button" className="btn-next" onClick={() => void bootExam()}>
              {t('exam.retry')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
