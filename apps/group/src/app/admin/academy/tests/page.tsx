'use client';

import {
  BIG_FIVE_TRAITS,
  EXAM_DOMAINS,
  type AssessmentBank,
  type AssessmentQuestion,
  type ExamQuestion,
  type ExamQuestionType,
  type PersonalityBank,
  type PersonalityItem,
  type ReadinessBank,
  type TestBankId,
  type TestBankPayload,
} from '@kia-group/shared';
import {
  ArrowDown,
  ArrowUp,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useLanguage } from '@/context/LanguageProvider';
import { api, ApiError } from '@/lib/api';

type TabId = TestBankId;

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function moveItem<T>(list: T[], index: number, delta: number): T[] {
  const next = [...list];
  const target = index + delta;
  if (target < 0 || target >= next.length) return list;
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item!);
  return next;
}

export default function AdminTestsPage() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<TabId>('personality');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [personality, setPersonality] = useState<PersonalityBank | null>(null);
  const [assessment, setAssessment] = useState<AssessmentBank | null>(null);
  const [readiness, setReadiness] = useState<ReadinessBank | null>(null);

  const load = useCallback(
    async (id: TabId) => {
      setLoading(true);
      setError('');
      setSuccess('');
      try {
        const payload = await api.adminGetTestBank(id);
        applyPayload(payload);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : t('admin.tests.loadError'));
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  const applyPayload = (payload: TestBankPayload) => {
    if (payload.id === 'personality') setPersonality(payload.bank);
    if (payload.id === 'assessment') setAssessment(payload.bank);
    if (payload.id === 'readiness') setReadiness(payload.bank);
  };

  useEffect(() => {
    void load(tab);
  }, [tab, load]);

  const currentBank = () => {
    if (tab === 'personality') return personality;
    if (tab === 'assessment') return assessment;
    return readiness;
  };

  const save = async () => {
    const bank = currentBank();
    if (!bank) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const saved = await api.adminSaveTestBank(tab, bank);
      applyPayload(saved);
      setSuccess(t('admin.tests.saved'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.tests.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!window.confirm(t('admin.tests.resetConfirm'))) return;
    setSaving(true);
    setError('');
    try {
      const saved = await api.adminResetTestBank(tab);
      applyPayload(saved);
      setSuccess(t('admin.tests.resetDone'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.tests.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: 'personality', label: t('admin.tests.tabs.personality') },
    { id: 'assessment', label: t('admin.tests.tabs.assessment') },
    { id: 'readiness', label: t('admin.tests.tabs.readiness') },
  ];

  return (
    <div className="admin-content">
      <div className="admin-header-row">
        <div>
          <h1>{t('admin.tests.title')}</h1>
          <p className="admin-sub">{t('admin.tests.sub')}</p>
        </div>
        <div className="admin-actions">
          <button type="button" className="btn--secondary admin-btn" onClick={() => void reset()} disabled={saving || loading}>
            <RotateCcw size={14} /> {t('admin.tests.reset')}
          </button>
          <button type="button" className="btn-next admin-btn" onClick={() => void save()} disabled={saving || loading}>
            {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
            {saving ? t('admin.tests.saving') : t('admin.tests.save')}
          </button>
        </div>
      </div>

      <div className="admin-settings-tabs" role="tablist">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={`admin-settings-tab${tab === item.id ? ' active' : ''}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && <p className="form-error">{error}</p>}
      {success && <p className="form-success">{success}</p>}

      {loading || !currentBank() ? (
        <div className="auth-loading">
          <Loader2 size={20} className="spin" /> {t('admin.tests.loading')}
        </div>
      ) : (
        <>
          {tab === 'personality' && personality && (
            <PersonalityEditor bank={personality} onChange={setPersonality} />
          )}
          {tab === 'assessment' && assessment && (
            <AssessmentEditor bank={assessment} onChange={setAssessment} />
          )}
          {tab === 'readiness' && readiness && (
            <ReadinessEditor bank={readiness} onChange={setReadiness} />
          )}
        </>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function LocaleFields({
  label,
  value,
  onChange,
}: {
  label: string;
  value: { fa: string; en: string };
  onChange: (next: { fa: string; en: string }) => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="admin-form-grid">
      <Field label={`${label} (${t('admin.tests.fa')})`}>
        <textarea
          className="admin-textarea"
          rows={2}
          value={value.fa}
          onChange={(e) => onChange({ ...value, fa: e.target.value })}
        />
      </Field>
      <Field label={`${label} (${t('admin.tests.en')})`}>
        <textarea
          className="admin-textarea"
          rows={2}
          value={value.en}
          onChange={(e) => onChange({ ...value, en: e.target.value })}
        />
      </Field>
    </div>
  );
}

function QuestionToolbar({
  index,
  total,
  onMove,
  onRemove,
}: {
  index: number;
  total: number;
  onMove: (delta: number) => void;
  onRemove: () => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="admin-actions">
      <button type="button" className="btn-ghost admin-btn" disabled={index === 0} onClick={() => onMove(-1)}>
        <ArrowUp size={14} /> {t('admin.tests.moveUp')}
      </button>
      <button
        type="button"
        className="btn-ghost admin-btn"
        disabled={index >= total - 1}
        onClick={() => onMove(1)}
      >
        <ArrowDown size={14} /> {t('admin.tests.moveDown')}
      </button>
      <button type="button" className="btn-ghost admin-btn" onClick={onRemove}>
        <Trash2 size={14} /> {t('admin.tests.remove')}
      </button>
    </div>
  );
}

function PersonalityEditor({
  bank,
  onChange,
}: {
  bank: PersonalityBank;
  onChange: (bank: PersonalityBank) => void;
}) {
  const { t } = useLanguage();
  const items = [...bank.items].sort((a, b) => a.order - b.order);

  const updateItems = (next: PersonalityItem[]) => {
    onChange({
      ...bank,
      items: next.map((item, index) => ({ ...item, order: index + 1 })),
    });
  };

  const addItem = () => {
    updateItems([
      ...items,
      {
        id: newId('mipip'),
        order: items.length + 1,
        trait: 'openness',
        reverse: false,
        textEn: '',
        textFa: '',
      },
    ]);
  };

  return (
    <div className="admin-card">
      <div className="admin-section-head">
        <h2>{t('admin.tests.personalityHeading', { count: items.length })}</h2>
        <button type="button" className="btn-next admin-btn" onClick={addItem}>
          <Plus size={14} /> {t('admin.tests.addQuestion')}
        </button>
      </div>
      <Field label={t('admin.tests.citation')}>
        <input
          className="admin-input"
          value={bank.citation}
          onChange={(e) => onChange({ ...bank, citation: e.target.value })}
        />
      </Field>
      <div className="admin-list" style={{ marginTop: '1rem' }}>
        {items.map((item, index) => (
          <article key={item.id} className="admin-list-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <div className="admin-section-head" style={{ marginBottom: 0 }}>
              <strong>
                #{index + 1} · {item.id}
              </strong>
              <QuestionToolbar
                index={index}
                total={items.length}
                onMove={(delta) => updateItems(moveItem(items, index, delta))}
                onRemove={() => updateItems(items.filter((_, i) => i !== index))}
              />
            </div>
            <div className="admin-form-grid">
              <Field label={t('admin.tests.itemId')}>
                <input
                  className="admin-input"
                  value={item.id}
                  onChange={(e) => {
                    const next = [...items];
                    next[index] = { ...item, id: e.target.value };
                    updateItems(next);
                  }}
                />
              </Field>
              <Field label={t('admin.tests.trait')}>
                <select
                  className="admin-select"
                  value={item.trait}
                  onChange={(e) => {
                    const next = [...items];
                    next[index] = {
                      ...item,
                      trait: e.target.value as PersonalityItem['trait'],
                    };
                    updateItems(next);
                  }}
                >
                  {BIG_FIVE_TRAITS.map((trait) => (
                    <option key={trait} value={trait}>
                      {t(`admin.tests.traits.${trait}`)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <label className="admin-checkbox">
              <input
                type="checkbox"
                checked={item.reverse}
                onChange={(e) => {
                  const next = [...items];
                  next[index] = { ...item, reverse: e.target.checked };
                  updateItems(next);
                }}
              />
              {t('admin.tests.reverse')}
            </label>
            <Field label={t('admin.tests.textFa')}>
              <textarea
                className="admin-textarea"
                rows={2}
                value={item.textFa}
                onChange={(e) => {
                  const next = [...items];
                  next[index] = { ...item, textFa: e.target.value };
                  updateItems(next);
                }}
              />
            </Field>
            <Field label={t('admin.tests.textEn')}>
              <textarea
                className="admin-textarea"
                rows={2}
                value={item.textEn}
                onChange={(e) => {
                  const next = [...items];
                  next[index] = { ...item, textEn: e.target.value };
                  updateItems(next);
                }}
              />
            </Field>
          </article>
        ))}
      </div>
    </div>
  );
}

function AssessmentEditor({
  bank,
  onChange,
}: {
  bank: AssessmentBank;
  onChange: (bank: AssessmentBank) => void;
}) {
  const { t } = useLanguage();
  const questions = [...bank.questions].sort((a, b) => a.order - b.order);

  const updateQuestions = (next: AssessmentQuestion[]) => {
    onChange({
      ...bank,
      questions: next.map((q, index) => ({ ...q, order: index + 1 })),
    });
  };

  const addQuestion = () => {
    updateQuestions([
      ...questions,
      {
        id: newId('stage'),
        order: questions.length + 1,
        kind: 'single_choice',
        stageLabel: { fa: 'سؤال جدید', en: 'New question' },
        title: { fa: '', en: '' },
        description: { fa: '', en: '' },
        options: [
          {
            value: 'option-a',
            icon: '•',
            title: { fa: 'گزینه ۱', en: 'Option 1' },
            description: { fa: '', en: '' },
          },
        ],
      },
    ]);
  };

  return (
    <div className="admin-card">
      <div className="admin-section-head">
        <h2>{t('admin.tests.assessmentHeading', { count: questions.length })}</h2>
        <button type="button" className="btn-next admin-btn" onClick={addQuestion}>
          <Plus size={14} /> {t('admin.tests.addQuestion')}
        </button>
      </div>
      <div className="admin-list">
        {questions.map((question, index) => (
          <article
            key={`${question.id}-${index}`}
            className="admin-list-item"
            style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.75rem' }}
          >
            <div className="admin-section-head" style={{ marginBottom: 0 }}>
              <strong>
                #{index + 1} · {question.id}
              </strong>
              <QuestionToolbar
                index={index}
                total={questions.length}
                onMove={(delta) => updateQuestions(moveItem(questions, index, delta))}
                onRemove={() => updateQuestions(questions.filter((_, i) => i !== index))}
              />
            </div>
            <div className="admin-form-grid">
              <Field label={t('admin.tests.itemId')}>
                <input
                  className="admin-input"
                  value={question.id}
                  onChange={(e) => {
                    const next = [...questions];
                    next[index] = { ...question, id: e.target.value };
                    updateQuestions(next);
                  }}
                />
              </Field>
              <Field label={t('admin.tests.kind')}>
                <select
                  className="admin-select"
                  value={question.kind}
                  onChange={(e) => {
                    const next = [...questions];
                    next[index] = {
                      ...question,
                      kind: e.target.value as AssessmentQuestion['kind'],
                    };
                    updateQuestions(next);
                  }}
                >
                  {(
                    [
                      'single_choice',
                      'multi_choice',
                      'skills_matrix',
                      'sliders',
                      'hours',
                    ] as const
                  ).map((kind) => (
                    <option key={kind} value={kind}>
                      {t(`admin.tests.kinds.${kind}`)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <LocaleFields
              label={t('admin.tests.stageLabel')}
              value={question.stageLabel}
              onChange={(stageLabel) => {
                const next = [...questions];
                next[index] = { ...question, stageLabel };
                updateQuestions(next);
              }}
            />
            <LocaleFields
              label={t('admin.tests.prompt')}
              value={question.title}
              onChange={(title) => {
                const next = [...questions];
                next[index] = { ...question, title };
                updateQuestions(next);
              }}
            />
            <LocaleFields
              label={t('admin.tests.description')}
              value={question.description}
              onChange={(description) => {
                const next = [...questions];
                next[index] = { ...question, description };
                updateQuestions(next);
              }}
            />
            {(question.kind === 'single_choice' || question.kind === 'multi_choice') && (
              <div className="admin-moderator-access">
                <div className="admin-section-head">
                  <h3>{t('admin.tests.options')}</h3>
                  <button
                    type="button"
                    className="btn-ghost admin-btn"
                    onClick={() => {
                      const next = [...questions];
                      const options = [
                        ...(question.options ?? []),
                        {
                          value: newId('opt'),
                          icon: '•',
                          title: { fa: '', en: '' },
                          description: { fa: '', en: '' },
                        },
                      ];
                      next[index] = { ...question, options };
                      updateQuestions(next);
                    }}
                  >
                    <Plus size={14} /> {t('admin.tests.addOption')}
                  </button>
                </div>
                {(question.options ?? []).map((opt, optIndex) => (
                  <div key={`${opt.value}-${optIndex}`} className="admin-video-block" style={{ marginBottom: '0.75rem' }}>
                    <div className="admin-form-grid">
                      <Field label={t('admin.tests.optionValue')}>
                        <input
                          className="admin-input"
                          value={opt.value}
                          onChange={(e) => {
                            const next = [...questions];
                            const options = [...(question.options ?? [])];
                            options[optIndex] = { ...opt, value: e.target.value };
                            next[index] = { ...question, options };
                            updateQuestions(next);
                          }}
                        />
                      </Field>
                      <Field label={t('admin.tests.icon')}>
                        <input
                          className="admin-input"
                          value={opt.icon ?? ''}
                          onChange={(e) => {
                            const next = [...questions];
                            const options = [...(question.options ?? [])];
                            options[optIndex] = { ...opt, icon: e.target.value };
                            next[index] = { ...question, options };
                            updateQuestions(next);
                          }}
                        />
                      </Field>
                    </div>
                    <LocaleFields
                      label={t('admin.tests.optionTitle')}
                      value={opt.title}
                      onChange={(title) => {
                        const next = [...questions];
                        const options = [...(question.options ?? [])];
                        options[optIndex] = { ...opt, title };
                        next[index] = { ...question, options };
                        updateQuestions(next);
                      }}
                    />
                    <button
                      type="button"
                      className="btn-ghost admin-btn"
                      onClick={() => {
                        const next = [...questions];
                        const options = (question.options ?? []).filter((_, i) => i !== optIndex);
                        next[index] = { ...question, options };
                        updateQuestions(next);
                      }}
                    >
                      <Trash2 size={14} /> {t('admin.tests.removeOption')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

function ReadinessEditor({
  bank,
  onChange,
}: {
  bank: ReadinessBank;
  onChange: (bank: ReadinessBank) => void;
}) {
  const { t } = useLanguage();
  const questions = bank.questions;

  const updateQuestions = (next: ExamQuestion[]) => {
    onChange({ ...bank, questions: next });
  };

  const addQuestion = () => {
    updateQuestions([
      ...questions,
      {
        id: newId('rq'),
        domain: 'digitalOps',
        type: 'single_choice',
        prompt: { fa: '', en: '' },
        options: [
          { id: 'a', label: { fa: '', en: '' } },
          { id: 'b', label: { fa: '', en: '' } },
        ],
        answer: 'a',
        points: 1,
      },
    ]);
  };

  return (
    <div className="admin-card">
      <div className="admin-section-head">
        <h2>{t('admin.tests.readinessHeading', { count: questions.length })}</h2>
        <button type="button" className="btn-next admin-btn" onClick={addQuestion}>
          <Plus size={14} /> {t('admin.tests.addQuestion')}
        </button>
      </div>
      <div className="admin-list">
        {questions.map((question, index) => (
          <article
            key={`${question.id}-${index}`}
            className="admin-list-item"
            style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.75rem' }}
          >
            <div className="admin-section-head" style={{ marginBottom: 0 }}>
              <strong>
                #{index + 1} · {question.id}
              </strong>
              <QuestionToolbar
                index={index}
                total={questions.length}
                onMove={(delta) => updateQuestions(moveItem(questions, index, delta))}
                onRemove={() => updateQuestions(questions.filter((_, i) => i !== index))}
              />
            </div>
            <div className="admin-form-grid">
              <Field label={t('admin.tests.itemId')}>
                <input
                  className="admin-input"
                  value={question.id}
                  onChange={(e) => {
                    const next = [...questions];
                    next[index] = { ...question, id: e.target.value };
                    updateQuestions(next);
                  }}
                />
              </Field>
              <Field label={t('admin.tests.domain')}>
                <select
                  className="admin-select"
                  value={question.domain}
                  onChange={(e) => {
                    const next = [...questions];
                    next[index] = {
                      ...question,
                      domain: e.target.value as ExamQuestion['domain'],
                    };
                    updateQuestions(next);
                  }}
                >
                  {EXAM_DOMAINS.map((domain) => (
                    <option key={domain} value={domain}>
                      {t(`exam.domains.${domain}`)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t('admin.tests.kind')}>
                <select
                  className="admin-select"
                  value={question.type}
                  onChange={(e) => {
                    const next = [...questions];
                    next[index] = {
                      ...question,
                      type: e.target.value as ExamQuestionType,
                    };
                    updateQuestions(next);
                  }}
                >
                  {(['single_choice', 'multi_choice', 'order', 'fill_blank'] as const).map(
                    (type) => (
                      <option key={type} value={type}>
                        {t(`admin.tests.examTypes.${type}`)}
                      </option>
                    ),
                  )}
                </select>
              </Field>
              <Field label={t('admin.tests.answerKey')}>
                <input
                  className="admin-input ltr-isolate"
                  value={
                    Array.isArray(question.answer)
                      ? question.answer.join(', ')
                      : String(question.answer ?? '')
                  }
                  onChange={(e) => {
                    const raw = e.target.value;
                    const next = [...questions];
                    const answer =
                      question.type === 'single_choice' || question.type === 'fill_blank'
                        ? question.type === 'fill_blank'
                          ? raw.split(',').map((s) => s.trim()).filter(Boolean)
                          : raw.trim()
                        : raw.split(',').map((s) => s.trim()).filter(Boolean);
                    next[index] = { ...question, answer };
                    updateQuestions(next);
                  }}
                />
              </Field>
            </div>
            <LocaleFields
              label={t('admin.tests.prompt')}
              value={question.prompt}
              onChange={(prompt) => {
                const next = [...questions];
                next[index] = { ...question, prompt };
                updateQuestions(next);
              }}
            />
            {(question.type === 'single_choice' ||
              question.type === 'multi_choice' ||
              question.type === 'order') && (
              <div className="admin-moderator-access">
                <div className="admin-section-head">
                  <h3>
                    {question.type === 'order'
                      ? t('admin.tests.orderItems')
                      : t('admin.tests.options')}
                  </h3>
                  <button
                    type="button"
                    className="btn-ghost admin-btn"
                    onClick={() => {
                      const next = [...questions];
                      const key = question.type === 'order' ? 'orderItems' : 'options';
                      const list = [
                        ...((question[key] as ExamQuestion['options']) ?? []),
                        { id: newId('opt'), label: { fa: '', en: '' } },
                      ];
                      next[index] = { ...question, [key]: list };
                      updateQuestions(next);
                    }}
                  >
                    <Plus size={14} /> {t('admin.tests.addOption')}
                  </button>
                </div>
                {((question.type === 'order' ? question.orderItems : question.options) ?? []).map(
                  (opt, optIndex) => (
                    <div key={`${opt.id}-${optIndex}`} className="admin-video-block" style={{ marginBottom: '0.75rem' }}>
                      <Field label={t('admin.tests.optionValue')}>
                        <input
                          className="admin-input ltr-isolate"
                          value={opt.id}
                          onChange={(e) => {
                            const next = [...questions];
                            const key = question.type === 'order' ? 'orderItems' : 'options';
                            const list = [...((question[key] as NonNullable<ExamQuestion['options']>) ?? [])];
                            list[optIndex] = { ...opt, id: e.target.value };
                            next[index] = { ...question, [key]: list };
                            updateQuestions(next);
                          }}
                        />
                      </Field>
                      <LocaleFields
                        label={t('admin.tests.optionTitle')}
                        value={opt.label}
                        onChange={(label) => {
                          const next = [...questions];
                          const key = question.type === 'order' ? 'orderItems' : 'options';
                          const list = [...((question[key] as NonNullable<ExamQuestion['options']>) ?? [])];
                          list[optIndex] = { ...opt, label };
                          next[index] = { ...question, [key]: list };
                          updateQuestions(next);
                        }}
                      />
                      <button
                        type="button"
                        className="btn-ghost admin-btn"
                        onClick={() => {
                          const next = [...questions];
                          const key = question.type === 'order' ? 'orderItems' : 'options';
                          const list = ((question[key] as NonNullable<ExamQuestion['options']>) ?? []).filter(
                            (_, i) => i !== optIndex,
                          );
                          next[index] = { ...question, [key]: list };
                          updateQuestions(next);
                        }}
                      >
                        <Trash2 size={14} /> {t('admin.tests.removeOption')}
                      </button>
                    </div>
                  ),
                )}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
