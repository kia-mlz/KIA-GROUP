'use client';

import type { ProfileDetails } from '@kia./shared';
import { Loader2, LockKeyhole, UserRound } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { ProvinceCityFields } from '@/components/auth/ProvinceCityFields';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { DashboardGate, PanelPage } from '@/components/dashboard/DashboardShell';
import { useAuth } from '@/context/AuthProvider';
import { useLanguage } from '@/context/LanguageProvider';
import { api, ApiError } from '@/lib/api';

export default function ProfilePage() {
  const { t } = useLanguage();
  const { refreshSession } = useAuth();
  const [profile, setProfile] = useState<ProfileDetails | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  useEffect(() => {
    let cancelled = false;
    api
      .getProfile()
      .then((data) => {
        if (cancelled) return;
        setProfile(data);
        setFirstName(data.firstName);
        setLastName(data.lastName);
        setProvince(data.province);
        setCity(data.city);
        setEmail(data.email ?? '');
        setBio(data.bio ?? '');
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : t('panel.profile.loadError'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        province: province.trim(),
        city: city.trim(),
        email: email.trim(),
        bio: bio.trim(),
      });
      await refreshSession();
      setSuccess(t('panel.profile.saved'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('panel.profile.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (changingPassword) return;
    setPasswordError('');
    setPasswordSuccess('');
    if (newPassword !== newPasswordConfirm) {
      setPasswordError(t('auth.changePassword.mismatch'));
      return;
    }
    setChangingPassword(true);
    try {
      await api.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordConfirm('');
      setPasswordSuccess(t('auth.changePassword.saved'));
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.message : t('auth.changePassword.error'));
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <DashboardGate nextPath="/dashboard/profile">
      <PanelPage
        eyebrow={
          <>
            <UserRound size={14} className="inline-leading-icon" />
            {t('panel.nav.profile')}
          </>
        }
        title={t('panel.profile.title')}
        sub={t('panel.profile.sub')}
      >
        {loading ? (
          <p className="auth-loading">
            <Loader2 size={18} className="spin" /> {t('common.loading')}
          </p>
        ) : null}
        {!loading ? (
          <form className="auth-form" onSubmit={handleSubmit}>
            {profile?.phone ? (
              <label className="field">
                <span>{t('panel.profile.phone')}</span>
                <input className="input" value={profile.phone} disabled />
              </label>
            ) : null}
            <label className="field">
              <span>{t('education.profile.firstName')}</span>
              <input
                className="input"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                minLength={2}
              />
            </label>
            <label className="field">
              <span>{t('education.profile.lastName')}</span>
              <input
                className="input"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                minLength={2}
              />
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
            />
            <label className="field">
              <span>{t('education.profile.email')}</span>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>{t('dashboard.profile.bio')}</span>
              <textarea
                className="input"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                maxLength={500}
              />
            </label>
            {error ? <p className="form-error">{error}</p> : null}
            {success ? <p className="form-success">{success}</p> : null}
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </form>
        ) : null}

        {!loading ? (
          <form className="auth-form dashboard-password-form" onSubmit={handlePasswordSubmit}>
            <h2 className="section-title">
              <LockKeyhole size={16} className="inline-leading-icon" />
              {t('auth.changePassword.title')}
            </h2>
            <p className="auth-sub">{t('auth.changePassword.sub')}</p>
            <PasswordInput
              label={t('auth.changePassword.current')}
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              showLabel={t('auth.password.show')}
              hideLabel={t('auth.password.hide')}
            />
            <PasswordInput
              label={t('auth.changePassword.new')}
              autoComplete="new-password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              showLabel={t('auth.password.show')}
              hideLabel={t('auth.password.hide')}
            />
            <PasswordInput
              label={t('auth.changePassword.confirm')}
              autoComplete="new-password"
              required
              minLength={8}
              value={newPasswordConfirm}
              onChange={(e) => setNewPasswordConfirm(e.target.value)}
              showLabel={t('auth.password.show')}
              hideLabel={t('auth.password.hide')}
            />
            {passwordError ? <p className="form-error">{passwordError}</p> : null}
            {passwordSuccess ? <p className="form-success">{passwordSuccess}</p> : null}
            <button type="submit" className="btn btn--primary" disabled={changingPassword}>
              {changingPassword ? t('auth.changePassword.submitting') : t('auth.changePassword.submit')}
            </button>
          </form>
        ) : null}
      </PanelPage>
    </DashboardGate>
  );
}
