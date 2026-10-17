'use client';

import type {
  AuthUser,
  LearnerState,
  LoginDto,
  TwoFactorChallengeResponse,
} from '@kia./shared';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, ApiError } from '@/lib/api';
import { clearTokens, getAccessToken } from '@/lib/auth';
import { ensureDemoSession } from '@/lib/demoApi';
import { isDemoMode } from '@/lib/demoMode';

interface AuthContextValue {
  user: AuthUser | null;
  learnerState: LearnerState | null;
  loading: boolean;
  isAuthenticated: boolean;
  /**
   * True from `logout()` until the next successful sign-in. Auth gates must not
   * redirect while it is set: a deliberate sign-out already owns the navigation
   * (to the landing page), and a gate racing it would drop the user on the login
   * or phone-OTP screen instead.
   */
  signedOut: boolean;
  /** Resolves with the signed-in user, or a 2FA challenge the caller must complete. */
  login: (dto: LoginDto) => Promise<AuthUser | TwoFactorChallengeResponse>;
  /** Complete the 2FA second step (AUTH-5) and hydrate the session. */
  verifyTwoFactorLogin: (challenge: string, code: string) => Promise<AuthUser>;
  /**
   * Ends the session. `keepPage` is for the login screen swapping a learner
   * session for staff credentials: it must not hand navigation to the sign-out
   * path, which lands on the landing page.
   */
  logout: (options?: { keepPage?: boolean }) => Promise<void>;
  /** Ends the sign-out transition once the landing page is on screen. */
  finishSignOut: () => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [learnerState, setLearnerState] = useState<LearnerState | null>(null);
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);

  const applyLearnerState = useCallback((state: LearnerState) => {
    setUser(state.user);
    setLearnerState(state);
    setSignedOut(false);
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    setLearnerState(null);
    clearTokens();
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      if (isDemoMode()) {
        ensureDemoSession();
      } else if (!getAccessToken()) {
        await api.refresh();
      }
      const state = await api.me();
      applyLearnerState(state);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearSession();
        return;
      }
      throw err;
    }
  }, [applyLearnerState, clearSession]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (isDemoMode()) {
          ensureDemoSession();
        }
        await refreshSession();
      } catch {
        if (!cancelled) clearSession();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshSession, clearSession]);

  const login = useCallback(
    async (dto: LoginDto): Promise<AuthUser | TwoFactorChallengeResponse> => {
      const res = await api.login(dto);
      if ('twoFactorRequired' in res) {
        // No session yet — the login form must collect the second factor.
        return res;
      }
      setUser(res.user);
      const state = await api.me();
      applyLearnerState(state);
      return state.user;
    },
    [applyLearnerState],
  );

  /** Complete the 2FA second step and hydrate the session. */
  const verifyTwoFactorLogin = useCallback(
    async (challenge: string, code: string): Promise<AuthUser> => {
      const res = await api.verifyTwoFactor({ challenge, code });
      setUser(res.user);
      const state = await api.me();
      applyLearnerState(state);
      return state.user;
    },
    [applyLearnerState],
  );

  const logout = useCallback(async (options?: { keepPage?: boolean }) => {
    // Set before the session clears so the gates' effects and the current page
    // unmount in the same render batch and stand down.
    if (!options?.keepPage) setSignedOut(true);
    try {
      await api.logout();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const finishSignOut = useCallback(() => setSignedOut(false), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      learnerState,
      loading,
      isAuthenticated: !!user,
      signedOut,
      login,
      verifyTwoFactorLogin,
      logout,
      finishSignOut,
      refreshSession,
    }),
    [user, learnerState, loading, signedOut, login, verifyTwoFactorLogin, logout, refreshSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
