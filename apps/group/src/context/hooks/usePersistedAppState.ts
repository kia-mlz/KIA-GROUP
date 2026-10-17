'use client';

import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react';
import { getDefaultState, loadAppState, saveAppState, type PersistedAppState } from '@/lib/storage';
import type { LearnerState } from '@kia./shared';

export function usePersistedAppState(learnerState: LearnerState | null) {
  const [state, setState] = useState<PersistedAppState>(getDefaultState);
  const [hydrated, setHydrated] = useState(false);
  const dirtyRef = useRef(false);

  useEffect(() => {
    // Avoid clobbering in-flight user edits if hydrate runs after interaction.
    if (!dirtyRef.current) {
      setState(loadAppState());
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveAppState(state);
  }, [state, hydrated]);

  useEffect(() => {
    if (!learnerState) return;
    setState((prev) => ({
      ...prev,
      hasRoadmap: learnerState.hasRoadmap,
      testCompleted: learnerState.testCompleted,
    }));
  }, [learnerState]);

  const patch = useCallback((partial: Partial<PersistedAppState>) => {
    dirtyRef.current = true;
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

  const setStateTracked = useCallback((update: SetStateAction<PersistedAppState>) => {
    dirtyRef.current = true;
    setState(update);
  }, []);

  return { state, setState: setStateTracked, patch, hydrated };
}
