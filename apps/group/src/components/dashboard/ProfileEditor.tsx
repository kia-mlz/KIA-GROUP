'use client';

import type { ProfileDetails } from '@kia./shared';
import { Camera, CheckCircle2, Save, User } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ProvinceCityFields } from '@/components/auth/ProvinceCityFields';
import { useAuth } from '@/context/AuthProvider';
import { useLanguage } from '@/context/LanguageProvider';
import { api, ApiError } from '@/lib/api';
import { CardShell } from './CardShell';
import { useDashboardToast } from './ToastProvider';

type Draft = {
  firstName: string;
  lastName: string;
  province: string;
  city: string;
  email: string;
  bio: string;
};

export function ProfileEditor() {
  const { t } = useLanguage();
  const { refreshSession } = useAuth();
  const toast = useDashboardToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<ProfileDetails | null>(null);
  const [draft, setDraft] = useState<Draft>({
    firstName: '',
    lastName: '',
    province: '',
    city: '',
    email: '',
    bio: '',
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getProfile();
      setProfile(data);
      setDraft({
        firstName: data.firstName,
        lastName: data.lastName,
        province: data.province,
        city: data.city,
        email: data.email ?? '',
        bio: data.bio ?? '',
      });
      setPreviewUrl(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('panel.profile.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleSave = async () => {
    if (saving || !profile) return;
    setSaving(true);
    try {
      await api.updateProfile({
        firstName: draft.firstName.trim(),
        lastName: draft.lastName.trim(),
        province: draft.province.trim(),
        city: draft.city.trim(),
        email: draft.email.trim(),
        bio: draft.bio.trim(),
      });
      if (fileRef.current?.files?.[0]) {
        const updated = await api.uploadAvatar(fileRef.current.files[0]);
        setProfile(updated);
      } else {
        await load();
      }
      await refreshSession();
      setEditing(false);
      setSaved(true);
      toast.push(t('dashboard.profile.saved'), 'success');
      window.setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      toast.push(
        err instanceof ApiError ? err.message : t('panel.profile.saveError'),
        'error',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (!profile) return;
    setDraft({
      firstName: profile.firstName,
      lastName: profile.lastName,
      province: profile.province,
      city: profile.city,
      email: profile.email ?? '',
      bio: profile.bio,
    });
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileRef.current) fileRef.current.value = '';
    setEditing(false);
  };

  const avatarSrc = previewUrl || profile?.avatarUrl || null;
  const initials = `${draft.firstName?.[0] ?? ''}${draft.lastName?.[0] ?? ''}`.trim() || 'ک';

  return (
    <CardShell
      title={t('dashboard.profile.title')}
      icon={User}
      span="full"
      isLoading={loading}
      error={error}
      onRetry={load}
      cta={
        editing ? undefined : (
          <button type="button" className="dash-btn-ghost" onClick={() => setEditing(true)}>
            {t('dashboard.profile.edit')}
          </button>
        )
      }
    >
      <div className="dash-profile-grid">
        <div className="dash-profile-avatar-col">
          <div className="dash-profile-avatar">
            {avatarSrc ? (
              <img src={avatarSrc} alt="" />
            ) : (
              <span>{initials}</span>
            )}
            {editing ? (
              <button
                type="button"
                className="dash-avatar-cam"
                aria-label={t('dashboard.profile.changePhoto')}
                onClick={() => fileRef.current?.click()}
              >
                <Camera size={11} color="#fff" aria-hidden="true" />
              </button>
            ) : null}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (previewUrl) URL.revokeObjectURL(previewUrl);
              setPreviewUrl(URL.createObjectURL(file));
            }}
          />
          <div className="dash-profile-name">
            {draft.firstName} {draft.lastName}
          </div>
          <div className="dash-muted">{t('dashboard.profile.role')}</div>
        </div>

        <div className="dash-profile-fields">
          {(
            [
              ['firstName', t('education.profile.firstName'), 'text'],
              ['lastName', t('education.profile.lastName'), 'text'],
              ['phone', t('panel.profile.phone'), 'tel'],
            ] as const
          ).map(([key, label, type]) => (
            <label key={key}>
              <span>{label}</span>
              <input
                type={type}
                value={
                  key === 'phone'
                    ? profile?.phone ?? ''
                    : draft[key as keyof Draft]
                }
                readOnly={key === 'phone' || !editing}
                disabled={key === 'phone'}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, [key]: e.target.value }) as Draft)
                }
              />
            </label>
          ))}
          {editing ? (
            <ProvinceCityFields
              province={draft.province}
              city={draft.city}
              onProvinceChange={(province) => setDraft((p) => ({ ...p, province }))}
              onCityChange={(city) => setDraft((p) => ({ ...p, city }))}
              provinceLabel={t('education.profile.province')}
              cityLabel={t('education.profile.city')}
              provincePlaceholder={t('education.profile.provincePlaceholder')}
              cityPlaceholder={t('education.profile.cityPlaceholder')}
            />
          ) : (
            <>
              <label>
                <span>{t('education.profile.province')}</span>
                <input type="text" value={draft.province} readOnly />
              </label>
              <label>
                <span>{t('education.profile.city')}</span>
                <input type="text" value={draft.city} readOnly />
              </label>
            </>
          )}
          <label>
            <span>{t('education.profile.email')}</span>
            <input
              type="email"
              value={draft.email}
              readOnly={!editing}
              onChange={(e) => setDraft((p) => ({ ...p, email: e.target.value }))}
              dir="ltr"
            />
          </label>
          <label className="dash-profile-bio">
            <span>{t('dashboard.profile.bio')}</span>
            <textarea
              rows={2}
              value={draft.bio}
              readOnly={!editing}
              onChange={(e) => setDraft((p) => ({ ...p, bio: e.target.value }))}
            />
          </label>
          {editing ? (
            <div className="dash-modal__actions">
              <button
                type="button"
                className="dash-btn-primary"
                disabled={saving}
                onClick={() => void handleSave()}
              >
                <Save size={13} aria-hidden="true" />
                {saving ? t('common.saving') : t('dashboard.profile.save')}
              </button>
              <button type="button" className="dash-btn-ghost" onClick={handleCancel}>
                {t('dashboard.profile.cancel')}
              </button>
            </div>
          ) : null}
          {saved ? (
            <div className="dash-saved">
              <CheckCircle2 size={14} aria-hidden="true" />
              {t('dashboard.profile.saved')}
            </div>
          ) : null}
        </div>
      </div>
    </CardShell>
  );
}
