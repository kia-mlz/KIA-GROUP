'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { useLanguage } from '@/context/LanguageProvider';
import { api, ApiError } from '@/lib/api';

export default function AdminNewCoursePage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [icon, setIcon] = useState('📘');
  const [trackKey, setTrackKey] = useState('');
  const [published, setPublished] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const course = await api.adminCreateCourse({
        slug,
        title,
        description,
        descriptionEn: descriptionEn.trim() || undefined,
        icon,
        trackKey: trackKey || undefined,
        published,
      });
      router.push(`/admin/academy/courses/${course.slug}/edit`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.courses.createError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-content">
      <h1>{t('admin.courses.newTitle')}</h1>
      <p className="admin-sub">{t('admin.courses.newSub')}</p>

      <form className="admin-form" onSubmit={handleSubmit}>
        <label className="form-field">
          <span>{t('admin.courses.field.slug')}</span>
          <input
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
            placeholder={t('admin.courses.placeholder.slug')}
          />
        </label>
        <label className="form-field">
          <span>{t('admin.courses.field.title')}</span>
          <input required value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <div className="admin-form-row admin-language-pair">
          <label className="form-field">
            <span>{t('admin.courses.field.description')}</span>
            <textarea className="admin-textarea" required rows={5} value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <label className="form-field admin-language-field" dir="ltr">
            <span>{t('admin.courses.field.descriptionEn')}</span>
            <textarea className="admin-textarea" rows={5} value={descriptionEn} onChange={(e) => setDescriptionEn(e.target.value)} placeholder="Write the English course description…" />
          </label>
        </div>
        <div className="admin-form-row">
          <label className="form-field">
            <span>{t('admin.courses.field.icon')}</span>
            <input value={icon} onChange={(e) => setIcon(e.target.value)} />
          </label>
          <label className="form-field">
            <span>{t('admin.courses.field.trackKey')}</span>
            <input
              value={trackKey}
              onChange={(e) => setTrackKey(e.target.value)}
              placeholder={t('admin.courses.placeholder.track')}
            />
          </label>
        </div>
        <label className="admin-checkbox">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
          />
          {t('common.published')}
        </label>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="cta-primary" disabled={submitting}>
          {submitting ? t('admin.courses.creating') : t('admin.courses.create')}
        </button>
      </form>
    </div>
  );
}
