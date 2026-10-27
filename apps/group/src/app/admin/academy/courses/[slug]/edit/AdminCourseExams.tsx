'use client';

import type {
  AdminCourseExam,
  AdminLesson,
  CourseExamKind,
  CourseExamQuestion,
} from '@kia./shared';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useLanguage } from '@/context/LanguageProvider';

interface ExamFormState {
  title: string;
  description: string;
  kind: CourseExamKind;
  afterLessonId: string;
  passScore: number;
  durationMin: number;
  maxAttempts: number;
  published: boolean;
  questions: QuestionFormState[];
}

interface QuestionFormState {
  id: string;
  type: 'single_choice' | 'multi_choice';
  prompt: string;
  options: { id: string; label: string }[];
  answer: string[];
  points: number;
}

function emptyQuestion(): QuestionFormState {
  return {
    id: `q-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    type: 'single_choice',
    prompt: '',
    options: [
      { id: 'a', label: '' },
      { id: 'b', label: '' },
    ],
    answer: [],
    points: 1,
  };
}

function toFormState(exam: AdminCourseExam): ExamFormState {
  return {
    title: exam.title,
    description: exam.description,
    kind: exam.kind,
    afterLessonId: exam.afterLessonId ?? '',
    passScore: exam.passScore,
    durationMin: exam.durationMin,
    maxAttempts: exam.maxAttempts,
    published: exam.published,
    questions: exam.questions.map((q) => ({
      id: q.id,
      type: q.type,
      prompt: q.prompt,
      options: q.options.map((o) => ({ ...o })),
      answer: Array.isArray(q.answer) ? [...q.answer] : [q.answer],
      points: q.points ?? 1,
    })),
  };
}

function emptyFormState(kind: CourseExamKind = 'MIDTERM'): ExamFormState {
  return {
    title: '',
    description: '',
    kind,
    afterLessonId: '',
    passScore: 60,
    durationMin: 15,
    maxAttempts: 2,
    published: false,
    questions: [emptyQuestion()],
  };
}

function toQuestionPayload(q: QuestionFormState): CourseExamQuestion {
  const options = q.options.filter((o) => o.label.trim() !== '');
  return {
    id: q.id,
    type: q.type,
    prompt: q.prompt,
    options,
    answer: q.type === 'single_choice' ? (q.answer[0] ?? '') : q.answer,
    points: q.points,
  };
}

export default function AdminCourseExams({
  courseSlug,
  lessons,
}: {
  courseSlug: string;
  lessons: AdminLesson[];
}) {
  const { t, format } = useLanguage();
  const [exams, setExams] = useState<AdminCourseExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ExamFormState | null>(null);
  const [busy, setBusy] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  const load = useCallback(async () => {
    setLoadError('');
    try {
      setExams(await api.adminListCourseExams(courseSlug));
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : t('admin.courses.exams.loadError'));
    } finally {
      setLoading(false);
    }
  }, [courseSlug, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const startCreate = (kind: CourseExamKind = 'MIDTERM') => {
    setEditingId(null);
    setForm(emptyFormState(kind));
    setError('');
    setSaved('');
  };

  const startEdit = (exam: AdminCourseExam) => {
    setEditingId(exam.id);
    setForm(toFormState(exam));
    setError('');
    setSaved('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(null);
    setError('');
  };

  const patchForm = (patch: Partial<ExamFormState>) => {
    setForm((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const patchQuestion = (idx: number, patch: Partial<QuestionFormState>) => {
    setForm((prev) => {
      if (!prev) return prev;
      const questions = prev.questions.map((q, i) => (i === idx ? { ...q, ...patch } : q));
      return { ...prev, questions };
    });
  };

  const addQuestion = () => {
    setForm((prev) => (prev ? { ...prev, questions: [...prev.questions, emptyQuestion()] } : prev));
  };

  const removeQuestion = (idx: number) => {
    setForm((prev) => {
      if (!prev) return prev;
      return { ...prev, questions: prev.questions.filter((_, i) => i !== idx) };
    });
  };

  const handleDelete = async (exam: AdminCourseExam) => {
    if (!confirm(t('admin.courses.exams.deleteConfirm', { title: exam.title }))) return;
    setError('');
    try {
      await api.adminDeleteCourseExam(courseSlug, exam.id);
      if (editingId === exam.id) cancelEdit();
      await load();
      setSaved(t('admin.courses.exams.deleted'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.courses.exams.deleteError'));
    }
  };

  const handleTogglePublished = async (exam: AdminCourseExam) => {
    setTogglingId(exam.id);
    setError('');
    try {
      await api.adminUpdateCourseExam(courseSlug, exam.id, { published: !exam.published });
      setSaved(
        exam.published
          ? t('admin.courses.exams.unpublished')
          : t('admin.courses.exams.publishedNotice'),
      );
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.courses.exams.saveError'));
    } finally {
      setTogglingId(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    if (form.questions.length === 0) {
      setError(t('admin.courses.exams.questionsRequired'));
      return;
    }
    for (const q of form.questions) {
      const options = q.options.filter((o) => o.label.trim() !== '');
      if (options.length < 2) {
        setError(t('admin.courses.exams.optionsMin'));
        return;
      }
      if (q.answer.length === 0 || !q.answer.every((id) => options.some((o) => o.id === id))) {
        setError(t('admin.courses.exams.answerRequired'));
        return;
      }
    }
    setBusy(true);
    setError('');
    setSaved('');
    const payload = {
      title: form.title,
      description: form.description || undefined,
      kind: form.kind,
      afterLessonId: form.afterLessonId || null,
      passScore: form.passScore,
      durationMin: form.durationMin,
      maxAttempts: form.maxAttempts,
      published: form.published,
      questions: form.questions.map(toQuestionPayload),
    };
    try {
      if (editingId) {
        await api.adminUpdateCourseExam(courseSlug, editingId, payload);
        setSaved(t('admin.courses.exams.updated'));
      } else {
        await api.adminCreateCourseExam(courseSlug, payload);
        setSaved(t('admin.courses.exams.created'));
      }
      setForm(null);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.courses.exams.saveError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="admin-card admin-course-exams" aria-labelledby="course-exams-heading">
      <h2 id="course-exams-heading">{t('admin.courses.exams.heading', { count: exams.length })}</h2>
      <p className="admin-sub">{t('admin.courses.exams.sub')}</p>
      {loadError && <p className="form-error">{loadError}</p>}
      {error && !form && <p className="form-error">{error}</p>}
      {saved && !form && (
        <p className="admin-notice" role="status">
          {saved}
        </p>
      )}

      {loading ? (
        <p className="auth-loading">
          <Loader2 size={20} className="spin" />
        </p>
      ) : (
        <>
          {exams.length > 0 && (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t('admin.courses.col.title')}</th>
                    <th>{t('admin.courses.exams.colKind')}</th>
                    <th>{t('admin.courses.exams.colPlacement')}</th>
                    <th>{t('admin.courses.exams.colQuestions')}</th>
                    <th>{t('admin.courses.exams.colAttempts')}</th>
                    <th>{t('common.published')}</th>
                    <th>{t('admin.courses.col.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {exams.map((exam) => (
                    <tr key={exam.id}>
                      <td>
                        <strong>{exam.title}</strong>
                      </td>
                      <td>
                        <span className={`admin-badge${exam.kind === 'MIDTERM' ? '' : ' ok'}`}>
                          {exam.kind === 'MIDTERM'
                            ? t('admin.courses.exams.kindMidterm')
                            : t('admin.courses.exams.kindFinal')}
                        </span>
                      </td>
                      <td>
                        {exam.afterLessonSlug
                          ? t('admin.courses.exams.afterLesson', { lesson: exam.afterLessonSlug })
                          : t('admin.courses.exams.endOfCourse')}
                      </td>
                      <td>{format.number(exam.questions.length)}</td>
                      <td>{format.number(exam.maxAttempts)}</td>
                      <td>
                        <span className={`admin-badge${exam.published ? ' ok' : ''}`}>
                          {exam.published ? t('common.yes') : t('common.no')}
                        </span>
                      </td>
                      <td className="admin-actions">
                        <button type="button" className="admin-link" onClick={() => startEdit(exam)}>
                          <Pencil size={14} /> {t('common.edit')}
                        </button>
                        <button
                          type="button"
                          className="admin-link"
                          disabled={togglingId === exam.id}
                          onClick={() => void handleTogglePublished(exam)}
                        >
                          {togglingId === exam.id ? (
                            <Loader2 size={14} className="spin" />
                          ) : exam.published ? (
                            t('admin.courses.exams.unpublish')
                          ) : (
                            t('admin.courses.exams.publish')
                          )}
                        </button>
                        <button
                          type="button"
                          className="admin-link danger"
                          onClick={() => void handleDelete(exam)}
                        >
                          <Trash2 size={14} /> {t('common.delete')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {exams.length === 0 && <p className="admin-sub">{t('admin.courses.exams.empty')}</p>}

          {!form && (
            <div className="admin-form-actions" style={{ marginTop: '1rem' }}>
              <button type="button" className="cta-primary" onClick={() => startCreate('MIDTERM')}>
                <Plus size={16} /> {t('admin.courses.exams.newMidterm')}
              </button>
              <button type="button" className="cta-primary" onClick={() => startCreate('FINAL')}>
                <Plus size={16} /> {t('admin.courses.exams.newFinal')}
              </button>
            </div>
          )}

          {form && (
            <form className="admin-inline-form" onSubmit={handleSubmit}>
              <h3>
                {editingId
                  ? t('admin.courses.exams.editTitle')
                  : form.kind === 'MIDTERM'
                    ? t('admin.courses.exams.newMidtermTitle')
                    : t('admin.courses.exams.newFinalTitle')}
              </h3>
              <div className="admin-form-row">
                <label className="form-field">
                  <span>{t('admin.courses.field.title')}</span>
                  <input
                    required
                    value={form.title}
                    onChange={(e) => patchForm({ title: e.target.value })}
                  />
                </label>
                <label className="form-field">
                  <span>{t('admin.courses.exams.kind')}</span>
                  <select
                    value={form.kind}
                    onChange={(e) => patchForm({ kind: e.target.value as CourseExamKind })}
                  >
                    <option value="MIDTERM">{t('admin.courses.exams.kindMidterm')}</option>
                    <option value="FINAL">{t('admin.courses.exams.kindFinal')}</option>
                  </select>
                </label>
                <label className="form-field">
                  <span>{t('admin.courses.exams.placement')}</span>
                  <select
                    value={form.afterLessonId}
                    onChange={(e) => patchForm({ afterLessonId: e.target.value })}
                  >
                    <option value="">{t('admin.courses.exams.endOfCourse')}</option>
                    {lessons.map((lesson) => (
                      <option key={lesson.id} value={lesson.id}>
                        {lesson.title}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="admin-form-row">
                <label className="form-field">
                  <span>{t('admin.courses.exams.passScore')}</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.passScore}
                    onChange={(e) => patchForm({ passScore: Number(e.target.value) })}
                  />
                </label>
                <label className="form-field">
                  <span>{t('admin.courses.exams.durationMin')}</span>
                  <input
                    type="number"
                    min={1}
                    max={240}
                    value={form.durationMin}
                    onChange={(e) => patchForm({ durationMin: Number(e.target.value) })}
                  />
                </label>
                <label className="form-field">
                  <span>{t('admin.courses.exams.maxAttempts')}</span>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={form.maxAttempts}
                    onChange={(e) => patchForm({ maxAttempts: Number(e.target.value) })}
                  />
                </label>
              </div>
              <label className="form-field">
                <span>{t('admin.courses.field.description')}</span>
                <input
                  value={form.description}
                  onChange={(e) => patchForm({ description: e.target.value })}
                />
              </label>
              <label className="admin-checkbox">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => patchForm({ published: e.target.checked })}
                />
                {t('common.published')}
              </label>

              <h4>{t('admin.courses.exams.questionsHeading', { count: form.questions.length })}</h4>
              {form.questions.map((q, idx) => (
                <div key={q.id} className="admin-video-block">
                  <div className="admin-form-row">
                    <label className="form-field">
                      <span>{t('admin.courses.exams.questionType')}</span>
                      <select
                        value={q.type}
                        onChange={(e) =>
                          patchQuestion(idx, {
                            type: e.target.value as QuestionFormState['type'],
                            answer: [],
                          })
                        }
                      >
                        <option value="single_choice">
                          {t('admin.courses.exams.typeSingle')}
                        </option>
                        <option value="multi_choice">{t('admin.courses.exams.typeMulti')}</option>
                      </select>
                    </label>
                    <label className="form-field">
                      <span>{t('admin.courses.exams.points')}</span>
                      <input
                        type="number"
                        min={1}
                        value={q.points}
                        onChange={(e) => patchQuestion(idx, { points: Number(e.target.value) })}
                      />
                    </label>
                    <div className="form-field" style={{ alignSelf: 'end' }}>
                      <button
                        type="button"
                        className="admin-link danger"
                        onClick={() => removeQuestion(idx)}
                        disabled={form.questions.length <= 1}
                      >
                        <Trash2 size={14} /> {t('common.delete')}
                      </button>
                    </div>
                  </div>
                  <label className="form-field">
                    <span>{t('admin.courses.exams.prompt')}</span>
                    <textarea
                      className="admin-textarea"
                      required
                      rows={3}
                      value={q.prompt}
                      onChange={(e) => patchQuestion(idx, { prompt: e.target.value })}
                    />
                  </label>
                  <p className="admin-sub">{t('admin.courses.exams.optionsHint')}</p>
                  {q.options.map((opt, optIdx) => (
                    <div
                      key={opt.id}
                      className="admin-form-row"
                      style={{ alignItems: 'center' }}
                    >
                      <label className="admin-checkbox">
                        <input
                          type={q.type === 'single_choice' ? 'radio' : 'checkbox'}
                          name={`correct-${q.id}`}
                          checked={q.answer.includes(opt.id)}
                          onChange={() => {
                            if (q.type === 'single_choice') {
                              patchQuestion(idx, { answer: [opt.id] });
                            } else {
                              patchQuestion(idx, {
                                answer: q.answer.includes(opt.id)
                                  ? q.answer.filter((a) => a !== opt.id)
                                  : [...q.answer, opt.id],
                              });
                            }
                          }}
                        />
                      </label>
                      <input
                        style={{ flex: 1 }}
                        required
                        value={opt.label}
                        placeholder={t('admin.courses.exams.optionLabel', { n: optIdx + 1 })}
                        onChange={(e) =>
                          patchQuestion(idx, {
                            options: q.options.map((o, i) =>
                              i === optIdx ? { ...o, label: e.target.value } : o,
                            ),
                          })
                        }
                      />
                      <button
                        type="button"
                        className="admin-link danger"
                        onClick={() =>
                          patchQuestion(idx, {
                            options: q.options.filter((_, i) => i !== optIdx),
                            answer: q.answer.filter((a) => a !== opt.id),
                          })
                        }
                        disabled={q.options.length <= 2}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {q.options.length < 8 && (
                    <button
                      type="button"
                      className="admin-link"
                      onClick={() =>
                        patchQuestion(idx, {
                          options: [
                            ...q.options,
                            {
                              id: `${String.fromCharCode(97 + q.options.length)}${Date.now()}`,
                              label: '',
                            },
                          ],
                        })
                      }
                    >
                      <Plus size={14} /> {t('admin.courses.exams.addOption')}
                    </button>
                  )}
                </div>
              ))}
              <button type="button" className="admin-link" onClick={addQuestion}>
                <Plus size={14} /> {t('admin.courses.exams.addQuestion')}
              </button>

              {error && <p className="form-error">{error}</p>}
              {saved && <p className="admin-notice">{saved}</p>}
              <div className="admin-form-actions">
                <button type="submit" className="cta-primary" disabled={busy}>
                  {busy ? <Loader2 size={16} className="spin" /> : null}
                  {editingId ? t('admin.courses.exams.update') : t('admin.courses.exams.create')}
                </button>
                <button type="button" className="admin-link" onClick={cancelEdit}>
                  {t('admin.courses.cancelLessonEdit')}
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </section>
  );
}
