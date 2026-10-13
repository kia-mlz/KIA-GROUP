'use client';

import { useParams } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Loader2, Trash2, Upload } from 'lucide-react';
import { useLanguage } from '@/context/LanguageProvider';
import { api, ApiError } from '@/lib/api';
import type { AdminCourse, AdminLesson } from '@kia-group/shared';
import { mediaUrl } from '@/lib/mediaUrl';
import AdminCourseExams from './AdminCourseExams';

const LESSON_VIDEO_PATH_RE = /^\/uploads\/lessons\/[a-z0-9/_-]+\.(mp4|webm|ogg|mov|m4v)$/i;

function sanitizeLessonVideoPath(path: string | null | undefined): string | null {
  if (!path) return null;
  return LESSON_VIDEO_PATH_RE.test(path) ? path : null;
}

export default function AdminEditCoursePage() {
  const params = useParams();
  const slug = params.slug as string;
  const { t, format } = useLanguage();

  const [course, setCourse] = useState<AdminCourse | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('');
  const [trackKey, setTrackKey] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [published, setPublished] = useState(true);
  const [comingSoon, setComingSoon] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  const [editingLesson, setEditingLesson] = useState<AdminLesson | null>(null);
  const [lessonSlug, setLessonSlug] = useState('');
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonContent, setLessonContent] = useState('');
  const [lessonDuration, setLessonDuration] = useState(10);
  const [lessonSortOrder, setLessonSortOrder] = useState(0);
  const [lessonComingSoon, setLessonComingSoon] = useState(false);
  const [lessonVideoFile, setLessonVideoFile] = useState<File | null>(null);
  const [lessonVideoUrl, setLessonVideoUrl] = useState<string | null>(null);
  const [lessonSubmitting, setLessonSubmitting] = useState(false);
  const [videoBusy, setVideoBusy] = useState(false);
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!lessonVideoFile) {
      setPreviewObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(lessonVideoFile);
    setPreviewObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [lessonVideoFile]);

  const loadCourse = useCallback(async () => {
    const courses = await api.adminListCourses();
    const found = courses.find((c) => c.slug === slug);
    if (!found) throw new ApiError(t('admin.courses.notFound'), 404);
    setCourse(found);
    setTitle(found.title);
    setDescription(found.description);
    setIcon(found.icon);
    setTrackKey(found.trackKey ?? '');
    setSortOrder(found.sortOrder);
    setPublished(found.published);
    setComingSoon(found.comingSoon);
    return found;
  }, [slug, t]);

  useEffect(() => {
    loadCourse()
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : t('admin.courses.loadCourseError'));
      })
      .finally(() => setLoading(false));
  }, [loadCourse, t]);

  const resetLessonForm = () => {
    setEditingLesson(null);
    setLessonSlug('');
    setLessonTitle('');
    setLessonContent('');
    setLessonDuration(10);
    setLessonSortOrder(0);
    setLessonComingSoon(false);
    setLessonVideoFile(null);
    setLessonVideoUrl(null);
  };

  const startEditLesson = (lesson: AdminLesson) => {
    setEditingLesson(lesson);
    setLessonSlug(lesson.slug);
    setLessonTitle(lesson.title);
    setLessonContent(lesson.content);
    setLessonDuration(lesson.durationMin);
    setLessonSortOrder(lesson.sortOrder);
    setLessonComingSoon(lesson.comingSoon);
    setLessonVideoFile(null);
    setLessonVideoUrl(sanitizeLessonVideoPath(lesson.videoUrl));
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaved('');
    try {
      const updated = await api.adminUpdateCourse(slug, {
        title,
        description,
        icon,
        trackKey: trackKey || undefined,
        sortOrder,
        published,
        comingSoon,
      });
      setCourse(updated);
      setSaved(t('admin.courses.saved'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.courses.saveError'));
    }
  };

  const handleLessonSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLessonSubmitting(true);
    setError('');
    try {
      const payload = {
        slug: lessonSlug,
        title: lessonTitle,
        content: lessonContent,
        durationMin: lessonDuration,
        sortOrder: lessonSortOrder || undefined,
        comingSoon: lessonComingSoon,
      };
      let lesson: AdminLesson;
      if (editingLesson) {
        lesson = await api.adminUpdateLesson(slug, editingLesson.slug, payload);
        setSaved(t('admin.courses.lessonUpdated'));
      } else {
        lesson = await api.adminCreateLesson(slug, payload);
        setSaved(t('admin.courses.lessonAdded'));
      }

      if (lessonVideoFile) {
        lesson = await api.adminUploadLessonVideo(slug, lesson.slug, lessonVideoFile);
        setSaved(t('admin.courses.videoUploaded'));
      }

      const refreshed = await loadCourse();
      const next = refreshed.lessons?.find((l) => l.slug === lesson.slug) ?? lesson;
      if (editingLesson || lessonVideoFile) {
        startEditLesson(next);
        setLessonVideoFile(null);
      } else {
        resetLessonForm();
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : editingLesson
            ? t('admin.courses.updateLessonError')
            : t('admin.courses.addLessonError'),
      );
    } finally {
      setLessonSubmitting(false);
    }
  };

  const handleToggleLessonComingSoon = async (lesson: AdminLesson) => {
    setError('');
    try {
      await api.adminUpdateLesson(slug, lesson.slug, { comingSoon: !lesson.comingSoon });
      await loadCourse();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.courses.updateLessonError'));
    }
  };

  const handleDeleteLesson = async (lesson: AdminLesson) => {
    if (!confirm(t('admin.courses.deleteLessonConfirm', { slug: lesson.slug }))) return;
    setError('');
    try {
      await api.adminDeleteLesson(slug, lesson.slug);
      if (editingLesson?.id === lesson.id) resetLessonForm();
      await loadCourse();
      setSaved(t('admin.courses.lessonDeleted'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.courses.deleteLessonError'));
    }
  };

  const handleRemoveVideo = async () => {
    if (!editingLesson) return;
    if (!confirm(t('admin.courses.deleteVideoConfirm'))) return;
    setVideoBusy(true);
    setError('');
    try {
      const updated = await api.adminDeleteLessonVideo(slug, editingLesson.slug);
      setLessonVideoUrl(null);
      setLessonVideoFile(null);
      setEditingLesson(updated);
      await loadCourse();
      setSaved(t('admin.courses.videoRemoved'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.courses.deleteVideoError'));
    } finally {
      setVideoBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-content auth-loading">
        <Loader2 size={24} className="spin" /> {t('admin.courses.loadingCourse')}
      </div>
    );
  }

  if (!course) {
    return (
      <div className="admin-content">
        <p className="form-error">{error || t('admin.courses.notFound')}</p>
      </div>
    );
  }

  const lessons: AdminLesson[] = course.lessons ?? [];
  const safePreviewObjectUrl =
    previewObjectUrl && previewObjectUrl.startsWith('blob:') ? previewObjectUrl : null;
  const previewSrc = safePreviewObjectUrl ?? mediaUrl(sanitizeLessonVideoPath(lessonVideoUrl));

  return (
    <div className="admin-content">
      <h1>{t('admin.courses.editTitle', { title: course.title })}</h1>
      <p className="admin-sub">
        {t('admin.courses.slugLabel')} <code>{slug}</code>
      </p>

      <form className="admin-form" onSubmit={handleSave}>
        <label className="form-field">
          <span>{t('admin.courses.field.title')}</span>
          <input required value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="form-field">
          <span>{t('admin.courses.field.description')}</span>
          <textarea
            className="admin-textarea"
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <div className="admin-form-row">
          <label className="form-field">
            <span>{t('admin.courses.field.iconShort')}</span>
            <input value={icon} onChange={(e) => setIcon(e.target.value)} />
          </label>
          <label className="form-field">
            <span>{t('admin.courses.field.trackKey')}</span>
            <input value={trackKey} onChange={(e) => setTrackKey(e.target.value)} />
          </label>
          <label className="form-field">
            <span>{t('admin.courses.field.sortOrder')}</span>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
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
        <label className="admin-checkbox">
          <input
            type="checkbox"
            checked={comingSoon}
            onChange={(e) => setComingSoon(e.target.checked)}
          />
          {t('admin.courses.comingSoon')}
        </label>
        {error && <p className="form-error">{error}</p>}
        {saved && <p className="form-success">{saved}</p>}
        <button type="submit" className="cta-primary">
          {t('admin.courses.save')}
        </button>
      </form>

      <section className="admin-section">
        <h2>{t('admin.courses.lessonsHeading', { count: lessons.length })}</h2>
        {lessons.length > 0 && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('admin.courses.col.title')}</th>
                  <th>{t('admin.courses.col.slug')}</th>
                  <th>{t('admin.courses.colDuration')}</th>
                  <th>{t('admin.courses.col.video')}</th>
                  <th>{t('admin.courses.col.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {lessons.map((lesson) => (
                  <tr key={lesson.id}>
                    <td>
                      {lesson.title}
                      {lesson.comingSoon ? (
                        <span className="admin-badge soon">{t('admin.courses.comingSoon')}</span>
                      ) : null}
                    </td>
                    <td>
                      <code>{lesson.slug}</code>
                    </td>
                    <td>{format.durationMinutes(lesson.durationMin)}</td>
                    <td>
                      <span className={`admin-badge${lesson.videoUrl ? ' ok' : ''}`}>
                        {lesson.videoUrl
                          ? t('admin.courses.videoAttached')
                          : t('admin.courses.videoNone')}
                      </span>
                    </td>
                    <td className="admin-actions">
                      <button
                        type="button"
                        className={`admin-link${lesson.comingSoon ? ' active-soon' : ''}`}
                        onClick={() => handleToggleLessonComingSoon(lesson)}
                      >
                        {lesson.comingSoon
                          ? t('admin.courses.comingSoonOff')
                          : t('admin.courses.comingSoon')}
                      </button>
                      <button
                        type="button"
                        className="admin-link"
                        onClick={() => startEditLesson(lesson)}
                      >
                        {t('common.edit')}
                      </button>
                      <button
                        type="button"
                        className="admin-link danger"
                        onClick={() => handleDeleteLesson(lesson)}
                      >
                        {t('common.delete')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h3>
          {editingLesson
            ? t('admin.courses.editLesson', { slug: editingLesson.slug })
            : t('admin.courses.addLesson')}
        </h3>
        <form className="admin-form" onSubmit={handleLessonSubmit}>
          <div className="admin-form-row">
            <label className="form-field">
              <span>{t('admin.courses.lessonSlug')}</span>
              <input
                required
                value={lessonSlug}
                onChange={(e) => setLessonSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
              />
            </label>
            <label className="form-field">
              <span>{t('admin.courses.field.title')}</span>
              <input
                required
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
              />
            </label>
            <label className="form-field">
              <span>{t('admin.courses.duration')}</span>
              <input
                type="number"
                min={1}
                value={lessonDuration}
                onChange={(e) => setLessonDuration(Number(e.target.value))}
              />
            </label>
            <label className="form-field">
              <span>{t('admin.courses.field.sortOrder')}</span>
              <input
                type="number"
                value={lessonSortOrder}
                onChange={(e) => setLessonSortOrder(Number(e.target.value))}
              />
            </label>
          </div>
          <label className="admin-checkbox">
            <input
              type="checkbox"
              checked={lessonComingSoon}
              onChange={(e) => setLessonComingSoon(e.target.checked)}
            />
            {t('admin.courses.comingSoon')}
          </label>
          <label className="form-field">
            <span>{t('admin.courses.contentMarkdown')}</span>
            <textarea
              className="admin-textarea"
              required
              rows={8}
              value={lessonContent}
              onChange={(e) => setLessonContent(e.target.value)}
            />
          </label>

          <div className="admin-video-block">
            <span className="admin-video-label">{t('admin.courses.videoLabel')}</span>
            <p className="admin-sub">{t('admin.courses.videoHint')}</p>
            <label className="admin-file-input">
              <Upload size={16} />
              <span>{t('admin.courses.videoChoose')}</span>
              <input
                type="file"
                accept="video/mp4,video/webm,video/ogg,video/quicktime,.mp4,.webm,.ogg,.mov,.m4v"
                onChange={(e) => setLessonVideoFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {lessonVideoFile && (
              <p className="admin-sub">
                {t('admin.courses.videoSelected', { name: lessonVideoFile.name })}
              </p>
            )}
            {previewSrc && (
              <video className="admin-video-preview" src={previewSrc} controls preload="metadata" />
            )}
            {editingLesson?.videoUrl && !lessonVideoFile && (
              <button
                type="button"
                className="admin-link danger"
                disabled={videoBusy}
                onClick={handleRemoveVideo}
              >
                <Trash2 size={14} />{' '}
                {videoBusy ? t('admin.courses.videoRemoving') : t('admin.courses.videoRemove')}
              </button>
            )}
          </div>

          <div className="admin-form-actions">
            <button type="submit" className="btn-next" disabled={lessonSubmitting}>
              {lessonSubmitting
                ? editingLesson
                  ? t('admin.courses.updatingLesson')
                  : t('admin.courses.adding')
                : editingLesson
                  ? t('admin.courses.updateLesson')
                  : t('admin.courses.addLesson')}
            </button>
            {editingLesson && (
              <button type="button" className="btn-outline-full" onClick={resetLessonForm}>
                {t('admin.courses.cancelLessonEdit')}
              </button>
            )}
          </div>
        </form>
      </section>

      <AdminCourseExams courseSlug={slug} lessons={lessons} />
    </div>
  );
}
