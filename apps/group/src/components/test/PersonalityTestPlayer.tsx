'use client';

import {
  MINI_IPIP_ITEMS,
  missingMiniIpipAnswers,
  type MiniIpipAnswers,
  type PersonalityItem,
  type PersonalityLikert,
} from '@kia./shared';
import { useEffect, useMemo, useState } from 'react';
import { ProgressTrack } from '@/components/ui/ProgressTrack';
import { useLanguage } from '@/context/LanguageProvider';
import { api } from '@/lib/api';

const LIKERT: PersonalityLikert[] = [1, 2, 3, 4, 5];

interface PersonalityTestPlayerProps {
  onSubmit: (answers: MiniIpipAnswers) => Promise<void>;
  onBack?: () => void;
  submitting?: boolean;
}

export function PersonalityTestPlayer({
  onSubmit,
  onBack,
  submitting = false,
}: PersonalityTestPlayerProps) {
  const { t, locale } = useLanguage();
  const [items, setItems] = useState<PersonalityItem[]>([...MINI_IPIP_ITEMS]);
  const [answers, setAnswers] = useState<MiniIpipAnswers>({});
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void api
      .getPersonalityBank()
      .then((bank) => {
        if (!cancelled && bank?.items?.length) {
          setItems([...bank.items].sort((a, b) => a.order - b.order));
        }
      })
      .catch(() => {
        /* keep shared defaults */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const item = items[index]!;
  const total = items.length;
  const answeredCount = total - missingMiniIpipAnswers(answers, items).length;
  const currentValue = answers[item.id];
  const isLast = index >= total - 1;
  const canContinue = currentValue !== undefined;

  const stem = useMemo(
    () => (locale === 'fa' ? item.textFa : item.textEn),
    [item, locale],
  );

  const select = (value: PersonalityLikert) => {
    setAnswers((prev) => ({ ...prev, [item.id]: value }));
  };

  const goNext = async () => {
    if (!canContinue || submitting) return;
    if (!isLast) {
      setIndex((i) => i + 1);
      return;
    }
    if (missingMiniIpipAnswers(answers, items).length) return;
    await onSubmit(answers);
  };

  if (!items.length) {
    return <p className="form-error">{t('common.errorFallback')}</p>;
  }

  return (
    <div className="personality-test">
      <ProgressTrack
        total={total}
        current={index}
        doneClass="test-seg"
        segClass="test-progress"
      />

      <div className="stage-label">
        {t('tests.personality.progress', { current: index + 1, total })}
      </div>

      <header className="personality-test-head">
        <h2>{t('tests.personality.title')}</h2>
        <p>{t('tests.personality.instruction')}</p>
      </header>

      <fieldset className="personality-item">
        <legend className="personality-stem">{stem}</legend>
        <div className="personality-likert" role="radiogroup" aria-label={stem}>
          {LIKERT.map((value) => {
            const selected = currentValue === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`personality-likert-opt${selected ? ' is-selected' : ''}`}
                onClick={() => select(value)}
              >
                <span className="personality-likert-num mono ltr-isolate">{value}</span>
                <span className="personality-likert-label">
                  {t(`tests.personality.likert.${value}`)}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <p className="personality-meta text-dim">
        {t('tests.personality.answered', { count: answeredCount, total })}
      </p>

      <div className="wizard-nav">
        <button
          type="button"
          className="btn-ghost"
          onClick={() => (index > 0 ? setIndex(index - 1) : onBack?.())}
          disabled={submitting || (index === 0 && !onBack)}
          style={{ visibility: index === 0 && !onBack ? 'hidden' : 'visible' }}
        >
          {t('wizard.backPlain')}
        </button>
        <button
          type="button"
          className="btn-next"
          onClick={() => void goNext()}
          disabled={!canContinue || submitting}
        >
          {submitting
            ? t('tests.personality.submitting')
            : isLast
              ? t('tests.personality.finish')
              : t('wizard.continue')}
        </button>
      </div>
    </div>
  );
}
