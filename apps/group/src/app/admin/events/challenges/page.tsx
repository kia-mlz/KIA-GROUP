'use client';

import { Loader2, Plus } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageProvider';
import { api, ApiError } from '@/lib/api';
import type { AdminChallenge } from '@kia-group/shared';

const emptyForm = {
  slug: '',
  title: '',
  description: '',
  points: 120,
  startsAt: '',
  endsAt: '',
  active: true,
  starterCode: '',
};

export default function AdminChallengesPage() {
  const { t } = useLanguage();
  const [challenges, setChallenges] = useState<AdminChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    return api
      .adminListChallenges()
      .then(setChallenges)
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : t('admin.challenges.loadError'));
      });
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const startCreate = () => {
    setEditingSlug(null);
    setForm(emptyForm);
  };

  const startEdit = (challenge: AdminChallenge) => {
    setEditingSlug(challenge.slug);
    setForm({
      slug: challenge.slug,
      title: challenge.title,
      description: challenge.description,
      points: challenge.points,
      startsAt: challenge.startsAt.slice(0, 16),
      endsAt: challenge.endsAt.slice(0, 16),
      active: challenge.active,
      starterCode: challenge.starterCode,
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        ...form,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
      };
      if (editingSlug) {
        const { slug: _slug, ...update } = payload;
        await api.adminUpdateChallenge(editingSlug, update);
      } else {
        await api.adminCreateChallenge(payload);
      }
      await load();
      setEditingSlug(null);
      setForm(emptyForm);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.challenges.saveError'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-content auth-loading">
        <Loader2 size={24} className="spin" /> {t('admin.challenges.loading')}
      </div>
    );
  }

  return (
    <div className="admin-content">
      <div className="admin-header-row">
        <div>
          <h1>{t('admin.challenges.title')}</h1>
          <p className="admin-sub">{t('admin.challenges.sub')}</p>
        </div>
        <button type="button" className="btn-next admin-btn" onClick={startCreate}>
          <Plus size={16} /> {t('admin.challenges.new')}
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t('admin.challenges.col.title')}</th>
              <th>{t('admin.challenges.col.slug')}</th>
              <th>{t('admin.challenges.col.points')}</th>
              <th>{t('admin.challenges.col.active')}</th>
              <th>{t('admin.challenges.col.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {challenges.map((challenge) => (
              <tr key={challenge.id}>
                <td>{challenge.title}</td>
                <td>
                  <code>{challenge.slug}</code>
                </td>
                <td>{challenge.points}</td>
                <td>
                  <span className={`admin-badge${challenge.active ? ' ok' : ''}`}>
                    {challenge.active ? t('common.active') : t('common.inactive')}
                  </span>
                </td>
                <td className="admin-actions">
                  <button type="button" className="admin-link" onClick={() => startEdit(challenge)}>
                    {t('common.edit')}
                  </button>
                  <button
                    type="button"
                    className="admin-link danger"
                    onClick={async () => {
                      if (!confirm(t('admin.challenges.deleteConfirm', { slug: challenge.slug }))) {
                        return;
                      }
                      try {
                        await api.adminDeleteChallenge(challenge.slug);
                        if (editingSlug === challenge.slug) {
                          setEditingSlug(null);
                          setForm(emptyForm);
                        }
                        await load();
                      } catch (err) {
                        setError(
                          err instanceof ApiError
                            ? err.message
                            : t('admin.challenges.deleteError'),
                        );
                      }
                    }}
                  >
                    {t('common.delete')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="admin-section">
        <h2>
          {editingSlug
            ? t('admin.challenges.edit', { slug: editingSlug })
            : t('admin.challenges.create')}
        </h2>
        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="admin-form-row">
            <label className="form-field">
              <span>{t('admin.challenges.field.slug')}</span>
              <input
                required
                disabled={!!editingSlug}
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
              />
            </label>
            <label className="form-field">
              <span>{t('admin.challenges.field.title')}</span>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label className="form-field">
              <span>{t('admin.challenges.field.points')}</span>
              <input
                type="number"
                min={1}
                value={form.points}
                onChange={(e) => setForm({ ...form, points: Number(e.target.value) })}
              />
            </label>
          </div>
          <label className="form-field">
            <span>{t('admin.challenges.field.description')}</span>
            <textarea
              className="admin-textarea"
              required
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>
          <div className="admin-form-row">
            <label className="form-field">
              <span>{t('admin.challenges.field.startsAt')}</span>
              <input
                type="datetime-local"
                required
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              />
            </label>
            <label className="form-field">
              <span>{t('admin.challenges.field.endsAt')}</span>
              <input
                type="datetime-local"
                required
                value={form.endsAt}
                onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
              />
            </label>
          </div>
          <label className="form-field">
            <span>{t('admin.challenges.field.starterCode')}</span>
            <textarea
              className="admin-textarea mono"
              dir="ltr"
              rows={6}
              value={form.starterCode}
              onChange={(e) => setForm({ ...form, starterCode: e.target.value })}
            />
          </label>
          <label className="admin-checkbox">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            {t('admin.challenges.field.active')}
          </label>
          <div className="admin-form-actions">
            <button type="submit" className="cta-primary" disabled={submitting}>
              {submitting
                ? t('admin.challenges.saving')
                : editingSlug
                  ? t('admin.challenges.update')
                  : t('admin.challenges.create')}
            </button>
            {editingSlug && (
              <button type="button" className="btn-outline-full" onClick={startCreate}>
                {t('admin.challenges.cancelEdit')}
              </button>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}
