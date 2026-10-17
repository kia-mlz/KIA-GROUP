'use client';

import type { AssessmentAnswers, Goal } from '@kia./shared';
import { useAssessmentQuestion } from '@/context/AssessmentBankProvider';
import { useLanguage } from '@/context/LanguageProvider';
import { localeText } from '@/lib/localeText';
import { OptCard } from '../OptCard';
import { GOAL_OPTIONS } from '../wizardOptions';

interface Props {
  answers: AssessmentAnswers;
  onChange: (partial: Partial<AssessmentAnswers>) => void;
}

export function GoalStage({ answers, onChange }: Props) {
  const { t, locale } = useLanguage();
  const question = useAssessmentQuestion('goal');
  const options =
    question?.options?.map((opt) => ({
      value: opt.value,
      icon: opt.icon ?? '•',
      title: localeText(opt.title, locale),
      desc: localeText(opt.description, locale),
    })) ??
    GOAL_OPTIONS.map(([val, icon]) => ({
      value: val,
      icon,
      title: t(`wizard.goal.${val}.title`),
      desc: t(`wizard.goal.${val}.desc`),
    }));

  return (
    <>
      <div className="q-title">
        {question ? localeText(question.title, locale) : t('wizard.goal.title')}
      </div>
      <div className="q-sub">
        {question ? localeText(question.description, locale) : t('wizard.goal.sub')}
      </div>
      <div className="option-grid">
        {options.map((opt) => (
          <OptCard
            key={opt.value}
            icon={opt.icon}
            title={opt.title}
            desc={opt.desc}
            selected={answers.goal === opt.value}
            onSelect={() => onChange({ goal: opt.value as Goal })}
          />
        ))}
      </div>
    </>
  );
}
