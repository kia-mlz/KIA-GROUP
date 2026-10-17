'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogIn, ShieldCheck } from 'lucide-react';
import { FormEvent, Suspense, useEffect, useState } from 'react';
import { BrandMark } from '@/components/brand/BrandMark';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { useAuth } from '@/context/AuthProvider';
import { useLanguage } from '@/context/LanguageProvider';
import { resolvePostLoginPath } from '@/lib/postLoginPath';
import { isStaffRole } from '@kia./shared';
import type { TwoFactorChallengeResponse } from '@kia./shared';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, logout, user, loading, isAuthenticated, verifyTwoFactorLogin } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [twoFactor, setTwoFactor] = useState<TwoFactorChallengeResponse | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorSubmitting, setTwoFactorSubmitting] = useState(false);

  // No `?next` means a plain sign-in: the learner lands on the departments
  // page. Only an explicit deep link (a gate that sent them here) overrides it.
  const next = searchParams.get('next');
  const nextNeedsAdmin = next?.startsWith('/admin') ?? false;

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated || !user?.profileComplete) return;

    const isStaff = isStaffRole(user.role);
    // /admin gate: keep the login form so a learner session can be replaced by admin creds.
    if (nextNeedsAdmin && !isStaff) {
      void logout({ keepPage: true });
      return;
    }

    router.replace(resolvePostLoginPath(user.role, next));
  }, [loading, isAuthenticated, user, next, nextNeedsAdmin, router, logout]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const result = await login({ email, password });
      if ('twoFactorRequired' in result) {
        // Staff account with TOTP enabled — show the second-factor step.
        setTwoFactor(result);
        return;
      }
      const dest = resolvePostLoginPath(result.role, next);
      router.push(dest);
    } catch {
      setError(t('auth.login.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleTwoFactorSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (twoFactorSubmitting || !twoFactor) return;
    setError('');
    setTwoFactorSubmitting(true);
    try {
      const loggedIn = await verifyTwoFactorLogin(twoFactor.challenge, twoFactorCode.trim());
      const dest = resolvePostLoginPath(loggedIn.role, next);
      router.push(dest);
    } catch {
      setError(t('auth.login.twoFactorError'));
    } finally {
      setTwoFactorSubmitting(false);
    }
  };

  if (twoFactor) {
    return (
      <div className="page-content">
        <div className="container auth-shell">
          <div className="auth-card">
            <Link href="/" className="education-brand" aria-label={t('common.brand')}>
              <BrandMark className="education-brand-mark" size={28} title="" />
              {t('common.brand')}
            </Link>
            <span className="eyebrow">
              <ShieldCheck size={14} className="inline-leading-icon" />
              {t('auth.login.twoFactorEyebrow')}
            </span>
            <h1>{t('auth.login.twoFactorTitle')}</h1>
            <p className="auth-sub">{t('auth.login.twoFactorSub')}</p>
            <form className="auth-form" onSubmit={handleTwoFactorSubmit}>
              <label className="form-field">
                <span>{t('auth.login.twoFactorCodeLabel')}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  required
                  minLength={6}
                  maxLength={16}
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  placeholder="123456"
                  dir="ltr"
                  className="ltr-isolate"
                />
              </label>
              {error && <p className="form-error">{error}</p>}
              <button type="submit" className="cta-primary auth-submit" disabled={twoFactorSubmitting}>
                {twoFactorSubmitting
                  ? t('auth.login.submitting')
                  : t('auth.login.twoFactorSubmit')}
              </button>
            </form>
            <p className="auth-footer">{t('auth.login.twoFactorRecoveryHint')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="container auth-shell">
        <div className="auth-card">
          <Link href="/" className="education-brand" aria-label={t('common.brand')}>
            <BrandMark className="education-brand-mark" size={28} title="" />
            {t('common.brand')}
          </Link>
          <span className="eyebrow">
            <LogIn size={14} className="inline-leading-icon" />
            {t('auth.login.eyebrow')}
          </span>
          <h1>{t('auth.login.title')}</h1>
          <p className="auth-sub">{t('auth.login.sub')}</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="form-field">
              <span>{t('auth.login.email')}</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.login.emailPlaceholder')}
                dir="ltr"
                className="ltr-isolate"
              />
            </label>
            <PasswordInput
              label={t('auth.login.password')}
              autoComplete="current-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.login.passwordPlaceholder')}
              showLabel={t('auth.password.show')}
              hideLabel={t('auth.password.hide')}
            />
            {error && <p className="form-error">{error}</p>}
            <button type="submit" className="cta-primary auth-submit" disabled={submitting}>
              {submitting ? t('auth.login.submitting') : t('auth.login.submit')}
            </button>
          </form>

          <p className="auth-footer">
            <Link href="/forgot-password">{t('auth.forgotPassword.eyebrow')}</Link>
            {' · '}
            {t('auth.login.footer')} <Link href="/education">{t('auth.login.createAccount')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { t } = useLanguage();

  return (
    <Suspense fallback={<div className="page-content auth-loading">{t('common.loading')}</div>}>
      <LoginForm />
    </Suspense>
  );
}
