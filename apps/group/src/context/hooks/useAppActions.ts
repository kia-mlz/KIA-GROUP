'use client';

import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import {
  buildChallengeResult,
  buildRoadmapFromAnswers,
  computeReadinessResult,
  hasRoadmapEntitlement,
  type AssessmentAnswers,
  type ExamSubmitResult,
  type LearnerState,
  type ReadinessResult,
  type RoadmapResponse,
} from '@kia./shared';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { CourseItem, ModalState, PersistedAppState } from '@/lib/storage';
import { useLanguage } from '@/context/LanguageProvider';
import { trackMessageKey } from '@/i18n/domain';

interface UseAppActionsArgs {
  state: PersistedAppState;
  setState: Dispatch<SetStateAction<PersistedAppState>>;
  patch: (partial: Partial<PersistedAppState>) => void;
  isAuthenticated: boolean;
  learnerState: LearnerState | null;
  refreshSession: () => Promise<void>;
  setModal: (modal: ModalState | null) => void;
  setReadinessResult: (result: ReadinessResult | null) => void;
  setExamResult: (result: ExamSubmitResult | null) => void;
}

export function useAppActions({
  state,
  setState,
  patch,
  isAuthenticated,
  learnerState,
  refreshSession,
  setModal,
  setReadinessResult,
  setExamResult,
}: UseAppActionsArgs) {
  const router = useRouter();
  const { t, format } = useLanguage();

  const setAnswers = useCallback((answers: AssessmentAnswers) => patch({ answers }), [patch]);

  const setStageIndex = useCallback((stageIndex: number) => patch({ stageIndex }), [patch]);

  const setReadinessModuleIndex = useCallback(
    (readinessModuleIndex: number) => patch({ readinessModuleIndex }),
    [patch],
  );

  const updateReadinessScore = useCallback(
    (module: string, correct: number, total: number) => {
      setState((prev) => ({
        ...prev,
        readinessScores: {
          ...prev.readinessScores,
          [module]: { correct, total },
        },
      }));
    },
    [setState],
  );

  const completeWizard = useCallback(async () => {
    const roadmap = buildRoadmapFromAnswers(state.answers);
    try {
      const remote = await api.saveRoadmap(state.answers);
      patch({ roadmap: remote, stageIndex: 0, hasRoadmap: true });
      await refreshSession();
    } catch {
      // Offline / unauthenticated: keep a local roadmap so the UX continues.
      patch({ roadmap, stageIndex: 0, hasRoadmap: true });
    }
  }, [state.answers, patch, refreshSession]);

  const enrollBundle = useCallback(
    async (onEnrolled?: () => void) => {
      if (!isAuthenticated) {
        router.push('/education?next=/roadmap');
        return;
      }

      const roadmapId = state.roadmap?.id;
      if (!learnerState?.roadmapEnrolled) {
        const hasBundle = hasRoadmapEntitlement(learnerState?.entitlements ?? [], roadmapId);
        if (!hasBundle) {
          if (!roadmapId) {
            setModal({
              icon: '⚠️',
              title: t('modal.roadmapNotReady.title'),
              body: t('modal.roadmapNotReady.body'),
            });
            return;
          }
          router.push(`/checkout?product=ROADMAP_BUNDLE&roadmapId=${roadmapId}`);
          return;
        }
      }

      const roadmap = state.roadmap ?? buildRoadmapFromAnswers(state.answers, true);
      try {
        if (state.roadmap?.id) {
          await api.enrollRoadmap(state.roadmap.id);
        }
      } catch {
        /* local fallback below */
      }

      const enrolled: RoadmapResponse = { ...roadmap, enrolled: true };
      patch({
        hasRoadmap: true,
        roadmap: enrolled,
        courses: [
          {
            id: 'roadmap',
            icon: '🌐',
            name: `${t(trackMessageKey(enrolled.trackKey))} ${t('roadmap.bundleSuffix')}`,
            status: t('courses.status.inProgress'),
          },
        ],
      });
      await refreshSession();
      setModal({
        icon: '🎉',
        title: t('modal.enrolled.title'),
        body: t('modal.enrolled.body'),
        onClose: onEnrolled,
      });
    },
    [
      state.roadmap,
      state.answers,
      patch,
      isAuthenticated,
      learnerState,
      router,
      refreshSession,
      setModal,
      t,
    ],
  );

  const completeReadinessTest = useCallback(async () => {
    const scores = state.readinessScores;
    let result = computeReadinessResult(scores);
    try {
      result = await api.saveReadinessTest(scores);
    } catch {
      // Keep local result so the learner still sees a scorecard offline.
    }
    setReadinessResult(result);
    patch({ testCompleted: true, readinessModuleIndex: 0, readinessScores: scores });
    try {
      await refreshSession();
    } catch {
      // Session refresh is best-effort; results UI must still open.
    }
    return result;
  }, [state.readinessScores, patch, refreshSession, setReadinessResult]);

  const completeExam = useCallback(
    async (result: ExamSubmitResult) => {
      setExamResult(result);
      setReadinessResult({
        percentages: result.percentages,
        average: result.average,
        passed: result.passed,
        verdict: {
          icon: result.verdict.icon,
          title: result.verdict.title.en,
          message: result.verdict.message.en,
          unlockTitle: result.verdict.unlockTitle.en,
          unlockSub: result.verdict.unlockSub.en,
          variant: result.verdict.variant,
        },
      });
      patch({
        testCompleted: true,
        readinessModuleIndex: 0,
        readinessScores: {},
        roadmap:
          result.outcome.roadmapId && state.roadmap
            ? {
                ...state.roadmap,
                id: result.outcome.roadmapId,
                modules: result.outcome.roadmapModules,
                level: result.outcome.levelAfter || state.roadmap.level,
              }
            : state.roadmap,
      });
      try {
        await refreshSession();
      } catch {
        // best-effort
      }
      return result;
    },
    [patch, refreshSession, setExamResult, setReadinessResult, state.roadmap],
  );

  const submitChallenge = useCallback(
    async (code: string) => {
      let result;
      try {
        result = await api.submitChallenge(code);
      } catch {
        result = buildChallengeResult(code);
      }

      if (result.unlockInterviewCourse) {
        setState((prev) => {
          const hasInterview = prev.courses.some((c) => c.id === 'interview');
          const courses: CourseItem[] = hasInterview
            ? prev.courses
            : [
                ...prev.courses,
                {
                  id: 'interview',
                  icon: '🎤',
                  name: t('courses.interview.name'),
                  status: t('courses.status.unlocked'),
                  isNew: true,
                },
              ];
          return { ...prev, interviewUnlocked: true, courses };
        });
      }

      const verdictKey = result.topScore ? 'best' : 'ok';
      setModal({
        icon: result.icon,
        title: t(`bootcamp.verdict.${verdictKey}.title`),
        body: t(`bootcamp.verdict.${verdictKey}.message`, {
          score: format.number(result.score),
        }),
        confetti: result.topScore,
      });
    },
    [setState, setModal, t, format],
  );

  const resetReadinessTest = useCallback(() => {
    patch({ readinessScores: {}, readinessModuleIndex: 0 });
    setReadinessResult(null);
    setExamResult(null);
  }, [patch, setReadinessResult, setExamResult]);

  return {
    setAnswers,
    setStageIndex,
    setReadinessModuleIndex,
    updateReadinessScore,
    completeWizard,
    enrollBundle,
    completeReadinessTest,
    completeExam,
    submitChallenge,
    resetReadinessTest,
  };
}

export function useModalState() {
  const [modal, setModal] = useState<ModalState | null>(null);
  const openModal = useCallback((m: ModalState) => setModal(m), []);
  const closeModal = useCallback(() => setModal(null), []);
  return { modal, setModal, openModal, closeModal };
}
