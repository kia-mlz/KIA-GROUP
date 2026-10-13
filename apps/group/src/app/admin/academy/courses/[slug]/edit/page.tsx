'use client';

import { useParams, useRouter } from 'next/navigation';
import { Loader2, Pencil, Plus, Save, Trash2, Upload } from 'lucide-react';
import { type ChangeEvent, type FormEvent, useCallback, useEffect, useState } from 'react';
import type { AdminCourse, AdminLesson } from '@kia-group/shared';
import { AdminErrorState, AdminSkeleton } from '@/components/admin/AdminStates';
import { api, ApiError } from '@/lib/api';
import { useLanguage } from '@/context/LanguageProvider';

type LessonDraft = {
  slug: string;
  title: string;
  content: string;
  contentEn: string;
  durationMin: number;
  comingSoon: boolean;
};

const blankLesson = (): LessonDraft => ({
  slug: '',
  title: '',
  content: '',
  contentEn: '',
  durationMin: 10,
  comingSoon: false,
});

function toMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export default function AdminEditCoursePage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const { t } = useLanguage();
  const courseSlug = decodeURIComponent(params.slug);
  const [course, setCourse] = useState<AdminCourse | null>(null);
  const [draft, setDraft] = useState({
    slug: '',
    title: '',
    description: '',
    descriptionEn: '',
    icon: '',
    trackKey: '',
    published: true,
    comingSoon: false,
  });
  const [newLesson, setNewLesson] = useState<LessonDraft>(blankLesson);
  const [editingLesson, setEditingLesson] = useState<AdminLesson | null>(null);
  const [lessonDraft, setLessonDraft] = useState<LessonDraft>(blankLesson);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingLesson, setAddingLesson] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const hydrate = useCallback((value: AdminCourse) => {
    setCourse(value);
    setDraft({
      slug: value.slug,
      title: value.title,
      description: value.description,
      descriptionEn: value.descriptionEn ?? '',
      icon: value.icon,
      trackKey: value.trackKey ?? '',
      published: value.published,
      comingSoon: value.comingSoon,
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const found = (await api.adminListCourses()).find((item) => item.slug === courseSlug);
      if (!found) throw new ApiError('دورهٔ مورد نظر پیدا نشد.', 404);
      hydrate(found);
    } catch (loadError) {
      setError(toMessage(loadError, 'بارگذاری دوره ناموفق بود.'));
    } finally {
      setLoading(false);
    }
  }, [courseSlug, hydrate]);

  useEffect(() => { void load(); }, [load]);

  const saveCourse = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!course) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const updated = await api.adminUpdateCourse(course.slug, {
        ...draft,
        descriptionEn: draft.descriptionEn.trim() || undefined,
        trackKey: draft.trackKey.trim() || undefined,
      });
      hydrate(updated);
      setNotice('تغییرات دوره با موفقیت ذخیره شد.');
      if (updated.slug !== courseSlug) router.replace(`/admin/academy/courses/${updated.slug}/edit`);
    } catch (saveError) {
      setError(toMessage(saveError, 'ذخیرهٔ تغییرات دوره ناموفق بود.'));
    } finally {
      setSaving(false);
    }
  };

  const addLesson = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!course) return;
    setAddingLesson(true);
    setError('');
    setNotice('');
    try {
      await api.adminCreateLesson(course.slug, newLesson);
      setNewLesson(blankLesson());
      setNotice('جلسهٔ جدید اضافه شد.');
      await load();
    } catch (lessonError) {
      setError(toMessage(lessonError, 'افزودن جلسه ناموفق بود.'));
    } finally {
      setAddingLesson(false);
    }
  };

  const updateLesson = async (lesson: AdminLesson, change: Partial<LessonDraft>) => {
    if (!course) return;
    setError('');
    try {
      await api.adminUpdateLesson(course.slug, lesson.slug, change);
      setNotice('جلسه ذخیره شد.');
      await load();
    } catch (lessonError) {
      setError(toMessage(lessonError, 'ذخیرهٔ جلسه ناموفق بود.'));
    }
  };

  const saveLesson = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!course || !editingLesson) return;
    setError('');
    try {
      await api.adminUpdateLesson(course.slug, editingLesson.slug, lessonDraft);
      setEditingLesson(null);
      setNotice('تغییرات جلسه ذخیره شد.');
      await load();
    } catch (lessonError) {
      setError(toMessage(lessonError, 'ذخیرهٔ جلسه ناموفق بود.'));
    }
  };

  const deleteLesson = async (lesson: AdminLesson) => {
    if (!course || !window.confirm(`جلسه «${lesson.title}» حذف شود؟ این عمل قابل بازگشت نیست.`)) return;
    setError('');
    try {
      await api.adminDeleteLesson(course.slug, lesson.slug);
      setNotice('جلسه حذف شد.');
      await load();
    } catch (lessonError) {
      setError(toMessage(lessonError, 'حذف جلسه ناموفق بود.'));
    }
  };

  const uploadVideo = async (lesson: AdminLesson, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!course || !file) return;
    setError('');
    try {
      await api.adminUploadLessonVideo(course.slug, lesson.slug, file);
      setNotice(`ویدئوی «${lesson.title}» بارگذاری شد.`);
      await load();
    } catch (uploadError) {
      setError(toMessage(uploadError, 'بارگذاری ویدئو ناموفق بود.'));
    } finally {
      event.target.value = '';
    }
  };

  if (loading) return <div className="admin-content"><AdminSkeleton className="admin-skeleton-row" /></div>;
  if (error && !course) return <div className="admin-content"><AdminErrorState message={error} onRetry={load} /></div>;
  if (!course) return null;

  return (
    <div className="admin-content">
      <div className="admin-header-row">
        <div>
          <h1>ویرایش دوره</h1>
          <p className="admin-sub">اطلاعات دوره، وضعیت انتشار و جلسات را از اینجا مدیریت کنید.</p>
        </div>
      </div>

      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {notice ? <p className="admin-notice" role="status">{notice}</p> : null}

      <form className="admin-form" onSubmit={saveCourse}>
        <div className="admin-form-row">
          <label className="form-field"><span>عنوان دوره</span><input required value={draft.title} onChange={(e) => setDraft((value) => ({ ...value, title: e.target.value }))} /></label>
          <label className="form-field"><span>نامک (Slug)</span><input required dir="ltr" value={draft.slug} onChange={(e) => setDraft((value) => ({ ...value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))} /></label>
        </div>
        <div className="admin-form-row admin-language-pair">
          <label className="form-field"><span>{t('admin.courses.field.description')}</span><textarea className="admin-textarea" rows={5} required value={draft.description} onChange={(e) => setDraft((value) => ({ ...value, description: e.target.value }))} /></label>
          <label className="form-field admin-language-field" dir="ltr"><span>{t('admin.courses.field.descriptionEn')}</span><textarea className="admin-textarea" rows={5} value={draft.descriptionEn} onChange={(e) => setDraft((value) => ({ ...value, descriptionEn: e.target.value }))} placeholder="Write the English course description…" /></label>
        </div>
        <div className="admin-form-row">
          <label className="form-field"><span>آیکن</span><input value={draft.icon} onChange={(e) => setDraft((value) => ({ ...value, icon: e.target.value }))} /></label>
          <label className="form-field"><span>مسیر آموزشی</span><input value={draft.trackKey} onChange={(e) => setDraft((value) => ({ ...value, trackKey: e.target.value }))} /></label>
        </div>
        <div className="admin-form-actions">
          <label className="admin-checkbox"><input type="checkbox" checked={draft.published} onChange={(e) => setDraft((value) => ({ ...value, published: e.target.checked }))} /> منتشر شده</label>
          <label className="admin-checkbox"><input type="checkbox" checked={draft.comingSoon} onChange={(e) => setDraft((value) => ({ ...value, comingSoon: e.target.checked }))} /> به‌زودی</label>
          <button type="submit" className="cta-primary" disabled={saving}>{saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />} {saving ? 'در حال ذخیره…' : 'ذخیرهٔ دوره'}</button>
        </div>
      </form>

      <section className="admin-card admin-course-lessons" aria-labelledby="course-lessons-heading">
        <h2 id="course-lessons-heading">جلسات دوره</h2>
        <p className="admin-sub">ویدئوی هر جلسه را بارگذاری و ترتیبِ نمایش را در بخش ویرایش همان جلسه حفظ کنید.</p>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>جلسه</th><th>مدت</th><th>ویدئو</th><th>وضعیت</th><th>عملیات</th></tr></thead>
            <tbody>
              {(course.lessons ?? []).map((lesson) => (
                <tr key={lesson.id}>
                  <td><strong>{lesson.title}</strong><br /><code dir="ltr">{lesson.slug}</code></td>
                  <td>{lesson.durationMin} دقیقه</td>
                  <td>{lesson.videoUrl ? <a className="admin-link" href={lesson.videoUrl} target="_blank" rel="noreferrer">مشاهده</a> : 'بدون ویدئو'}</td>
                  <td><span className={`admin-badge${lesson.comingSoon ? ' soon' : ' ok'}`}>{lesson.comingSoon ? 'به‌زودی' : 'فعال'}</span></td>
                  <td className="admin-actions">
                    <label className="admin-link admin-file-action"><Upload size={14} /> بارگذاری<input type="file" accept="video/*" onChange={(event) => void uploadVideo(lesson, event)} /></label>
                    <button type="button" className="admin-link" onClick={() => { setEditingLesson(lesson); setLessonDraft({ slug: lesson.slug, title: lesson.title, content: lesson.content, contentEn: lesson.contentEn ?? '', durationMin: lesson.durationMin, comingSoon: lesson.comingSoon }); }}><Pencil size={14} /> ویرایش</button>
                    <button type="button" className="admin-link" onClick={() => void updateLesson(lesson, { comingSoon: !lesson.comingSoon })}>{lesson.comingSoon ? 'فعال‌سازی' : 'به‌زودی'}</button>
                    <button type="button" className="admin-link danger" onClick={() => void deleteLesson(lesson)}><Trash2 size={14} /> حذف</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(course.lessons ?? []).length === 0 ? <p className="admin-sub">هنوز جلسه‌ای برای این دوره ثبت نشده است.</p> : null}

        {editingLesson ? (
          <form className="admin-inline-form" onSubmit={saveLesson}>
            <h3><Pencil size={18} aria-hidden /> ویرایش جلسه: {editingLesson.title}</h3>
            <div className="admin-form-grid">
              <label className="form-field"><span>عنوان</span><input required value={lessonDraft.title} onChange={(e) => setLessonDraft((value) => ({ ...value, title: e.target.value }))} /></label>
              <label className="form-field"><span>نامک</span><input required dir="ltr" value={lessonDraft.slug} onChange={(e) => setLessonDraft((value) => ({ ...value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))} /></label>
              <label className="form-field"><span>مدت (دقیقه)</span><input required min="1" type="number" value={lessonDraft.durationMin} onChange={(e) => setLessonDraft((value) => ({ ...value, durationMin: Number(e.target.value) }))} /></label>
            </div>
            <div className="admin-language-pair admin-form-row">
              <label className="form-field"><span>{t('admin.courses.contentMarkdown')}</span><textarea required className="admin-textarea" rows={7} value={lessonDraft.content} onChange={(e) => setLessonDraft((value) => ({ ...value, content: e.target.value }))} /></label>
              <label className="form-field admin-language-field" dir="ltr"><span>{t('admin.courses.contentMarkdownEn')}</span><textarea className="admin-textarea" rows={7} value={lessonDraft.contentEn} onChange={(e) => setLessonDraft((value) => ({ ...value, contentEn: e.target.value }))} placeholder="Write the English lesson content…" /></label>
            </div>
            <div className="admin-form-actions"><label className="admin-checkbox"><input type="checkbox" checked={lessonDraft.comingSoon} onChange={(e) => setLessonDraft((value) => ({ ...value, comingSoon: e.target.checked }))} /> به‌زودی</label><button type="button" className="admin-link" onClick={() => setEditingLesson(null)}>انصراف</button><button type="submit" className="cta-primary"><Save size={16} /> ذخیرهٔ جلسه</button></div>
          </form>
        ) : null}

        <form className="admin-inline-form" onSubmit={addLesson}>
          <h3><Plus size={18} aria-hidden /> افزودن جلسه</h3>
          <div className="admin-form-grid">
            <label className="form-field"><span>عنوان</span><input required value={newLesson.title} onChange={(e) => setNewLesson((value) => ({ ...value, title: e.target.value }))} /></label>
            <label className="form-field"><span>نامک</span><input required dir="ltr" value={newLesson.slug} onChange={(e) => setNewLesson((value) => ({ ...value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))} /></label>
            <label className="form-field"><span>مدت (دقیقه)</span><input required min="1" type="number" value={newLesson.durationMin} onChange={(e) => setNewLesson((value) => ({ ...value, durationMin: Number(e.target.value) }))} /></label>
          </div>
          <div className="admin-language-pair admin-form-row">
            <label className="form-field"><span>{t('admin.courses.contentMarkdown')}</span><textarea required className="admin-textarea" rows={6} value={newLesson.content} onChange={(e) => setNewLesson((value) => ({ ...value, content: e.target.value }))} /></label>
            <label className="form-field admin-language-field" dir="ltr"><span>{t('admin.courses.contentMarkdownEn')}</span><textarea className="admin-textarea" rows={6} value={newLesson.contentEn} onChange={(e) => setNewLesson((value) => ({ ...value, contentEn: e.target.value }))} placeholder="Write the English lesson content…" /></label>
          </div>
          <div className="admin-form-actions"><label className="admin-checkbox"><input type="checkbox" checked={newLesson.comingSoon} onChange={(e) => setNewLesson((value) => ({ ...value, comingSoon: e.target.checked }))} /> به‌زودی</label><button type="submit" className="cta-primary" disabled={addingLesson}>{addingLesson ? <Loader2 className="spin" size={16} /> : <Plus size={16} />} {addingLesson ? 'در حال افزودن…' : 'افزودن جلسه'}</button></div>
        </form>
      </section>
    </div>
  );
}
