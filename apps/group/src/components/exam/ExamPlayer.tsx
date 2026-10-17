'use client';

import {
  EXAM_DOMAINS,
  type ExamAttemptSession,
  type ExamResponse,
  type PublicExamQuestion,
} from '@kia./shared';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/context/LanguageProvider';

interface ExamPlayerProps {
  session: ExamAttemptSession;
  onSaveAnswers: (answers: Record<string, ExamResponse>) => Promise<void>;
  onSubmit: (answers: Record<string, ExamResponse>) => Promise<void>;
  submitting?: boolean;
}

function localeText(
  text: { fa: string; en: string },
  locale: string,
): string {
  return locale === 'fa' ? text.fa : text.en;
}

function formatTime(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function ExamPlayer({
  session,
  onSaveAnswers,
  onSubmit,
  submitting = false,
}: ExamPlayerProps) {
  const { t, locale } = useLanguage();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, ExamResponse>>(
    () => ({ ...session.savedAnswers }),
  );
  const [remainingSec, setRemainingSec] = useState(() =>
    Math.max(0, Math.floor((new Date(session.endsAt).getTime() - Date.now()) / 1000)),
  );
  const [dirty, setDirty] = useState(false);

  const questions = session.questions;
  const current = questions[index]!;
  const answeredCount = useMemo(
    () => questions.filter((q) => answers[q.id]).length,
    [answers, questions],
  );

  const domainLabel = (domain: string) => t(`exam.domains.${domain}` as 'exam.domains.digitalOps');

  // Store latest values in refs for stable callbacks
  const answersRef = useRef(answers);
  const onSaveAnswersRef = useRef(onSaveAnswers);
  const onSubmitRef = useRef(onSubmit);
  
  useEffect(() => {
    answersRef.current = answers;
    onSaveAnswersRef.current = onSaveAnswers;
    onSubmitRef.current = onSubmit;
  });

  const persist = useCallback(async () => {
    try {
      await onSaveAnswersRef.current(answersRef.current);
      setDirty(false);
    } catch {
      /* keep local answers; retry on next change / submit */
    }
  }, []);

  const finish = useCallback(async () => {
    await onSubmitRef.current(answersRef.current);
  }, []);

  useEffect(() => {
    const tick = window.setInterval(() => {
      const left = Math.max(
        0,
        Math.floor((new Date(session.endsAt).getTime() - Date.now()) / 1000),
      );
      setRemainingSec(left);
      if (left <= 0) {
        window.clearInterval(tick);
        void finish();
      }
    }, 1000);
    return () => window.clearInterval(tick);
  }, [session.endsAt]);

  useEffect(() => {
    if (!dirty) return;
    const handle = window.setTimeout(() => {
      void persist();
    }, 800);
    return () => window.clearTimeout(handle);
  }, [answers, dirty]);

  // Initialize order questions with displayed order so unanswered ≠ empty.
  useEffect(() => {
    const q = questions[index];
    if (!q || q.type !== 'order' || !q.orderItems || answers[q.id]) return;
    setAnswers((prev) => ({
      ...prev,
      [q.id]: { type: 'order', orderedIds: q.orderItems!.map((item) => item.id) },
    }));
    setDirty(true);
  }, [index, questions, answers]);

  const setAnswer = useCallback((questionId: string, response: ExamResponse) => {
    setAnswers((prev) => ({ ...prev, [questionId]: response }));
    setDirty(true);
  }, []);

  const goNext = () => {
    if (index < questions.length - 1) setIndex(index + 1);
  };

  const goPrev = () => {
    if (index > 0) setIndex(index - 1);
  };

  const urgent = remainingSec <= 5 * 60;

  return (
    <div className="exam-player">
      <div className="exam-player__chrome">
        <div className="exam-player__meta">
          <span className="exam-player__domain">{domainLabel(current.domain)}</span>
          <span className="exam-player__progress">
            {t('exam.progress', { current: index + 1, total: questions.length })}
          </span>
        </div>
        <div
          className={`exam-player__timer${urgent ? ' exam-player__timer--urgent' : ''}`}
          role="timer"
          aria-live="polite"
        >
          {formatTime(remainingSec)}
        </div>
      </div>

      <div className="exam-player__track" aria-hidden>
        {questions.map((q, i) => (
          <button
            key={q.id}
            type="button"
            className={`exam-player__dot${i === index ? ' is-current' : ''}${answers[q.id] ? ' is-answered' : ''}`}
            onClick={() => setIndex(i)}
            title={`${i + 1}`}
          />
        ))}
      </div>

      <article className="exam-player__card" key={current.id}>
        <p className="exam-player__prompt">{localeText(current.prompt, locale)}</p>
        <QuestionBody
          question={current}
          value={answers[current.id]}
          locale={locale}
          onChange={(response) => setAnswer(current.id, response)}
        />
      </article>

      <div className="exam-player__footer">
        <div className="exam-player__answered">
          {t('exam.answered', { count: answeredCount, total: questions.length })}
        </div>
        <div className="exam-player__nav">
          <button type="button" className="btn-ghost" onClick={goPrev} disabled={index === 0 || submitting}>
            {t('exam.prev')}
          </button>
          {index < questions.length - 1 ? (
            <button type="button" className="btn-next" onClick={goNext} disabled={submitting}>
              {t('exam.next')}
            </button>
          ) : (
            <button
              type="button"
              className="btn-next"
              disabled={submitting}
              onClick={() => void finish()}
            >
              {submitting ? t('exam.submitting') : t('exam.submit')}
            </button>
          )}
        </div>
      </div>

      <div className="exam-player__sections">
        {EXAM_DOMAINS.map((domain) => {
          const domainQs = questions.filter((q) => q.domain === domain);
          const done = domainQs.filter((q) => answers[q.id]).length;
          return (
            <div key={domain} className="exam-player__section-pill">
              <span>{domainLabel(domain)}</span>
              <strong>
                {done}/{domainQs.length}
              </strong>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuestionBody({
  question,
  value,
  locale,
  onChange,
}: {
  question: PublicExamQuestion;
  value: ExamResponse | undefined;
  locale: string;
  onChange: (response: ExamResponse) => void;
}) {
  const { t } = useLanguage();

  if (question.type === 'single_choice' && question.options) {
    const selected = value?.type === 'single_choice' ? value.optionId : '';
    return (
      <div className="exam-options" role="radiogroup">
        {question.options.map((opt) => (
          <label key={opt.id} className={`exam-option${selected === opt.id ? ' is-selected' : ''}`}>
            <input
              type="radio"
              name={question.id}
              checked={selected === opt.id}
              onChange={() => onChange({ type: 'single_choice', optionId: opt.id })}
            />
            <span>{localeText(opt.label, locale)}</span>
          </label>
        ))}
      </div>
    );
  }

  if (question.type === 'multi_choice' && question.options) {
    const selected = value?.type === 'multi_choice' ? value.optionIds : [];
    return (
      <div className="exam-options">
        <p className="exam-hint">{t('exam.multiHint')}</p>
        {question.options.map((opt) => {
          const checked = selected.includes(opt.id);
          return (
            <label key={opt.id} className={`exam-option${checked ? ' is-selected' : ''}`}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => {
                  const next = checked
                    ? selected.filter((id) => id !== opt.id)
                    : [...selected, opt.id];
                  onChange({ type: 'multi_choice', optionIds: next });
                }}
              />
              <span>{localeText(opt.label, locale)}</span>
            </label>
          );
        })}
      </div>
    );
  }

  if (question.type === 'order' && question.orderItems) {
    const orderedIds =
      value?.type === 'order'
        ? value.orderedIds
        : question.orderItems.map((item) => item.id);
    const byId = Object.fromEntries(question.orderItems.map((item) => [item.id, item]));

    const move = (from: number, to: number) => {
      if (to < 0 || to >= orderedIds.length) return;
      const next = [...orderedIds];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item!);
      onChange({ type: 'order', orderedIds: next });
    };

    return (
      <div className="exam-order">
        <p className="exam-hint">{t('exam.orderHint')}</p>
        <ol className="exam-order-list">
          {orderedIds.map((id, i) => (
            <li key={id} className="exam-order-item">
              <span>{localeText(byId[id]!.label, locale)}</span>
              <div className="exam-order-actions">
                <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label="up">
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(i, i + 1)}
                  disabled={i === orderedIds.length - 1}
                  aria-label="down"
                >
                  ↓
                </button>
              </div>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  if (question.type === 'fill_blank') {
    const blanks = question.blanks ?? 1;
    const values = value?.type === 'fill_blank' ? value.values : Array.from({ length: blanks }, () => '');
    return (
      <div className="exam-blanks">
        {Array.from({ length: blanks }, (_, i) => (
          <label key={i} className="exam-blank">
            <span>
              {question.blankPlaceholders?.[i]
                ? localeText(question.blankPlaceholders[i]!, locale)
                : t('exam.blankLabel', { n: i + 1 })}
            </span>
            <input
              type="text"
              value={values[i] ?? ''}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => {
                const next = [...values];
                next[i] = e.target.value;
                onChange({ type: 'fill_blank', values: next });
              }}
            />
          </label>
        ))}
      </div>
    );
  }

  return null;
}
