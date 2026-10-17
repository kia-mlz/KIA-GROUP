'use client';

import type { AssessmentAnswers, LearningStyle } from '@kia./shared';
import { useAssessmentQuestion } from '@/context/AssessmentBankProvider';
import { useLanguage } from '@/context/LanguageProvider';
import { localeText } from '@/lib/localeText';
import { OptCard } from '../OptCard';
import { STYLE_OPTIONS } from '../wizardOptions';

interface Props {
  answers: AssessmentAnswers;
  onChange: (partial: Partial<AssessmentAnswers>) => void;
}

export function StyleStage({ answers, onChange }: Props) {
  const { t, locale } = useLanguage();
  const question = useAssessmentQuestion('learningStyle');
  const options =
    question?.options?.map((opt) => ({
      value: opt.value,
      icon: opt.icon ?? '•',
      title: localeText(opt.title, locale),
      desc: localeText(opt.description, locale),
    })) ??
    STYLE_OPTIONS.map(([val, icon]) => ({
      value: val,
      icon,
      title: t(`wizard.style.${val}.title`),
      desc: t(`wizard.style.${val}.desc`),
    }));

  return (
    <>
      <div className="q-title">
        {question ? localeText(question.title, locale) : t('wizard.style.title')}
      </div>
      <div className="q-sub">
        {question ? localeText(question.description, locale) : t('wizard.style.sub')}
      </div>
      <div className="option-grid">
        {options.map((opt) => (
          <OptCard
            key={opt.value}
            icon={opt.icon}
            title={opt.title}
            desc={opt.desc}
            selected={answers.style === opt.value}
            onSelect={() => onChange({ style: opt.value as LearningStyle })}
          />
        ))}
      </div>
    </>
  );
}
