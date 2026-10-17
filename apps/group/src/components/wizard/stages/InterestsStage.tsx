'use client';

import type { AssessmentAnswers, Interest } from '@kia./shared';
import { useAssessmentQuestion } from '@/context/AssessmentBankProvider';
import { useLanguage } from '@/context/LanguageProvider';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { localeText } from '@/lib/localeText';
import { OptCard } from '../OptCard';
import { INTEREST_OPTIONS } from '../wizardOptions';

interface Props {
  answers: AssessmentAnswers;
  onChange: (partial: Partial<AssessmentAnswers>) => void;
}

export function InterestsStage({ answers, onChange }: Props) {
  const { t, locale } = useLanguage();
  const { settings } = useSiteSettings();
  const question = useAssessmentQuestion('interest');
  const maxSelections = question?.maxSelections ?? 2;

  const options = (() => {
    if (question?.options?.length) {
      return question.options.map((opt) => ({
        val: opt.value as Interest,
        icon: opt.icon || '📘',
        title: localeText(opt.title, locale),
        desc: localeText(opt.description, locale),
      }));
    }
    if (settings.tracks.length > 0) {
      return settings.tracks.map((track) => ({
        val: track.key as Interest,
        icon: track.icon || '📘',
        title: track.name,
        desc: track.description,
      }));
    }
    return INTEREST_OPTIONS.map(([val, icon]) => ({
      val,
      icon,
      title: t(`wizard.interests.${val}.title`),
      desc: t(`wizard.interests.${val}.desc`),
    }));
  })();

  const toggleInterest = (val: Interest) => {
    const interests = [...answers.interests];
    const idx = interests.indexOf(val);
    if (idx > -1) {
      interests.splice(idx, 1);
    } else {
      if (interests.length >= maxSelections) interests.shift();
      interests.push(val);
    }
    onChange({ interests });
  };

  return (
    <>
      <div className="q-title">
        {question ? localeText(question.title, locale) : t('wizard.interests.title')}
      </div>
      <div className="q-sub">
        {question ? localeText(question.description, locale) : t('wizard.interests.sub')}
      </div>
      <div className="option-grid">
        {options.map((opt) => (
          <OptCard
            key={opt.val}
            icon={opt.icon}
            title={opt.title}
            desc={opt.desc}
            selected={answers.interests.includes(opt.val)}
            onSelect={() => toggleInterest(opt.val)}
          />
        ))}
      </div>
    </>
  );
}
