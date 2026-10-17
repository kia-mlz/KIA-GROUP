import type { LearnerTestReport } from '@kia./shared';

describe('LearnerTestReport shape', () => {
  it('includes all three test sections', () => {
    const report: LearnerTestReport = {
      personality: {
        id: 'p1',
        instrument: 'mini-ipip',
        citation: 'Donnellan et al., 2006',
        answers: {},
        scores: {
          extraversion: { trait: 'extraversion', raw: 12, percent: 50 },
          agreeableness: { trait: 'agreeableness', raw: 14, percent: 62 },
          conscientiousness: { trait: 'conscientiousness', raw: 16, percent: 75 },
          neuroticism: { trait: 'neuroticism', raw: 10, percent: 38 },
          openness: { trait: 'openness', raw: 18, percent: 88 },
        },
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      assessment: {
        id: 'a1',
        answers: {
          goal: 'job',
          skills: { 'HTML/CSS': 'Beginner', JavaScript: 'Never used', Python: 'Never used' },
          personality: { teamwork: 40, pace: 60 },
          interests: ['web'],
          style: 'building',
          hours: 12,
        },
        createdAt: '2026-01-01T00:10:00.000Z',
      },
      readiness: {
        id: 'e1',
        createdAt: '2026-01-01T00:40:00.000Z',
        percentages: {
          digitalOps: 70,
          logicalReasoning: 65,
          techReading: 80,
          codeSense: 60,
          problemSolving: 75,
        },
        average: 70,
        passed: true,
        verdict: {
          icon: '✓',
          title: { fa: 'آماده‌ای', en: 'You are ready' },
          message: { fa: 'امتیاز ۷۰٪', en: 'Score 70%' },
          unlockTitle: { fa: 'ادامه', en: 'Continue' },
          unlockSub: { fa: 'نقشه راه', en: 'Roadmap' },
          variant: 'success',
        },
      },
      roadmap: {
        id: 'r1',
        trackKey: 'web',
        trackName: 'Web',
        level: 'absoluteBeginner',
        profile: {
          goal: 'job',
          level: 'absoluteBeginner',
          style: 'building',
          hours: 12,
        },
      },
    };

    expect(report.personality?.scores.openness.percent).toBe(88);
    expect(report.assessment?.answers.goal).toBe('job');
    expect(report.readiness?.average).toBe(70);
    expect(report.roadmap?.trackKey).toBe('web');
  });
});
