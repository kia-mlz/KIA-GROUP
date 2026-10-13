'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import {
  createDefaultSiteSettings,
  normalizeAdminAccess,
  normalizeEnamadSettings,
  normalizePaymentSettings,
  normalizeSmsSettings,
  type SiteSettings,
  type SiteTrackSettings,
} from '@kia-group/shared';
import { useAuth } from '@/context/AuthProvider';
import { useLanguage } from '@/context/LanguageProvider';
import { api, ApiError } from '@/lib/api';
import type { AdminCourse } from '@kia-group/shared';
import { AdminAccessMatrix } from '@/components/admin/AdminAccessMatrix';

type Section =
  | 'general'
  | 'pricing'
  | 'payment'
  | 'sms'
  | 'enamad'
  | 'tracks'
  | 'readiness'
  | 'bootcamp'
  | 'courses'
  | 'adminAccess'
  | 'backup';

export default function AdminSettingsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const isSuper = user?.role === 'SUPER_ADMIN';
  const [section, setSection] = useState<Section>('general');
  const [settings, setSettings] = useState<SiteSettings>(createDefaultSiteSettings());
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  const sections = useMemo(() => {
    const items: Array<{ id: Section; label: string }> = [
      { id: 'general', label: t('admin.settings.nav.general') },
      { id: 'pricing', label: t('admin.settings.nav.pricing') },
      { id: 'tracks', label: t('admin.settings.nav.tracks') },
      { id: 'readiness', label: t('admin.settings.nav.readiness') },
      { id: 'bootcamp', label: t('admin.settings.nav.bootcamp') },
      { id: 'courses', label: t('admin.settings.nav.courses') },
    ];
    if (isSuper) {
      items.splice(2, 0, { id: 'payment', label: t('admin.settings.nav.payment') });
      items.splice(3, 0, { id: 'sms', label: t('admin.settings.nav.sms') });
      items.splice(4, 0, { id: 'enamad', label: t('admin.settings.nav.enamad') });
      items.push({ id: 'adminAccess', label: t('admin.settings.nav.adminAccess') });
      items.push({ id: 'backup', label: t('admin.settings.nav.backup') });
    }
    return items;
  }, [t, isSuper]);

  const load = useCallback(async () => {
    const [nextSettings, nextCourses] = await Promise.all([
      api.adminGetSettings(),
      api.adminListCourses(),
    ]);
    setSettings({
      ...nextSettings,
      adminAccess: normalizeAdminAccess(nextSettings.adminAccess),
      payment: normalizePaymentSettings(nextSettings.payment),
      sms: normalizeSmsSettings(nextSettings.sms),
      enamad: normalizeEnamadSettings(nextSettings.enamad),
    });
    setCourses(nextCourses);
  }, []);

  useEffect(() => {
    load()
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : t('admin.settings.loadError'));
      })
      .finally(() => setLoading(false));
  }, [load, t]);

  const persist = async (patch: Partial<SiteSettings>) => {
    setSaving(true);
    setError('');
    setSaved('');
    try {
      const updated = await api.adminUpdateSettings(patch);
      setSettings(updated);
      setSaved(t('admin.settings.saved'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.settings.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSection = async (e: FormEvent) => {
    e.preventDefault();
    if (section === 'general') await persist({ general: settings.general });
    if (section === 'pricing') await persist({ pricing: settings.pricing });
    if (section === 'tracks') await persist({ tracks: settings.tracks });
    if (section === 'readiness') await persist({ readiness: settings.readiness });
    if (section === 'bootcamp') await persist({ bootcamp: settings.bootcamp });
    if (section === 'payment') await persist({ payment: settings.payment });
    if (section === 'sms') await persist({ sms: settings.sms });
    if (section === 'enamad') await persist({ enamad: settings.enamad });
    if (section === 'adminAccess') await persist({ adminAccess: settings.adminAccess });
  };

  const handleDeleteCourse = async (slug: string) => {
    if (!confirm(t('admin.courses.deleteConfirm', { slug }))) return;
    try {
      await api.adminDeleteCourse(slug);
      setCourses((prev) => prev.filter((c) => c.slug !== slug));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.courses.deleteError'));
    }
  };

  if (loading) {
    return (
      <div className="admin-content auth-loading">
        <Loader2 size={24} className="spin" /> {t('admin.settings.loading')}
      </div>
    );
  }

  return (
    <div className="admin-content">
      <h1>{t('admin.settings.title')}</h1>
      <p className="admin-sub">{t('admin.settings.sub')}</p>

      <div className="admin-settings-tabs">
        {sections.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`admin-settings-tab${section === item.id ? ' active' : ''}`}
            onClick={() => {
              setSection(item.id);
              setSaved('');
              setError('');
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && <p className="form-error">{error}</p>}
      {saved && <p className="form-success">{saved}</p>}

      {section === 'backup' && isSuper ? (
        <section className="admin-card">
          <h2>{t('admin.settings.backup.title')}</h2>
          <p className="admin-sub">{t('admin.settings.backup.sub')}</p>
          <p className="admin-sub">{t('admin.settings.backup.note')}</p>
          <button
            type="button"
            className="cta-primary"
            onClick={() => {
              const blob = new Blob([JSON.stringify(settings, null, 2)], {
                type: 'application/json',
              });
              const url = URL.createObjectURL(blob);
              const anchor = document.createElement('a');
              anchor.href = url;
              anchor.download = `kia-settings-${new Date().toISOString().slice(0, 10)}.json`;
              anchor.click();
              URL.revokeObjectURL(url);
              setSaved(t('admin.settings.backup.exported'));
            }}
          >
            {t('admin.settings.backup.export')}
          </button>
        </section>
      ) : null}

      {section === 'courses' ? (
        <section className="admin-section">
          <div className="admin-header-row">
            <div>
              <h2>{t('admin.courses.title')}</h2>
              <p className="admin-sub">{t('admin.courses.sub')}</p>
            </div>
            <Link href="/admin/academy/courses/new" className="btn-next admin-btn">
              <Plus size={16} /> {t('admin.courses.new')}
            </Link>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('admin.courses.col.title')}</th>
                  <th>{t('admin.courses.col.slug')}</th>
                  <th>{t('admin.courses.col.lessons')}</th>
                  <th>{t('admin.courses.col.status')}</th>
                  <th>{t('admin.courses.col.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <tr key={course.id}>
                    <td>
                      <span className="admin-table-icon">{course.icon || '📘'}</span>
                      {course.title}
                    </td>
                    <td>
                      <code>{course.slug}</code>
                    </td>
                    <td>{course.lessonCount ?? course.lessons?.length ?? 0}</td>
                    <td>
                      <span className={`admin-badge${course.published ? ' ok' : ''}`}>
                        {course.published
                          ? t('domain.courseStatuses.published')
                          : t('domain.courseStatuses.draft')}
                      </span>
                    </td>
                    <td className="admin-actions">
                      <Link href={`/admin/academy/courses/${course.slug}/edit`} className="admin-link">
                        {t('common.edit')}
                      </Link>
                      <button
                        type="button"
                        className="admin-link danger"
                        onClick={() => handleDeleteCourse(course.slug)}
                      >
                        {t('common.delete')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {courses.length === 0 && <p className="admin-sub">{t('admin.courses.empty')}</p>}
        </section>
      ) : section === 'backup' ? null : (
        <form className="admin-form" style={{ maxWidth: 'none' }} onSubmit={handleSaveSection}>
          {section === 'general' && (
            <>
              <label className="form-field">
                <span>{t('admin.settings.general.siteName')}</span>
                <input
                  required
                  value={settings.general.siteName}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      general: { ...settings.general, siteName: e.target.value },
                    })
                  }
                />
              </label>
              <label className="form-field">
                <span>{t('admin.settings.general.tagline')}</span>
                <input
                  value={settings.general.tagline}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      general: { ...settings.general, tagline: e.target.value },
                    })
                  }
                />
              </label>
              <div className="admin-form-row">
                <label className="form-field">
                  <span>{t('admin.settings.general.heroMinutes')}</span>
                  <input
                    type="number"
                    min={1}
                    value={settings.general.heroMinutes}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        general: { ...settings.general, heroMinutes: Number(e.target.value) },
                      })
                    }
                  />
                </label>
                <label className="form-field">
                  <span>{t('admin.settings.general.heroRoadmaps')}</span>
                  <input
                    type="number"
                    min={0}
                    value={settings.general.heroRoadmapsCount}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        general: {
                          ...settings.general,
                          heroRoadmapsCount: Number(e.target.value),
                        },
                      })
                    }
                  />
                </label>
                <label className="form-field">
                  <span>{t('admin.settings.general.heroMatch')}</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={settings.general.heroMatchPercent}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        general: {
                          ...settings.general,
                          heroMatchPercent: Number(e.target.value),
                        },
                      })
                    }
                  />
                </label>
              </div>
              <label className="form-field">
                <span>{t('admin.settings.general.supportEmail')}</span>
                <input
                  type="email"
                  required
                  value={settings.general.supportEmail}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      general: { ...settings.general, supportEmail: e.target.value },
                    })
                  }
                />
              </label>
            </>
          )}

          {section === 'pricing' && (
            <>
              <p className="admin-sub">{t('admin.settings.pricing.tomanHint')}</p>
              <div className="admin-form-row">
                <label className="form-field">
                  <span>{t('admin.settings.pricing.course')}</span>
                  <input
                    type="number"
                    min={0}
                    value={Math.round(settings.pricing.courseCents / 10)}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        pricing: {
                          ...settings.pricing,
                          courseCents: Math.round(Number(e.target.value) * 10),
                        },
                      })
                    }
                  />
                </label>
                <label className="form-field">
                  <span>{t('admin.settings.pricing.discount')}</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={settings.pricing.bundleDiscountPercent}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        pricing: {
                          ...settings.pricing,
                          bundleDiscountPercent: Number(e.target.value),
                        },
                      })
                    }
                  />
                </label>
              </div>
              <div className="admin-section">
                <div className="admin-header-row">
                  <h3>{t('admin.settings.pricing.modules')}</h3>
                  <button
                    type="button"
                    className="btn-next admin-btn"
                    onClick={() =>
                      setSettings({
                        ...settings,
                        pricing: {
                          ...settings.pricing,
                          modulePrices: [...settings.pricing.modulePrices, 490_000],
                        },
                      })
                    }
                  >
                    <Plus size={14} /> {t('admin.settings.pricing.addModule')}
                  </button>
                </div>
                {settings.pricing.modulePrices.map((price, index) => (
                  <div key={index} className="admin-inline-row">
                    <label className="form-field">
                      <span>
                        {t('admin.settings.pricing.moduleN', { n: String(index + 1) })}
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={Math.round(price / 10)}
                        onChange={(e) => {
                          const modulePrices = [...settings.pricing.modulePrices];
                          modulePrices[index] = Math.round(Number(e.target.value) * 10);
                          setSettings({
                            ...settings,
                            pricing: { ...settings.pricing, modulePrices },
                          });
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      className="admin-link danger"
                      disabled={settings.pricing.modulePrices.length <= 1}
                      onClick={() => {
                        const modulePrices = settings.pricing.modulePrices.filter(
                          (_, i) => i !== index,
                        );
                        setSettings({
                          ...settings,
                          pricing: { ...settings.pricing, modulePrices },
                        });
                      }}
                    >
                      <Trash2 size={14} /> {t('common.remove')}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {section === 'payment' && isSuper && (
            <>
              <p className="admin-sub">{t('admin.settings.payment.sub')}</p>
              <label className="admin-access-toggle" style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={settings.payment.enabled}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      payment: { ...settings.payment, enabled: e.target.checked },
                    })
                  }
                />
                <span>{t('admin.settings.payment.enabled')}</span>
              </label>
              <label className="form-field">
                <span>{t('admin.settings.payment.provider')}</span>
                <select
                  value={settings.payment.provider}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      payment: {
                        ...settings.payment,
                        provider: e.target.value as typeof settings.payment.provider,
                      },
                    })
                  }
                >
                  <option value="dev">{t('checkout.providers.dev')}</option>
                  <option value="zarinpal">{t('checkout.providers.zarinpal')}</option>
                  <option value="idpay">{t('checkout.providers.idpay')}</option>
                  <option value="stripe">{t('checkout.providers.stripe')}</option>
                </select>
              </label>
              <label className="form-field">
                <span>{t('admin.settings.payment.currency')}</span>
                <select
                  value={settings.payment.currency}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      payment: {
                        ...settings.payment,
                        currency: e.target.value as typeof settings.payment.currency,
                      },
                    })
                  }
                >
                  <option value="irr">IRR</option>
                  <option value="irt">IRT (تومان)</option>
                </select>
              </label>
              <label className="form-field">
                <span>{t('admin.settings.payment.displayName')}</span>
                <input
                  value={settings.payment.displayName}
                  placeholder={t('admin.settings.payment.displayNamePlaceholder')}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      payment: { ...settings.payment, displayName: e.target.value },
                    })
                  }
                />
              </label>
              <label className="form-field">
                <span>{t('admin.settings.payment.description')}</span>
                <textarea
                  rows={3}
                  value={settings.payment.description}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      payment: { ...settings.payment, description: e.target.value },
                    })
                  }
                />
              </label>
              <label className="form-field">
                <span>{t('admin.settings.payment.merchantId')}</span>
                <input
                  className="ltr-isolate"
                  value={settings.payment.merchantId}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      payment: { ...settings.payment, merchantId: e.target.value },
                    })
                  }
                />
              </label>
              <label className="form-field">
                <span>{t('admin.settings.payment.apiKey')}</span>
                <input
                  className="ltr-isolate"
                  type="password"
                  autoComplete="off"
                  value={settings.payment.apiKey}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      payment: { ...settings.payment, apiKey: e.target.value },
                    })
                  }
                />
              </label>
              <label className="form-field">
                <span>{t('admin.settings.payment.callbackUrl')}</span>
                <input
                  className="ltr-isolate"
                  value={settings.payment.callbackUrl}
                  placeholder="/api/payments/callback"
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      payment: { ...settings.payment, callbackUrl: e.target.value },
                    })
                  }
                />
              </label>
              <label className="form-field">
                <span>{t('admin.settings.payment.successUrl')}</span>
                <input
                  className="ltr-isolate"
                  value={settings.payment.successUrl}
                  placeholder="/checkout/success"
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      payment: { ...settings.payment, successUrl: e.target.value },
                    })
                  }
                />
              </label>
              <label className="form-field">
                <span>{t('admin.settings.payment.failureUrl')}</span>
                <input
                  className="ltr-isolate"
                  value={settings.payment.failureUrl}
                  placeholder="/checkout/cancel"
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      payment: { ...settings.payment, failureUrl: e.target.value },
                    })
                  }
                />
              </label>
              <label className="admin-access-toggle" style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={settings.payment.sandbox}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      payment: { ...settings.payment, sandbox: e.target.checked },
                    })
                  }
                />
                <span>{t('admin.settings.payment.sandbox')}</span>
              </label>
            </>
          )}

          {section === 'sms' && isSuper && (
            <>
              <p className="admin-sub">{t('admin.settings.sms.sub')}</p>
              <label className="admin-access-toggle" style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={settings.sms.enabled}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      sms: { ...settings.sms, enabled: e.target.checked },
                    })
                  }
                />
                <span>{t('admin.settings.sms.enabled')}</span>
              </label>
              <label>
                <span>{t('admin.settings.sms.provider')}</span>
                <select
                  value={settings.sms.provider}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      sms: {
                        ...settings.sms,
                        provider: e.target.value as typeof settings.sms.provider,
                      },
                    })
                  }
                >
                  <option value="dev">dev</option>
                  <option value="kavenegar">kavenegar</option>
                </select>
              </label>
              <label>
                <span>{t('admin.settings.sms.apiKey')}</span>
                <input
                  type="password"
                  autoComplete="off"
                  value={settings.sms.apiKey}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      sms: { ...settings.sms, apiKey: e.target.value },
                    })
                  }
                />
              </label>
              <label>
                <span>{t('admin.settings.sms.template')}</span>
                <input
                  value={settings.sms.template}
                  placeholder={t('admin.settings.sms.templatePlaceholder')}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      sms: { ...settings.sms, template: e.target.value },
                    })
                  }
                />
              </label>
              <label>
                <span>{t('admin.settings.sms.sender')}</span>
                <input
                  value={settings.sms.sender}
                  placeholder={t('admin.settings.sms.senderPlaceholder')}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      sms: { ...settings.sms, sender: e.target.value },
                    })
                  }
                />
              </label>
              <p className="admin-sub">{t('admin.settings.sms.hint')}</p>
            </>
          )}

          {section === 'enamad' && isSuper && (
            <>
              <p className="admin-sub">{t('admin.settings.enamad.sub')}</p>
              <label className="admin-access-toggle" style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={settings.enamad.enabled}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      enamad: { ...settings.enamad, enabled: e.target.checked },
                    })
                  }
                />
                <span>{t('admin.settings.enamad.enabled')}</span>
              </label>
              <label>
                <span>{t('admin.settings.enamad.codeId')}</span>
                <input
                  value={settings.enamad.codeId}
                  placeholder={t('admin.settings.enamad.codeIdPlaceholder')}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      enamad: { ...settings.enamad, codeId: e.target.value },
                    })
                  }
                />
              </label>
              <label>
                <span>{t('admin.settings.enamad.code')}</span>
                <input
                  value={settings.enamad.code}
                  placeholder={t('admin.settings.enamad.codePlaceholder')}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      enamad: { ...settings.enamad, code: e.target.value },
                    })
                  }
                />
              </label>
              <p className="admin-sub">{t('admin.settings.enamad.hint')}</p>
            </>
          )}

          {section === 'tracks' && (
            <TracksEditor
              tracks={settings.tracks}
              onChange={(tracks) => setSettings({ ...settings, tracks })}
            />
          )}

          {section === 'readiness' && (
            <>
              <label className="form-field">
                <span>{t('admin.settings.readiness.threshold')}</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={settings.readiness.passThreshold}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      readiness: {
                        ...settings.readiness,
                        passThreshold: Number(e.target.value),
                      },
                    })
                  }
                />
              </label>
              <label className="form-field">
                <span>{t('admin.settings.readiness.passTitle')}</span>
                <input
                  value={settings.readiness.passTitle}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      readiness: { ...settings.readiness, passTitle: e.target.value },
                    })
                  }
                />
              </label>
              <label className="form-field">
                <span>{t('admin.settings.readiness.passMessage')}</span>
                <textarea
                  className="admin-textarea"
                  rows={3}
                  value={settings.readiness.passMessage}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      readiness: { ...settings.readiness, passMessage: e.target.value },
                    })
                  }
                />
              </label>
              <label className="form-field">
                <span>{t('admin.settings.readiness.failTitle')}</span>
                <input
                  value={settings.readiness.failTitle}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      readiness: { ...settings.readiness, failTitle: e.target.value },
                    })
                  }
                />
              </label>
              <label className="form-field">
                <span>{t('admin.settings.readiness.failMessage')}</span>
                <textarea
                  className="admin-textarea"
                  rows={3}
                  value={settings.readiness.failMessage}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      readiness: { ...settings.readiness, failMessage: e.target.value },
                    })
                  }
                />
              </label>
            </>
          )}

          {section === 'bootcamp' && (
            <>
              <div className="admin-form-row">
                <label className="form-field">
                  <span>{t('admin.settings.bootcamp.unlockScore')}</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={settings.bootcamp.unlockScoreThreshold}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        bootcamp: {
                          ...settings.bootcamp,
                          unlockScoreThreshold: Number(e.target.value),
                        },
                      })
                    }
                  />
                </label>
                <label className="form-field">
                  <span>{t('admin.settings.bootcamp.unlockCourse')}</span>
                  <input
                    value={settings.bootcamp.unlockCourseSlug}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        bootcamp: {
                          ...settings.bootcamp,
                          unlockCourseSlug: e.target.value.toLowerCase().replace(/\s+/g, '-'),
                        },
                      })
                    }
                  />
                </label>
              </div>
              <div className="admin-form-row">
                <label className="form-field">
                  <span>{t('admin.settings.bootcamp.defaultRank')}</span>
                  <input
                    type="number"
                    min={1}
                    value={settings.bootcamp.defaultRank}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        bootcamp: {
                          ...settings.bootcamp,
                          defaultRank: Number(e.target.value),
                        },
                      })
                    }
                  />
                </label>
                <label className="form-field">
                  <span>{t('admin.settings.bootcamp.defaultPoints')}</span>
                  <input
                    type="number"
                    min={0}
                    value={settings.bootcamp.defaultPoints}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        bootcamp: {
                          ...settings.bootcamp,
                          defaultPoints: Number(e.target.value),
                        },
                      })
                    }
                  />
                </label>
              </div>
            </>
          )}

          {section === 'adminAccess' && isSuper && (
            <>
              <h2>{t('admin.settings.adminAccess.title')}</h2>
              <p className="admin-sub">{t('admin.settings.adminAccess.sub')}</p>
              <p className="admin-sub">{t('admin.settings.adminAccess.superOnly')}</p>
              <p className="admin-sub">{t('admin.settings.adminAccess.defaultTemplate')}</p>
              <AdminAccessMatrix
                access={settings.adminAccess}
                onChange={(adminAccess) => setSettings({ ...settings, adminAccess })}
              />
            </>
          )}

          <button type="submit" className="cta-primary" disabled={saving}>
            {saving ? t('admin.settings.saving') : t('admin.settings.save')}
          </button>
        </form>
      )}
    </div>
  );
}

function TracksEditor({
  tracks,
  onChange,
}: {
  tracks: SiteTrackSettings[];
  onChange: (tracks: SiteTrackSettings[]) => void;
}) {
  const { t } = useLanguage();

  const updateTrack = (index: number, patch: Partial<SiteTrackSettings>) => {
    const next = tracks.map((track, i) => (i === index ? { ...track, ...patch } : track));
    onChange(next);
  };

  const addTrack = () => {
    onChange([
      ...tracks,
      {
        key: `track-${tracks.length + 1}`,
        name: 'New track',
        icon: '📘',
        description: '',
        modules: ['Module 1'],
      },
    ]);
  };

  const removeTrack = (index: number) => {
    if (tracks.length <= 1) return;
    onChange(tracks.filter((_, i) => i !== index));
  };

  return (
    <div className="admin-section">
      <div className="admin-header-row">
        <h3>{t('admin.settings.tracks.heading')}</h3>
        <button type="button" className="btn-next admin-btn" onClick={addTrack}>
          <Plus size={14} /> {t('admin.settings.tracks.add')}
        </button>
      </div>
      {tracks.map((track, index) => (
        <div key={`${track.key}-${index}`} className="admin-track-card">
          <div className="admin-form-row">
            <label className="form-field">
              <span>{t('admin.settings.tracks.key')}</span>
              <input
                required
                value={track.key}
                onChange={(e) =>
                  updateTrack(index, {
                    key: e.target.value.toLowerCase().replace(/\s+/g, '-'),
                  })
                }
              />
            </label>
            <label className="form-field">
              <span>{t('admin.settings.tracks.name')}</span>
              <input
                required
                value={track.name}
                onChange={(e) => updateTrack(index, { name: e.target.value })}
              />
            </label>
            <label className="form-field">
              <span>{t('admin.settings.tracks.icon')}</span>
              <input
                value={track.icon}
                onChange={(e) => updateTrack(index, { icon: e.target.value })}
              />
            </label>
          </div>
          <label className="form-field">
            <span>{t('admin.settings.tracks.description')}</span>
            <input
              value={track.description}
              onChange={(e) => updateTrack(index, { description: e.target.value })}
            />
          </label>
          <div className="admin-header-row">
            <h4>{t('admin.settings.tracks.modules')}</h4>
            <button
              type="button"
              className="admin-link"
              onClick={() =>
                updateTrack(index, {
                  modules: [...track.modules, `Module ${track.modules.length + 1}`],
                })
              }
            >
              <Plus size={14} /> {t('admin.settings.tracks.addModule')}
            </button>
          </div>
          {track.modules.map((moduleName, moduleIndex) => (
            <div key={moduleIndex} className="admin-inline-row">
              <label className="form-field">
                <span>
                  {t('admin.settings.tracks.moduleN', { n: String(moduleIndex + 1) })}
                </span>
                <input
                  required
                  value={moduleName}
                  onChange={(e) => {
                    const modules = [...track.modules];
                    modules[moduleIndex] = e.target.value;
                    updateTrack(index, { modules });
                  }}
                />
              </label>
              <button
                type="button"
                className="admin-link danger"
                disabled={track.modules.length <= 1}
                onClick={() =>
                  updateTrack(index, {
                    modules: track.modules.filter((_, i) => i !== moduleIndex),
                  })
                }
              >
                <Trash2 size={14} /> {t('common.remove')}
              </button>
            </div>
          ))}
          <button
            type="button"
            className="admin-link danger"
            disabled={tracks.length <= 1}
            onClick={() => removeTrack(index)}
          >
            <Trash2 size={14} /> {t('admin.settings.tracks.remove')}
          </button>
        </div>
      ))}
    </div>
  );
}
