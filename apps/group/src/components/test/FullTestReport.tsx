'use client';

import {
  BIG_FIVE_TRAITS,
  EXAM_DOMAINS,
  type AssessmentAnswers,
  type LearnerTestReport,
  type LearnerTestReportReadiness,
  type PersonalityResult,
} from '@kia./shared';
import { RadarChart } from '@/components/readiness/RadarChart';
import { SKILL_TOPIC_KEYS } from '@/components/wizard/wizardOptions';
import { useLanguage } from '@/context/LanguageProvider';
import {
  goalMessageKey,
  levelMessageKey,
  moduleMessageKey,
  skillLevelMessageKey,
  styleMessageKey,
  trackMessageKey,
} from '@/i18n/domain';

function pickLocale(
  text: { fa: string; en: string } | string,
  locale: string,
): string {
  if (typeof text === 'string') return text;
  return locale === 'fa' ? text.fa : text.en;
}

function skillTopicLabel(
  topic: string,
  t: (key: string) => string,
): string {
  const mapped = SKILL_TOPIC_KEYS.find(([key]) => key === topic)?.[1];
  if (mapped) return t(`domain.skillTopics.${mapped}`);
  return topic;
}

function localizeReadiness(
  readiness: LearnerTestReportReadiness,
  locale: string,
): LearnerTestReportReadiness {
  return {
    ...readiness,
    verdict: {
      ...readiness.verdict,
      title: pickLocale(readiness.verdict.title, locale),
      message: pickLocale(readiness.verdict.message, locale),
      unlockTitle: pickLocale(readiness.verdict.unlockTitle, locale),
      unlockSub: pickLocale(readiness.verdict.unlockSub, locale),
    },
  };
}

interface FullTestReportProps {
  report: LearnerTestReport;
  /** When readiness came from in-memory exam submit. */
  readinessOverride?: LearnerTestReportReadiness | null;
}

export function FullTestReport({ report, readinessOverride }: FullTestReportProps) {
  const { t, locale } = useLanguage();
  const personality = report.personality;
  const assessment = report.assessment?.answers ?? null;
  const roadmap = report.roadmap;
  const readinessSource = readinessOverride ?? report.readiness;
  const readiness = readinessSource ? localizeReadiness(readinessSource, locale) : null;

  return (
    <div className="full-test-report">
      <section className="report-section" aria-labelledby="report-personality-heading">
        <div className="report-section-head">
          <span className="report-section-num">1</span>
          <div>
            <h3 id="report-personality-heading">{t('tests.report.personalityTitle')}</h3>
            <p className="sub">{t('tests.report.personalitySub')}</p>
          </div>
        </div>
        {personality ? (
          <PersonalityReportBlock personality={personality} />
        ) : (
          <p className="report-missing">{t('tests.report.missingPersonality')}</p>
        )}
      </section>

      <section className="report-section" aria-labelledby="report-assessment-heading">
        <div className="report-section-head">
          <span className="report-section-num">2</span>
          <div>
            <h3 id="report-assessment-heading">{t('tests.report.assessmentTitle')}</h3>
            <p className="sub">{t('tests.report.assessmentSub')}</p>
          </div>
        </div>
        {assessment ? (
          <AssessmentReportBlock
            answers={assessment}
            trackKey={roadmap?.trackKey}
            trackName={roadmap?.trackName}
            level={roadmap?.level ?? roadmap?.profile.level}
          />
        ) : (
          <p className="report-missing">{t('tests.report.missingAssessment')}</p>
        )}
      </section>

      <section className="report-section" aria-labelledby="report-readiness-heading">
        <div className="report-section-head">
          <span className="report-section-num">3</span>
          <div>
            <h3 id="report-readiness-heading">{t('tests.report.readinessTitle')}</h3>
            <p className="sub">{t('tests.report.readinessSub')}</p>
          </div>
        </div>
        {readiness ? (
          <ReadinessReportBlock readiness={readiness} />
        ) : (
          <p className="report-missing">{t('tests.report.missingReadiness')}</p>
        )}
      </section>
    </div>
  );
}

function PersonalityReportBlock({ personality }: { personality: PersonalityResult }) {
  const { t } = useLanguage();
  return (
    <div className="report-personality">
      <div className="score-list">
        {BIG_FIVE_TRAITS.map((trait) => {
          const score = personality.scores[trait];
          return (
            <div key={trait} className="score-row">
              <div className="score-label">
                {t(`tests.personality.traits.${trait}` as 'tests.personality.traits.extraversion')}
              </div>
              <div className="score-bar-track">
                <div className="score-bar-fill" style={{ width: `${score.percent}%` }} />
              </div>
              <div className="score-pct">
                {score.percent}%
                <span className="score-raw">
                  {t('tests.report.rawScore', { raw: score.raw })}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="report-citation">{personality.citation}</p>
    </div>
  );
}

function AssessmentReportBlock({
  answers,
  trackKey,
  trackName,
  level,
}: {
  answers: AssessmentAnswers;
  trackKey?: string;
  trackName?: string;
  level?: string;
}) {
  const { t, format } = useLanguage();
  const skillEntries = Object.entries(answers.skills);

  return (
    <div className="report-assessment">
      <dl className="report-dl">
        {answers.goal && (
          <div className="report-dl-row">
            <dt>{t('tests.report.goal')}</dt>
            <dd>{t(goalMessageKey(answers.goal))}</dd>
          </div>
        )}
        {answers.style && (
          <div className="report-dl-row">
            <dt>{t('tests.report.style')}</dt>
            <dd>{t(styleMessageKey(answers.style))}</dd>
          </div>
        )}
        <div className="report-dl-row">
          <dt>{t('tests.report.hours')}</dt>
          <dd>{t('tests.report.hoursValue', { hours: format.number(answers.hours) })}</dd>
        </div>
        {answers.interests.length > 0 && (
          <div className="report-dl-row">
            <dt>{t('tests.report.interests')}</dt>
            <dd>
              {answers.interests
                .map((interest) => t(trackMessageKey(interest)))
                .join(t('tests.report.listSep'))}
            </dd>
          </div>
        )}
        {(trackKey || trackName) && (
          <div className="report-dl-row">
            <dt>{t('tests.report.track')}</dt>
            <dd>{trackKey ? t(trackMessageKey(trackKey)) : trackName}</dd>
          </div>
        )}
        {level && (
          <div className="report-dl-row">
            <dt>{t('tests.report.level')}</dt>
            <dd>{t(levelMessageKey(level))}</dd>
          </div>
        )}
        <div className="report-dl-row">
          <dt>{t('tests.report.workStyle')}</dt>
          <dd>
            {t('tests.report.teamworkValue', { value: format.number(answers.personality.teamwork) })}
            {t('tests.report.listSep')}
            {t('tests.report.paceValue', { value: format.number(answers.personality.pace) })}
          </dd>
        </div>
      </dl>

      {skillEntries.length > 0 && (
        <div className="report-skills">
          <h4>{t('tests.report.skills')}</h4>
          <ul className="report-skills-list">
            {skillEntries.map(([topic, levelValue]) => (
              <li key={topic}>
                <span>{skillTopicLabel(topic, t)}</span>
                <strong>{t(skillLevelMessageKey(levelValue))}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ReadinessReportBlock({ readiness }: { readiness: LearnerTestReportReadiness }) {
  const { t } = useLanguage();
  const domainKeys = EXAM_DOMAINS.some((d) => readiness.percentages[d] != null)
    ? EXAM_DOMAINS
    : (Object.keys(readiness.percentages) as string[]);
  const outcome = readiness.outcome;
  const verdictTitle = String(readiness.verdict.title);
  const verdictMessage = String(readiness.verdict.message);

  return (
    <div className="report-readiness">
      <div className="results-summary-card">
        <div className="results-avg">
          <span className="results-avg-label">{t('readiness.results.average')}</span>
          <strong className="results-avg-value">{readiness.average}%</strong>
        </div>
        <div className="results-pass-chip" data-passed={readiness.passed ? 'true' : 'false'}>
          {readiness.passed ? t('readiness.results.passed') : t('readiness.results.needsWork')}
        </div>
      </div>

      <div className="results-grid">
        <RadarChart percentages={readiness.percentages} domains={domainKeys} />
        <div className="score-list">
          {domainKeys.map((m) => (
            <div key={m} className="score-row">
              <div className="score-label">
                {EXAM_DOMAINS.includes(m as (typeof EXAM_DOMAINS)[number])
                  ? t(`exam.domains.${m}` as 'exam.domains.digitalOps')
                  : m}
              </div>
              <div className="score-bar-track">
                <div
                  className="score-bar-fill"
                  style={{ width: `${readiness.percentages[m] ?? 0}%` }}
                />
              </div>
              <div className="score-pct">{readiness.percentages[m] ?? 0}%</div>
            </div>
          ))}
        </div>
      </div>

      {outcome && (
        <div className="exam-outcome">
          <h4>{t('exam.results.outcomeTitle')}</h4>
          <p className="sub">{t('exam.results.outcomeSub')}</p>
          {outcome.passed ? (
            <ul className="exam-outcome-list">
              {outcome.modulesUnlocked.map((mod) => (
                <li key={mod}>
                  <span className="exam-outcome-badge exam-outcome-badge--ok">
                    {t('exam.results.unlocked')}
                  </span>
                  {t(moduleMessageKey(mod))}
                </li>
              ))}
              {outcome.levelAfter !== outcome.levelBefore && (
                <li>
                  <span className="exam-outcome-badge exam-outcome-badge--ok">
                    {t('exam.results.levelUp')}
                  </span>
                  {t('exam.results.levelChange', {
                    from: outcome.levelBefore,
                    to: outcome.levelAfter,
                  })}
                </li>
              )}
            </ul>
          ) : (
            <ul className="exam-outcome-list">
              {outcome.refreshersInserted.length === 0 ? (
                <li>{t('exam.results.noRefreshers')}</li>
              ) : (
                outcome.refreshersInserted.map((mod) => (
                  <li key={mod}>
                    <span className="exam-outcome-badge exam-outcome-badge--warn">
                      {t('exam.results.refresher')}
                    </span>
                    {t(moduleMessageKey(mod))}
                  </li>
                ))
              )}
            </ul>
          )}
          {outcome.roadmapModules.length > 0 && (
            <div className="exam-outcome-path">
              <h4>{t('exam.results.updatedPath')}</h4>
              <ol>
                {outcome.roadmapModules.map((mod) => (
                  <li key={mod}>{t(moduleMessageKey(mod))}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      <div
        className="verdict-card"
        style={
          readiness.passed
            ? {
                borderColor: 'var(--emerald)',
                background: 'var(--emerald-dim)',
                border: '1px solid var(--emerald)',
              }
            : {
                borderColor: 'var(--amber)',
                background: 'var(--amber-dim)',
                border: '1px solid var(--amber)',
              }
        }
      >
        <div className="vi">{readiness.verdict.icon}</div>
        <h4>{verdictTitle}</h4>
        <p>{verdictMessage}</p>
      </div>
    </div>
  );
}
