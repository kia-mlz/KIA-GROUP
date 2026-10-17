'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { AssessmentAnswers, ExamSubmitResult, ReadinessResult } from '@kia./shared';
import {
  defaultAnswers,
  defaultCourses,
  type ModalState,
  type PersistedAppState,
} from '@/lib/storage';
import { useAuth } from '@/context/AuthProvider';
import { usePersistedAppState } from '@/context/hooks/usePersistedAppState';
import { useAppActions, useModalState } from '@/context/hooks/useAppActions';

interface AppContextValue extends PersistedAppState {
  hydrated: boolean;
  modal: ModalState | null;
  readinessResult: ReadinessResult | null;
  examResult: ExamSubmitResult | null;
  setAnswers: (answers: AssessmentAnswers) => void;
  setStageIndex: (index: number) => void;
  setReadinessModuleIndex: (index: number) => void;
  updateReadinessScore: (module: string, correct: number, total: number) => void;
  completeWizard: () => Promise<void>;
  enrollBundle: (onEnrolled?: () => void) => Promise<void>;
  completeReadinessTest: () => Promise<ReadinessResult>;
  completeExam: (result: ExamSubmitResult) => Promise<ExamSubmitResult>;
  submitChallenge: (code: string) => Promise<void>;
  openModal: (modal: ModalState) => void;
  closeModal: () => void;
  resetReadinessTest: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { learnerState, refreshSession, isAuthenticated } = useAuth();
  const { state, setState, patch, hydrated } = usePersistedAppState(learnerState);
  const { modal, setModal, openModal, closeModal } = useModalState();
  const [readinessResult, setReadinessResult] = useState<ReadinessResult | null>(null);
  const [examResult, setExamResult] = useState<ExamSubmitResult | null>(null);

  const actions = useAppActions({
    state,
    setState,
    patch,
    isAuthenticated,
    learnerState,
    refreshSession,
    setModal,
    setReadinessResult,
    setExamResult,
  });

  const value = useMemo<AppContextValue>(
    () => ({
      ...state,
      hydrated,
      modal,
      readinessResult,
      examResult,
      openModal,
      closeModal,
      ...actions,
    }),
    [state, hydrated, modal, readinessResult, examResult, openModal, closeModal, actions],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export { defaultAnswers, defaultCourses };
