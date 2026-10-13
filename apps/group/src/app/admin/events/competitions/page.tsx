'use client';

import type { AdminCompetition, AdminCompetitionRegistration } from '@kia-group/shared';
import { ChevronDown, Loader2, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageProvider';
import { api, ApiError } from '@/lib/api';

const EMPTY_FORM = {
  slug: '',
  title: '',
  description: '',
  startsAt: '',
  endsAt: '',
  active: true,
};

export default function AdminCompetitionsPage() {
  const { t, format } = useLanguage();
  const [competitions, setCompetitions] = useState<AdminCompetition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openRegistrations, setOpenRegistrations] = useState<string | null>(null);
  const [registrations, setRegistrations] = useState<AdminCompetitionRegistration[]>([]);
  const [registrationsLoading, setRegistrationsLoading] = useState(false);

  useEffect(() => {
    api
      .adminListCompetitions()
      .then(setCompetitions)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : t('admin.competitions.error')),
      )
      .finally(() => setLoading(false));
  }, [t]);

  const submit = async () => {
    if (!form.slug.trim() || !form.title.trim()) return;
    setBusy(true);
    setSaved('');
    try {
      if (editingId) {
        const next = await api.adminUpdateCompetition(editingId, {
          slug: form.slug.trim(),
          title: form.title.trim(),
          description: form.description.trim(),
          startsAt: form.startsAt,
          endsAt: form.endsAt,
          active: form.active,
        });
        setCompetitions((prev) => prev.map((item) => (item.id === next.id ? next : item)));
        setSaved(t('admin.competitions.updated'));
      } else {
        const next = await api.adminCreateCompetition({
          slug: form.slug.trim(),
          title: form.title.trim(),
          description: form.description.trim(),
          startsAt: form.startsAt,
          endsAt: form.endsAt,
          active: form.active,
        });
        setCompetitions((prev) => [next, ...prev]);
        setSaved(t('admin.competitions.created'));
      }
      setForm({ ...EMPTY_FORM });
      setEditingId(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.competitions.error'));
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (competition: AdminCompetition) => {
    setEditingId(competition.id);
    setForm({
      slug: competition.slug,
      title: competition.title,
      description: competition.description,
      startsAt: competition.startsAt.slice(0, 10),
      endsAt: competition.endsAt.slice(0, 10),
      active: competition.active,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = async (id: string) => {
    try {
      await api.adminDeleteCompetition(id);
      setCompetitions((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.competitions.error'));
    }
  };

  const toggleRegistrations = async (id: string) => {
    if (openRegistrations === id) {
      setOpenRegistrations(null);
      return;
    }
    setOpenRegistrations(id);
    setRegistrationsLoading(true);
    try {
      const list = await api.adminListCompetitionRegistrations(id);
      setRegistrations(list);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.competitions.error'));
    } finally {
      setRegistrationsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-content auth-loading">
        <Loader2 size={24} className="spin" /> {t('admin.competitions.loading')}
      </div>
    );
  }

  return (
    <div className="admin-content">
      {error ? <p className="form-error">{error}</p> : null}
      {saved ? <p className="form-success">{saved}</p> : null}
      <article className="admin-card" style={{ marginBottom: '1.5rem' }}>
        <div className="admin-section-head">
          <div>
            <h2>{editingId ? t('admin.competitions.edit') : t('admin.competitions.create')}</h2>
            <p>{t('admin.competitions.formSub')}</p>
          </div>
          {editingId ? (
            <button
              type="button"
              className="pill-btn"
              onClick={() => {
                setEditingId(null);
                setForm({ ...EMPTY_FORM });
              }}
            >
              {t('admin.competitions.cancel')}
            </button>
          ) : null}
        </div>
        <div style={{ display: 'grid', gap: '0.75rem', maxWidth: 640 }}>
          <input
            className="admin-input"
            placeholder={t('admin.competitions.slug')}
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
          />
          <input
            className="admin-input"
            placeholder={t('admin.competitions.titleLabel')}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <textarea
            className="note-editor"
            rows={3}
            placeholder={t('admin.competitions.description')}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <label style={{ flex: '1 1 200px', display: 'grid', gap: '0.25rem' }}>
              <span className="admin-sub">{t('admin.competitions.startsAt')}</span>
              <input
                type="date"
                className="admin-input"
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              />
            </label>
            <label style={{ flex: '1 1 200px', display: 'grid', gap: '0.25rem' }}>
              <span className="admin-sub">{t('admin.competitions.endsAt')}</span>
              <input
                type="date"
                className="admin-input"
                value={form.endsAt}
                onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
              />
            </label>
          </div>
          <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            {t('admin.competitions.active')}
          </label>
          <button
            type="button"
            className="cta-primary"
            onClick={() => void submit()}
            disabled={busy || !form.slug.trim() || !form.title.trim()}
          >
            {busy ? <Loader2 size={16} className="spin" /> : <Plus size={16} />}{' '}
            {editingId ? t('admin.competitions.save') : t('admin.competitions.add')}
          </button>
        </div>
      </article>
      <article className="admin-card">
        <div className="admin-section-head">
          <div>
            <h2>{t('admin.competitions.title')}</h2>
            <p>{t('admin.competitions.sub')}</p>
          </div>
        </div>
        {competitions.length === 0 ? (
          <p className="admin-sub">{t('admin.competitions.empty')}</p>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {competitions.map((competition) => (
              <div
                key={competition.id}
                style={{
                  padding: '0.85rem 1rem',
                  border: '1px solid var(--border-soft)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <strong>
                      {competition.title}{' '}
                      {!competition.active ? (
                        <span className="admin-badge">{t('admin.competitions.inactive')}</span>
                      ) : null}
                    </strong>
                    <div style={{ fontSize: '12px', color: 'var(--text-faint)' }}>
                      <code>{competition.slug}</code>
                      {' · '}
                      {format.date(competition.startsAt)} — {format.date(competition.endsAt)}
                      {' · '}
                      {format.number(competition.registrationCount)}{' '}
                      {t('admin.competitions.registrations')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="pill-btn"
                      onClick={() => void toggleRegistrations(competition.id)}
                    >
                      <ChevronDown size={14} /> {t('admin.competitions.viewRegistrations')}
                    </button>
                    <button type="button" className="pill-btn" onClick={() => startEdit(competition)}>
                      {t('admin.competitions.editBtn')}
                    </button>
                    <button
                      type="button"
                      className="pill-btn"
                      onClick={() => void remove(competition.id)}
                      aria-label={t('admin.competitions.delete')}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {openRegistrations === competition.id ? (
                  <div style={{ marginTop: '0.75rem' }}>
                    {registrationsLoading ? (
                      <Loader2 size={16} className="spin" />
                    ) : registrations.length === 0 ? (
                      <p className="admin-sub">{t('admin.competitions.noRegistrations')}</p>
                    ) : (
                      <ul style={{ margin: 0, paddingLeft: '1rem' }}>
                        {registrations.map((registration) => (
                          <li key={registration.id} style={{ fontSize: '13px' }}>
                            {registration.userName}
                            {registration.userEmail ? ` — ${registration.userEmail}` : ''}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}