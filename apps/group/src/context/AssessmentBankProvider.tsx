'use client';

import {
  DEFAULT_ASSESSMENT_BANK,
  type AssessmentBank,
  type AssessmentQuestion,
} from '@kia./shared';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api } from '@/lib/api';

interface AssessmentBankContextValue {
  bank: AssessmentBank;
  questions: AssessmentQuestion[];
  loading: boolean;
}

const AssessmentBankContext = createContext<AssessmentBankContextValue>({
  bank: DEFAULT_ASSESSMENT_BANK,
  questions: DEFAULT_ASSESSMENT_BANK.questions,
  loading: false,
});

export function AssessmentBankProvider({ children }: { children: ReactNode }) {
  const [bank, setBank] = useState<AssessmentBank>(DEFAULT_ASSESSMENT_BANK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void api
      .getAssessmentBank()
      .then((next) => {
        if (!cancelled && next?.questions?.length) setBank(next);
      })
      .catch(() => {
        /* keep defaults */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => {
    const questions = [...bank.questions].sort((a, b) => a.order - b.order);
    return { bank, questions, loading };
  }, [bank, loading]);

  return (
    <AssessmentBankContext.Provider value={value}>{children}</AssessmentBankContext.Provider>
  );
}

export function useAssessmentBank() {
  return useContext(AssessmentBankContext);
}

export function useAssessmentQuestion(id: string): AssessmentQuestion | undefined {
  const { questions } = useAssessmentBank();
  return questions.find((q) => q.id === id);
}
