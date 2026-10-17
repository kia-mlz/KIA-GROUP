'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useEffect, useState } from 'react';
import {
  containsUnsafeText,
  isValidEmail,
  isValidIranCity,
  isValidIranProvince,
  normalizeIranianPhone,
  sanitizeProfileText,
} from '@kia./shared';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { ProvinceCityFields } from '@/components/auth/ProvinceCityFields';
import { BrandMark } from '@/components/brand/BrandMark';
import { useAuth } from '@/context/AuthProvider';
import { useLanguage } from '@/context/LanguageProvider';
import { api, ApiError } from '@/lib/api';
import { HOME_PATH, resolveInternalNext } from '@/lib/postLoginPath';

type Step = 'phone' | 'otp' | 'profile' | 'redirect';

export default function EducationPage() {
  return (
    <div className="page-content education-page">
      <Suspense fallback={<div className="container auth-shell auth-loading" />}>
        <EducationFlow />
      </Suspense>
    </div>
  );
}

function EducationFlow() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next');
  const { t } = useLanguage();
  const { user, learnerState, refreshSession, loading: authLoading } = useAuth();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | undefined>();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  /** OTP verified in this browser session — allows profile step without re-skipping phone on mount. */
  const [otpVerified, setOtpVerified] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (user?.profileComplete || learnerState?.profileComplete) {
      // Registration is done, so this page has nothing left to ask for: send the
      // learner onward (their deep link when a gate sent them here, otherwise the
      // departments page) instead of parking them on a confirmation screen.
      // A `next` pointing at this very page (RequireAuth re-entry) is not a
      // destination — forwarding to it would only re-enter this flow.
      const dest = resolveInternalNext(nextPath);
      const target = dest === pathname ? HOME_PATH : dest;
      setStep('redirect');
      router.replace(target);
      return;
    }
    if (!otpVerified) {
      setStep('phone');
    }
  }, [authLoading, user, learnerState, otpVerified, nextPath, pathname, router]);

  const clearErrors = () => {
    setErrors({});
    setFormError('');
  };

  const onRequestOtp = async (event: FormEvent) => {
    event.preventDefault();
    clearErrors();
    const normalized = normalizeIranianPhone(phone);
    if (!normalized) {
      setErrors({ phone: t('education.phone.invalid') });
      return;
    }
    setBusy(true);
    try {
      const res = await api.requestOtp({ phone: normalized });
      setPhone(res.phone);
      setDevCode(res.devCode);
      setStep('otp');
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : t('common.errorFallback'));
    } finally {
      setBusy(false);
    }
  };

  const onVerifyOtp = async (event: FormEvent) => {
    event.preventDefault();
    clearErrors();
    if (!/^\d{6}$/.test(code.trim())) {
      setErrors({ code: t('education.otp.invalid') });
      return;
    }
    setBusy(true);
    try {
      const res = await api.verifyOtp({ phone, code: code.trim() });
      await refreshSession();
      setOtpVerified(true);
      // A phone that is already registered needs no profile step; the effect
      // above forwards the learner as soon as the session says so.
      if (!res.user.profileComplete) {
        setStep('profile');
      }
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : t('common.errorFallback'));
    } finally {
      setBusy(false);
    }
  };

  const onCompleteProfile = async (event: FormEvent) => {
    event.preventDefault();
    clearErrors();
    const nextErrors: Record<string, string> = {};
    const cleanFirst = sanitizeProfileText(firstName);
    const cleanLast = sanitizeProfileText(lastName);
    const cleanProvince = sanitizeProfileText(province);
    const cleanCity = sanitizeProfileText(city);
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanFirst) nextErrors.firstName = t('education.profile.required');
    else if (containsUnsafeText(cleanFirst)) nextErrors.firstName = t('education.profile.unsafe');

    if (!cleanLast) nextErrors.lastName = t('education.profile.required');
    else if (containsUnsafeText(cleanLast)) nextErrors.lastName = t('education.profile.unsafe');

    if (!isValidIranProvince(cleanProvince)) nextErrors.province = t('education.profile.provinceRequired');
    if (!isValidIranCity(cleanProvince, cleanCity)) nextErrors.city = t('education.profile.cityRequired');

    if (!cleanEmail) nextErrors.email = t('education.profile.required');
    else if (!isValidEmail(cleanEmail) || containsUnsafeText(cleanEmail)) {
      nextErrors.email = t('education.profile.emailInvalid');
    }

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setBusy(true);
    try {
      await api.completeProfile({
        firstName: cleanFirst,
        lastName: cleanLast,
        province: cleanProvince,
        city: cleanCity,
        email: cleanEmail,
      });
      // Single navigation owner: the effect forwards the learner once the
      // refreshed session reports a complete profile.
      await refreshSession();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : t('common.errorFallback'));
    } finally {
      setBusy(false);
    }
  };

  if (authLoading || step === 'redirect') {
    return (
      <div className="container auth-shell">
        <div className="auth-card education-card">
          <p className="auth-loading-inline">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (step === 'profile') {
    return (
      <RequireAuth nextPath="/education">
        <div className="container auth-shell">
          <div className="auth-card education-card">
            <span className="auth-step-badge">{t('education.stepBadge', { current: 3, total: 3 })}</span>
            <h1>{t('education.profile.title')}</h1>
            <p className="auth-sub">{t('education.profile.sub')}</p>
            <form className="auth-form" onSubmit={onCompleteProfile} noValidate>
              <label className="form-field">
                <span>{t('education.profile.phone')}</span>
                <input
                  type="tel"
                  value={phone || user?.phone || ''}
                  disabled
                  dir="ltr"
                  className="ltr-isolate"
                />
              </label>
              <label className="form-field">
                <span>{t('education.profile.firstName')}</span>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                />
                {errors.firstName && <span className="form-error">{errors.firstName}</span>}
              </label>
              <label className="form-field">
                <span>{t('education.profile.lastName')}</span>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                />
                {errors.lastName && <span className="form-error">{errors.lastName}</span>}
              </label>
              <ProvinceCityFields
                province={province}
                city={city}
                onProvinceChange={setProvince}
                onCityChange={setCity}
                provinceLabel={t('education.profile.province')}
                cityLabel={t('education.profile.city')}
                provincePlaceholder={t('education.profile.provincePlaceholder')}
                cityPlaceholder={t('education.profile.cityPlaceholder')}
                provinceError={errors.province}
                cityError={errors.city}
              />
              <label className="form-field">
                <span>{t('education.profile.email')}</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  dir="ltr"
                  className="ltr-isolate"
                />
                {errors.email && <span className="form-error">{errors.email}</span>}
              </label>
              {formError && <p className="form-error">{formError}</p>}
              <button type="submit" className="cta-primary auth-submit" disabled={busy}>
                {busy ? t('education.profile.submitting') : t('education.profile.submit')}
              </button>
            </form>
          </div>
        </div>
      </RequireAuth>
    );
  }

  if (step === 'otp') {
    return (
      <div className="container auth-shell">
        <div className="auth-card education-card">
          <span className="auth-step-badge">{t('education.stepBadge', { current: 2, total: 3 })}</span>
          <h1>{t('education.otp.title')}</h1>
          <p className="auth-sub">{t('education.otp.sub', { phone })}</p>
          {devCode && (
            <p className="form-hint">{t('education.otp.devHint', { code: devCode })}</p>
          )}
          <form className="auth-form" onSubmit={onVerifyOtp} noValidate>
            <label className="form-field">
              <span>{t('education.otp.label')}</span>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder={t('education.otp.placeholder')}
                dir="ltr"
                className="ltr-isolate otp-input"
              />
              {errors.code && <span className="form-error">{errors.code}</span>}
            </label>
            {formError && <p className="form-error">{formError}</p>}
            <button type="submit" className="cta-primary auth-submit" disabled={busy}>
              {busy ? t('education.otp.submitting') : t('education.otp.submit')}
            </button>
          </form>
          <div className="auth-footer-row">
            <button
              type="button"
              className="text-btn"
              onClick={() => {
                setStep('phone');
                setCode('');
                setDevCode(undefined);
                setOtpVerified(false);
              }}
            >
              {t('education.otp.changePhone')}
            </button>
            <button
              type="button"
              className="text-btn"
              disabled={busy}
              onClick={async () => {
                clearErrors();
                setBusy(true);
                try {
                  const res = await api.requestOtp({ phone });
                  setDevCode(res.devCode);
                } catch (err) {
                  setFormError(err instanceof ApiError ? err.message : t('common.errorFallback'));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t('education.otp.resend')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container auth-shell">
      <div className="auth-card education-card">
        <Link href="/" className="education-brand">
          <BrandMark className="education-brand-mark" size={28} title="" />
          {t('common.brand')}
        </Link>
        <span className="auth-step-badge">{t('education.stepBadge', { current: 1, total: 3 })}</span>
        <h1>{t('education.phone.title')}</h1>
        <p className="auth-sub">{t('education.phone.sub')}</p>
        <form className="auth-form" onSubmit={onRequestOtp} noValidate>
          <label className="form-field">
            <span>{t('education.phone.label')}</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t('education.phone.placeholder')}
              autoComplete="tel"
              dir="ltr"
              className="ltr-isolate"
            />
            {errors.phone && <span className="form-error">{errors.phone}</span>}
          </label>
          {formError && <p className="form-error">{formError}</p>}
          <button type="submit" className="cta-primary auth-submit" disabled={busy}>
            {busy ? t('education.phone.submitting') : t('education.phone.submit')}
          </button>
        </form>
      </div>
    </div>
  );
}
