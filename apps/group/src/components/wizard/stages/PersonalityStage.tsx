'use client';

import type { AssessmentAnswers } from '@kia./shared';
import { useAssessmentQuestion } from '@/context/AssessmentBankProvider';
import { useLanguage } from '@/context/LanguageProvider';
import { localeText } from '@/lib/localeText';
import { WizardRange } from '../WizardRange';

interface Props {
  answers: AssessmentAnswers;
  onChange: (partial: Partial<AssessmentAnswers>) => void;
}

export function PersonalityStage({ answers, onChange }: Props) {
  const { t, locale } = useLanguage();
  const question = useAssessmentQuestion('personality');
  const labels = question?.sliderLabels;

  return (
    <>
      <div className="q-title">
        {question ? localeText(question.title, locale) : t('wizard.personality.title')}
      </div>
      <div className="q-sub">
        {question ? localeText(question.description, locale) : t('wizard.personality.sub')}
      </div>
      <div className="slider-block">
        <div className="tag-label">
          {labels
            ? localeText(labels.workingStyle, locale)
            : t('wizard.personality.workingStyle')}
        </div>
        <WizardRange
          mode="centered"
          min={0}
          max={100}
          value={answers.personality.teamwork}
          ariaLabel={t('wizard.personality.ariaWorkingStyle')}
          onChange={(teamwork) =>
            onChange({
              personality: {
                ...answers.personality,
                teamwork,
              },
            })
          }
        />
        <div className="slider-labels">
          <span>{labels ? localeText(labels.solo, locale) : t('wizard.personality.solo')}</span>
          <span>{labels ? localeText(labels.team, locale) : t('wizard.personality.team')}</span>
        </div>
      </div>
      <div className="slider-block">
        <div className="tag-label">
          {labels ? localeText(labels.pace, locale) : t('wizard.personality.pace')}
        </div>
        <WizardRange
          mode="centered"
          min={0}
          max={100}
          value={answers.personality.pace}
          ariaLabel={t('wizard.personality.ariaPace')}
          onChange={(pace) =>
            onChange({
              personality: { ...answers.personality, pace },
            })
          }
        />
        <div className="slider-labels">
          <span>
            {labels ? localeText(labels.structured, locale) : t('wizard.personality.structured')}
          </span>
          <span>
            {labels
              ? localeText(labels.exploratory, locale)
              : t('wizard.personality.exploratory')}
          </span>
        </div>
      </div>
    </>
  );
}
