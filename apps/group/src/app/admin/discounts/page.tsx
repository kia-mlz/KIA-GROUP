'use client';

import {
  BadgePercent,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  fromDisplayUnits,
  normalizePaymentCurrency,
  toDisplayUnits,
  type AdminDiscountCode,
  type AdminDiscountCodeInput,
  type CourseSummary,
  type DiscountType,
} from '@kia./shared';
import { AdminEmptyState, AdminErrorState, AdminLoading } from '@/components/admin/AdminStates';
import { AdminStatusBadge, type ProBadgeTone } from '@/components/admin/AdminPro';
import { useAdminAccess } from '@/components/admin/useAdminAccess';
import { useLanguage } from '@/context/LanguageProvider';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { api, ApiError } from '@/lib/api';

/** Form state — every numeric/date field is a string so inputs stay controlled. */
interface Draft {
  id: string | null;
  code: string;
  type: DiscountType;
  value: string;
  description: string;
  active: boolean;
  startsAt: string;
  expiresAt: string;
  maxUses: string;
  minSubtotal: string;
  courseSlugs: string[];
}

const emptyDraft = (): Draft => ({
  id: null,
  code: '',
  type: 'PERCENT',
  value: '',
  description: '',
  active: true,
  startsAt: '',
  expiresAt: '',
  maxUses: '',
  minSubtotal: '',
  courseSlugs: [],
});

/** ISO → `datetime-local` value (local wall clock, minute precision). */
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

/** A local wall-clock string → ISO, or null for "no date". */
function fromLocalInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function draftFrom(code: AdminDiscountCode, currency: 'irr' | 'irt'): Draft {
  return {
    id: code.id,
    code: code.code,
    type: code.type,
    value: String(
      code.type === 'PERCENT'
        ? code.value
        : toDisplayUnits(code.value, currency),
    ),
    description: code.description ?? '',
    active: code.active,
    startsAt: toLocalInput(code.startsAt),
    expiresAt: toLocalInput(code.expiresAt),
    maxUses: code.maxUses === null ? '' : String(code.maxUses),
    minSubtotal:
      code.minSubtotalCents === null
        ? ''
        : String(toDisplayUnits(code.minSubtotalCents, currency)),
    courseSlugs: code.courseSlugs ?? [],
  };
}

/**
 * Live status of a code: the stored `active` flag is only one of five states an
 * operator needs to distinguish (scheduled, expired, exhausted, …).
 */
function codeStatus(
  code: AdminDiscountCode,
  now: number,
): { key: string; tone: ProBadgeTone } {
  if (!code.active) return { key: 'statusInactive', tone: 'neutral' };
  if (code.startsAt && now < Date.parse(code.startsAt)) {
    return { key: 'statusScheduled', tone: 'info' };
  }
  if (code.expiresAt && now >= Date.parse(code.expiresAt)) {
    return { key: 'statusExpired', tone: 'danger' };
  }
  if (code.maxUses !== null && code.usedCount >= code.maxUses) {
    return { key: 'statusExhausted', tone: 'warning' };
  }
  return { key: 'statusActive', tone: 'ok' };
}

export default function AdminDiscountsPage() {
  const { t, format } = useLanguage();
  const { can } = useAdminAccess();
  const { settings } = useSiteSettings();
  const canManage = can('discounts', 'manage');
  const currency = normalizePaymentCurrency(settings.payment.currency);
  const unitLabel =
    currency === 'irt' ? t('admin.payments.unitToman') : t('admin.payments.unitRial');

  const [codes, setCodes] = useState<AdminDiscountCode[]>([]);
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  const load = async () => {
    setError('');
    try {
      const rows = await api.adminListDiscountCodes();
      setCodes(rows);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.discounts.loadError'));
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [rows, courseList] = await Promise.all([
          api.adminListDiscountCodes(),
          api.listCourses(),
        ]);
        if (cancelled) return;
        setCodes(rows);
        setCourses(courseList);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : t('admin.discounts.loadError'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Load once on mount; `t` only affects the fallback copy.
  }, []);

  /** Course titles by slug — the table and scope picker both need them. */
  const courseTitles = useMemo(
    () => new Map(courses.map((course) => [course.slug, course.title])),
    [courses],
  );

  const startCreate = () => {
    setNotice('');
    setError('');
    setDraft(emptyDraft());
  };

  const startEdit = (code: AdminDiscountCode) => {
    setNotice('');
    setError('');
    setDraft(draftFrom(code, currency));
  };

  const closeEditor = () => setDraft(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const isPercent = draft.type === 'PERCENT';
      const rawValue = Number(draft.value);
      const value = isPercent ? Math.round(rawValue) : fromDisplayUnits(rawValue, currency);
      const minSubtotalRaw = draft.minSubtotal.trim();
      const maxUsesRaw = draft.maxUses.trim();

      const payload: AdminDiscountCodeInput = {
        code: draft.code.trim().toUpperCase(),
        type: draft.type,
        value,
        description: draft.description.trim() || undefined,
        active: draft.active,
        startsAt: fromLocalInput(draft.startsAt),
        expiresAt: fromLocalInput(draft.expiresAt),
        maxUses: maxUsesRaw ? Number(maxUsesRaw) : null,
        minSubtotalCents: minSubtotalRaw
          ? fromDisplayUnits(Number(minSubtotalRaw), currency)
          : null,
        courseSlugs: draft.courseSlugs.length > 0 ? draft.courseSlugs : null,
      };

      if (draft.id) {
        await api.adminUpdateDiscountCode(draft.id, payload);
        setNotice(t('admin.discounts.updated'));
      } else {
        await api.adminCreateDiscountCode(payload);
        setNotice(t('admin.discounts.created'));
      }
      await load();
      setDraft(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.discounts.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (code: AdminDiscountCode) => {
    if (!window.confirm(t('admin.discounts.deleteConfirm', { code: code.code }))) return;
    setDeletingId(code.id);
    setError('');
    setNotice('');
    try {
      await api.adminDeleteDiscountCode(code.id);
      setCodes((prev) => prev.filter((row) => row.id !== code.id));
      setNotice(t('admin.discounts.deleted'));
      if (draft?.id === code.id) setDraft(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.discounts.deleteError'));
    } finally {
      setDeletingId(null);
    }
  };

  const toggleScope = (slug: string) => {
    if (!draft) return;
    setDraft({
      ...draft,
      courseSlugs: draft.courseSlugs.includes(slug)
        ? draft.courseSlugs.filter((candidate) => candidate !== slug)
        : [...draft.courseSlugs, slug],
    });
  };

  if (loading) return <AdminLoading label={t('admin.discounts.loading')} />;

  return (
    <div className="admin-content">
      <div className="admin-header-row">
        <div>
          <h1>
            <BadgePercent size={22} className="inline-leading-icon" />{' '}
            {t('admin.discounts.title')}
          </h1>
          <p className="admin-sub">{t('admin.discounts.sub')}</p>
        </div>
        {canManage ? (
          <button type="button" className="btn-next admin-btn" onClick={startCreate}>
            <Plus size={16} /> {t('admin.discounts.new')}
          </button>
        ) : null}
      </div>

      {error ? <AdminErrorState message={error} onRetry={() => void load()} /> : null}
      {notice ? (
        <p className="admin-sub" role="status">
          {notice}
        </p>
      ) : null}

      {draft ? (
        <section className="admin-section">
          <div className="admin-header-row">
            <h2>{draft.id ? t('admin.discounts.editTitle') : t('admin.discounts.newTitle')}</h2>
            <button type="button" className="admin-link-btn" onClick={closeEditor}>
              <X size={14} /> {t('admin.discounts.cancel')}
            </button>
          </div>

          <form className="admin-form" onSubmit={handleSubmit}>
            <div className="admin-form-row">
              <label className="form-field">
                <span>{t('admin.discounts.field.code')}</span>
                <input
                  required
                  minLength={3}
                  maxLength={40}
                  className="admin-input ltr-isolate"
                  dir="ltr"
                  autoComplete="off"
                  spellCheck={false}
                  value={draft.code}
                  onChange={(event) => setDraft({ ...draft, code: event.target.value })}
                />
                <small className="admin-meta">{t('admin.discounts.field.codeHint')}</small>
              </label>

              <label className="form-field">
                <span>{t('admin.discounts.field.type')}</span>
                <select
                  className="admin-select"
                  value={draft.type}
                  onChange={(event) =>
                    setDraft({ ...draft, type: event.target.value as DiscountType, value: '' })
                  }
                >
                  <option value="PERCENT">{t('admin.discounts.typePercent')}</option>
                  <option value="FIXED">{t('admin.discounts.typeFixed')}</option>
                </select>
              </label>

              <label className="form-field">
                <span>
                  {draft.type === 'PERCENT'
                    ? t('admin.discounts.field.valuePercent')
                    : t('admin.discounts.field.valueFixed', { unit: unitLabel })}
                </span>
                <input
                  required
                  type="number"
                  min={1}
                  max={draft.type === 'PERCENT' ? 100 : undefined}
                  step={1}
                  className="admin-input"
                  value={draft.value}
                  onChange={(event) => setDraft({ ...draft, value: event.target.value })}
                />
              </label>
            </div>

            <label className="form-field">
              <span>{t('admin.discounts.field.description')}</span>
              <input
                className="admin-input"
                maxLength={200}
                value={draft.description}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              />
            </label>

            <div className="admin-form-row">
              <label className="form-field">
                <span>{t('admin.discounts.field.startsAt')}</span>
                <input
                  type="datetime-local"
                  className="admin-input"
                  value={draft.startsAt}
                  onChange={(event) => setDraft({ ...draft, startsAt: event.target.value })}
                />
              </label>
              <label className="form-field">
                <span>{t('admin.discounts.field.expiresAt')}</span>
                <input
                  type="datetime-local"
                  className="admin-input"
                  value={draft.expiresAt}
                  onChange={(event) => setDraft({ ...draft, expiresAt: event.target.value })}
                />
              </label>
            </div>

            <div className="admin-form-row">
              <label className="form-field">
                <span>{t('admin.discounts.field.maxUses')}</span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  className="admin-input"
                  value={draft.maxUses}
                  onChange={(event) => setDraft({ ...draft, maxUses: event.target.value })}
                />
              </label>
              <label className="form-field">
                <span>{t('admin.discounts.field.minSubtotal', { unit: unitLabel })}</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  className="admin-input"
                  value={draft.minSubtotal}
                  onChange={(event) => setDraft({ ...draft, minSubtotal: event.target.value })}
                />
              </label>
            </div>

            <fieldset className="admin-form">
              <legend className="form-field">
                <span>{t('admin.discounts.field.scope')}</span>
              </legend>
              <small className="admin-meta">{t('admin.discounts.field.scopeHint')}</small>
              <div className="admin-form-row" style={{ flexWrap: 'wrap' }}>
                {courses.map((course) => (
                  <label className="admin-checkbox" key={course.slug}>
                    <input
                      type="checkbox"
                      checked={draft.courseSlugs.includes(course.slug)}
                      onChange={() => toggleScope(course.slug)}
                    />
                    {course.title}
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="admin-checkbox">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(event) => setDraft({ ...draft, active: event.target.checked })}
              />
              {t('admin.discounts.field.active')}
            </label>

            <p className="admin-sub">{t('admin.discounts.preview')}</p>

            <div className="admin-form-actions">
              <button type="submit" className="cta-primary" disabled={saving}>
                {saving
                  ? t('admin.discounts.saving')
                  : draft.id
                    ? t('admin.discounts.save')
                    : t('admin.discounts.create')}
              </button>
              <button type="button" className="btn-outline-full" onClick={closeEditor}>
                {t('admin.discounts.cancel')}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {codes.length === 0 ? (
        draft ? null : <AdminEmptyState
          icon={<BadgePercent />}
          title={t('admin.discounts.empty')}
          hint={t('admin.discounts.sub')}
          action={
            canManage ? (
              <button type="button" className="cta-primary" onClick={startCreate}>
                <Plus size={16} /> {t('admin.discounts.new')}
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('admin.discounts.col.code')}</th>
                <th>{t('admin.discounts.col.discount')}</th>
                <th>{t('admin.discounts.col.status')}</th>
                <th>{t('admin.discounts.col.usage')}</th>
                <th>{t('admin.discounts.col.window')}</th>
                <th>{t('admin.discounts.col.scope')}</th>
                <th>{t('admin.discounts.col.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((code) => {
                const status = codeStatus(code, now);
                return (
                  <tr key={code.id}>
                    <td>
                      <code className="ltr-isolate">{code.code}</code>
                      {code.description ? (
                        <div className="admin-meta">{code.description}</div>
                      ) : null}
                    </td>
                    <td>
                      <span className="ltr-isolate">
                        {code.type === 'PERCENT'
                          ? format.percent(code.value)
                          : format.currency(code.value)}
                      </span>
                      <div className="admin-meta">
                        {code.type === 'PERCENT'
                          ? t('admin.discounts.typePercent')
                          : t('admin.discounts.typeFixed')}
                      </div>
                    </td>
                    <td>
                      <AdminStatusBadge tone={status.tone}>
                        {t(`admin.discounts.${status.key}` as 'admin.discounts.statusActive')}
                      </AdminStatusBadge>
                    </td>
                    <td>
                      {code.maxUses === null
                        ? t('admin.discounts.usageUnlimited')
                        : t('admin.discounts.usageCount', {
                            used: format.number(code.usedCount),
                            max: format.number(code.maxUses),
                          })}
                    </td>
                    <td>
                      {code.startsAt || code.expiresAt ? (
                        <span>
                          {code.startsAt ? format.date(code.startsAt) : '—'}
                          {' → '}
                          {code.expiresAt ? format.date(code.expiresAt) : '—'}
                        </span>
                      ) : (
                        <span className="admin-meta">{t('admin.discounts.noWindow')}</span>
                      )}
                    </td>
                    <td>
                      {code.courseSlugs && code.courseSlugs.length > 0
                        ? t('admin.discounts.scopeCount', {
                            count: format.number(code.courseSlugs.length),
                          })
                        : t('admin.discounts.scopeAll')}
                      {code.courseSlugs && code.courseSlugs.length > 0 ? (
                        <div className="admin-meta">
                          {code.courseSlugs
                            .map((slug) => courseTitles.get(slug) ?? slug)
                            .join('، ')}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        {canManage ? (
                          <>
                            <button
                              type="button"
                              className="admin-link-btn"
                              onClick={() => startEdit(code)}
                            >
                              <Pencil size={13} /> {t('admin.discounts.edit')}
                            </button>
                            <button
                              type="button"
                              className="admin-link-btn danger"
                              disabled={deletingId === code.id}
                              onClick={() => void handleDelete(code)}
                            >
                              {deletingId === code.id ? (
                                <Loader2 size={13} className="spin" />
                              ) : (
                                <Trash2 size={13} />
                              )}{' '}
                              {deletingId === code.id
                                ? t('admin.discounts.deleting')
                                : t('admin.discounts.delete')}
                            </button>
                          </>
                        ) : (
                          <span className="admin-meta">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
