import { computeReadinessResult } from '@kia./shared';

describe('computeReadinessResult', () => {
  it('re-exports computeReadinessResult from @kia./shared', () => {
    const result = computeReadinessResult({
      'Computer Literacy': { correct: 4, total: 5 },
      'English Readiness': { correct: 4, total: 5 },
      'Algorithmic Thinking': { correct: 3, total: 5 },
      Flowcharts: { correct: 3, total: 5 },
      'Programming Fundamentals': { correct: 4, total: 5 },
    });

    expect(result.average).toBeGreaterThanOrEqual(60);
    expect(result.passed).toBe(true);
    expect(result.verdict.variant).toBe('success');
  });

  it('returns warning verdict when average is below 60', () => {
    const result = computeReadinessResult({
      'Computer Literacy': { correct: 1, total: 5 },
      'English Readiness': { correct: 1, total: 5 },
      'Algorithmic Thinking': { correct: 1, total: 5 },
      Flowcharts: { correct: 2, total: 5 },
      'Programming Fundamentals': { correct: 1, total: 5 },
    });

    expect(result.passed).toBe(false);
    expect(result.verdict.variant).toBe('warning');
  });
});
