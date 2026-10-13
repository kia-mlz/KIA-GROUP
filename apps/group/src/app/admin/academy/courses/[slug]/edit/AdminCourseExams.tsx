'use client';

import type {
  AdminCourseExam,
  AdminLesson,
  CourseExamKind,
} from '@kia-group/shared';
import { Loader2, Plus, Trash2 } from 'lucide-react';
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

function emptyFormState(): ExamFormState {
  return {
    title: '',
    description: '',
    kind: 'FINAL',
    afterLessonId: '',
    passScore: 60,
    durationMin: 15,
    published: false,
    questions: [],
  };
}

export default function AdminCourseExams({ courseSlug, lessons }: {
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

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyFormState());
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
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
      published: form.published,
      questions: form.questions.map((q) => ({
        id: q.id,
        type: q.type,
        prompt: q.prompt,
        options: q.options.filter((o) => o.label.trim() !== ''),
        answer: q.type === 'single_choice' ? (q.answer[0] ?? '') : q.answer,
        points: q.points,
      })),
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
    <section className="admin-section">
      <h2>{t('admin.courses.exams.heading', { count: exams.length })}</h2>
      {loadError && <p className="form-error">{loadError}</p>}

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
                    <th>{t('common.published')}</th>
                    <th>{t('admin.courses.col.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {exams.map((exam) => (
                    <tr key={exam.id}>
                      <td>{exam.title}</td>
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
                      <td>
                        <span className={`admin-badge${exam.published ? ' ok' : ''}`}>
                          {exam.published ? t('common.yes') : t('common.no')}
                        </span>
                      </td>
                      <td className="admin-actions">
                        <button type="button" className="admin-link" onClick={() => startEdit(exam)}>
                          {t('common.edit')}
                        </button>
                        <button
                          type="button"
                          className="admin-link danger"
                          onClick={() => void handleDelete(exam)}
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
          {exams.length === 0 && <p className="admin-sub">{t('admin.courses.exams.empty')}</p>}

          {!form && (
            <button type="button" className="btn-outline-full" onClick={startCreate}>
              <Plus size={16} /> {t('admin.courses.exams.new')}
            </button>
          )}

            {form && (
              <form className="admin-form" onSubmit={handleSubmit}>
                <h3>
                  {editingId
                    ? t('admin.courses.exams.editTitle')
                    : t('admin.courses.exams.newTitle')}
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
                    <span>{t('admin.courses.field.description')}</span>
                    <input
                      value={form.description}
                      onChange={(e) => patchForm({ description: e.target.value })}
                    />
                  </label>
                </div>
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
                          <option value="multi_choice">
                            {t('admin.courses.exams.typeMulti')}
                          </option>
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
                {saved && <p className="form-success">{saved}</p>}
                <div className="admin-form-actions">
                  <button type="submit" className="btn-next" disabled={busy}>
                    {busy ? <Loader2 size={16} className="spin" /> : null}
                    {editingId ? t('admin.courses.exams.update') : t('admin.courses.exams.create')}
                  </button>
                  <button type="button" className="btn-outline-full" onClick={cancelEdit}>
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


