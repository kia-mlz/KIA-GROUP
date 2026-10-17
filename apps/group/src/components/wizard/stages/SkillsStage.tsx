'use client';

import type { AssessmentAnswers, SkillLevel } from '@kia./shared';
import { useAssessmentQuestion } from '@/context/AssessmentBankProvider';
import { useLanguage } from '@/context/LanguageProvider';
import { skillLevelMessageKey } from '@/i18n/domain';
import { localeText } from '@/lib/localeText';
import { SKILL_LEVELS, SKILL_TOPIC_KEYS } from '../wizardOptions';

interface Props {
  answers: AssessmentAnswers;
  onChange: (partial: Partial<AssessmentAnswers>) => void;
}

export function SkillsStage({ answers, onChange }: Props) {
  const { t, locale } = useLanguage();
  const question = useAssessmentQuestion('skill');

  const topics =
    question?.skillTopics?.map((topic) => ({
      key: topic.key,
      label: localeText(topic.label, locale),
    })) ??
    SKILL_TOPIC_KEYS.map(([topic, topicKey]) => ({
      key: topic,
      label: t(`wizard.skills.topic.${topicKey}`),
    }));

  const levels =
    question?.skillLevels?.map((level) => ({
      value: level.value as SkillLevel,
      label: localeText(level.label, locale),
    })) ??
    SKILL_LEVELS.map((level) => ({
      value: level,
      label: t(skillLevelMessageKey(level)),
    }));

  return (
    <>
      <div className="q-title">
        {question ? localeText(question.title, locale) : t('wizard.skills.title')}
      </div>
      <div className="q-sub">
        {question ? localeText(question.description, locale) : t('wizard.skills.sub')}
      </div>
      {topics.map((topic) => (
        <div key={topic.key} className="tag-group">
          <div className="tag-label">{topic.label}</div>
          <div className="tag-row">
            {levels.map((level) => (
              <button
                key={level.value}
                type="button"
                className={`tag${answers.skills[topic.key] === level.value ? ' selected' : ''}`}
                onClick={() =>
                  onChange({
                    skills: { ...answers.skills, [topic.key]: level.value },
                  })
                }
              >
                {level.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
