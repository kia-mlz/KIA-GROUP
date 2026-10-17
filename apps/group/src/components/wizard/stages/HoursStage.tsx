'use client';

import type { AssessmentAnswers } from '@kia./shared';
import { useAssessmentQuestion } from '@/context/AssessmentBankProvider';
import { useLanguage } from '@/context/LanguageProvider';
import { localeText } from '@/lib/localeText';
import { HOURS_MAX, HOURS_MIN } from '../wizardOptions';
import { WizardRange } from '../WizardRange';

interface Props {
  answers: AssessmentAnswers;
  onChange: (partial: Partial<AssessmentAnswers>) => void;
}

export function HoursStage({ answers, onChange }: Props) {
  const { t, locale } = useLanguage();
  const question = useAssessmentQuestion('time');
  const min = question?.hours?.min ?? HOURS_MIN;
  const max = question?.hours?.max ?? HOURS_MAX;
  const labelTemplate = question?.hours
    ? localeText(question.hours.label, locale)
    : t('wizard.hours.label', { hours: answers.hours });
  const label = question?.hours
    ? labelTemplate.replace('{hours}', String(answers.hours))
    : labelTemplate;

  return (
    <>
      <div className="q-title">
        {question ? localeText(question.title, locale) : t('wizard.hours.title')}
      </div>
      <div className="q-sub">
        {question ? localeText(question.description, locale) : t('wizard.hours.sub')}
      </div>
      <div className="slider-block">
        <div className="tag-label">{label}</div>
        <WizardRange
          mode="progress"
          min={min}
          max={max}
          value={answers.hours}
          ariaLabel={
            question?.hours ? localeText(question.hours.aria, locale) : t('wizard.hours.aria')
          }
          onChange={(hours) => onChange({ hours })}
        />
        <div className="slider-labels">
          <span>{min}h</span>
          <span>{max}h</span>
        </div>
      </div>
    </>
  );
}
