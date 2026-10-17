'use client';

import { Image as ImageIcon, ShieldCheck, ShieldOff } from 'lucide-react';
import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from 'react';
import { PanelPage } from '@/components/dashboard/DashboardShell';
import { useAuth } from '@/context/AuthProvider';
import { useLanguage } from '@/context/LanguageProvider';
import { api, ApiError } from '@/lib/api';
import {
  isStaffRole,
  type TwoFactorSetupResponse,
  type TwoFactorStaffRow,
  type TwoFactorStatusResponse,
} from '@kia./shared';

type Stage = 'idle' | 'enrolling' | 'recovery-shown';

export default function AdminSecurityPage() {
  const { t } = useLanguage();
  const { user, refreshSession } = useAuth();
  const [status, setStatus] = useState<TwoFactorStatusResponse | null>(null);
  const [staff, setStaff] = useState<TwoFactorStaffRow[]>([]);
  const [stage, setStage] = useState<Stage>('idle');
  const [setup, setSetup] = useState<TwoFactorSetupResponse | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const isStaff = isStaffRole(user?.role);

  const load = useCallback(async () => {
    try {
      setStatus(await api.twoFactorStatus());
      if (isStaffRole(user?.role)) {
        setStaff(await api.adminListStaffTwoFactor());
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('auth.changePassword.error'));
    }
  }, [t, user?.role]);

  useEffect(() => {
    void load();
  }, [load]);

  const startSetup = async () => {
    setBusy(true);
    setError('');
    try {
      setSetup(await api.twoFactorSetup());
      setStage('enrolling');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('auth.twoFactor.invalidCode'));
    } finally {
      setBusy(false);
    }
  };

  const confirmSetup = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || !code.trim()) {
      setError(t('auth.twoFactor.codeRequired'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await api.twoFactorConfirm(code.trim());
      setRecoveryCodes(result.recoveryCodes);
      setStage('recovery-shown');
      setCode('');
      await load();
      await refreshSession();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('auth.twoFactor.invalidCode'));
    } finally {
      setBusy(false);
    }
  };

  const disableSelf = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || !code.trim()) {
      setError(t('auth.twoFactor.codeRequired'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api.twoFactorDisable(code.trim());
      setNotice(t('auth.twoFactor.disabled'));
      setCode('');
      await load();
      await refreshSession();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('auth.twoFactor.invalidCode'));
    } finally {
      setBusy(false);
    }
  };

  const disableForUser = async (targetId: string, targetName: string) => {
    if (!window.confirm(t('auth.twoFactor.disableConfirm').replace('{name}', targetName))) return;
    setError('');
    try {
      await api.adminDisableStaffTwoFactor(targetId);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('auth.twoFactor.invalidCode'));
    }
  };

  return (
    <PanelPage
      eyebrow={
        <>
          <ShieldCheck size={14} className="inline-leading-icon" />
          {t('auth.twoFactor.eyebrow')}
        </>
      }
      title={t('auth.twoFactor.title')}
      sub={t('auth.twoFactor.sub')}
    >
      {error ? <p className="form-error">{error}</p> : null}
      {notice ? <p className="form-success">{notice}</p> : null}

      {isStaff ? (
        <section className="glass-panel dashboard-card">
          <div className="section-head">
            <h2>{t('auth.twoFactor.title')}</h2>
            <span className={`badge ${status?.enabled ? 'badge--success' : ''}`}>
              {status?.enabled ? t('auth.twoFactor.enabledBadge') : t('auth.twoFactor.disabledBadge')}
            </span>
          </div>

          {status?.enabled ? (
            <>
              <p>
                {t('auth.twoFactor.backupCodesRemaining').replace(
                  '{count}',
                  String(status.backupCodesRemaining),
                )}
              </p>
              <form className="auth-form" onSubmit={disableSelf}>
                <label className="form-field">
                  <span>{t('auth.twoFactor.disableCodeLabel')}</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={code}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setCode(e.target.value)}
                    required
                    dir="ltr"
                    className="ltr-isolate"
                  />
                </label>
                <p className="auth-sub">{t('auth.twoFactor.disableWarn')}</p>
                <button type="submit" className="btn btn--danger" disabled={busy}>
                  <ShieldOff size={16} /> {t('auth.twoFactor.disable')}
                </button>
              </form>
            </>
          ) : stage === 'idle' ? (
            <button type="button" className="btn btn--primary" onClick={startSetup} disabled={busy}>
              <ShieldCheck size={16} /> {t('auth.twoFactor.setupTitle')}
            </button>
          ) : stage === 'enrolling' && setup ? (
            <div className="twofa-setup">
              <p>{t('auth.twoFactor.setupStep1')}</p>
              {/* Data URL generated locally by the API via the qrcode package. */}
              <img
                src={setup.qrDataUrl}
                alt={t('auth.twoFactor.setupTitle')}
                width={240}
                height={240}
              />
              <label className="form-field">
                <span>{t('auth.twoFactor.secretLabel')}</span>
                <input readOnly value={setup.secret} dir="ltr" className="ltr-isolate" />
              </label>
              <form className="auth-form" onSubmit={confirmSetup}>
                <label className="form-field">
                  <span>{t('auth.twoFactor.confirmLabel')}</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setCode(e.target.value)}
                    required
                    minLength={6}
                    maxLength={16}
                    dir="ltr"
                    className="ltr-isolate"
                  />
                </label>
                <button type="submit" className="btn btn--primary" disabled={busy}>
                  {busy ? t('auth.twoFactor.confirming') : t('auth.twoFactor.confirm')}
                </button>
              </form>
            </div>
          ) : stage === 'recovery-shown' ? (
            <div className="twofa-recovery" role="alert">
              <h3>{t('auth.twoFactor.recoveryCodesTitle')}</h3>
              <p>{t('auth.twoFactor.recoveryCodesWarn')}</p>
              <pre className="twofa-codes">{recoveryCodes.join('\n')}</pre>
              <button
                type="button"
                className="btn"
                onClick={() => navigator.clipboard?.writeText(recoveryCodes.join('\n'))}
              >
                {t('auth.twoFactor.copyAll')}
              </button>
              <button type="button" className="btn btn--primary" onClick={() => setStage('idle')}>
                {t('auth.twoFactor.done')}
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      {user?.role === 'SUPER_ADMIN' && staff.length > 0 ? (
        <section className="glass-panel dashboard-card">
          <div className="section-head">
            <h2>
              <ImageIcon size={16} className="inline-leading-icon" />
              {t('auth.twoFactor.staffTitle')}
            </h2>
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('panel.profile.title')}</th>
                <th>2FA</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {staff.map((row) => (
                <tr key={row.id}>
                  <td>
                    {row.name || row.email || row.id}
                    <span className="muted"> · {row.role}</span>
                  </td>
                  <td>
                    {row.twoFactorEnabled ? (
                      <span className="badge badge--success">{t('auth.twoFactor.enabledBadge')}</span>
                    ) : (
                      <span className="badge">{t('auth.twoFactor.disabledBadge')}</span>
                    )}
                  </td>
                  <td>
                    {row.twoFactorEnabled && row.id !== user.id ? (
                      <button
                        type="button"
                        className="btn btn--danger btn--sm"
                        onClick={() => disableForUser(row.id, row.name || row.email || row.id)}
                      >
                        {t('auth.twoFactor.disable')}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </PanelPage>
  );
}
