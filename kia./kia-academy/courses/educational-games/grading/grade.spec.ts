import { gradeSubmission } from './grade';

describe('educational game grading', () => {
  it('grades multiple choice without echoing the key', () => {
    const result = gradeSubmission({
      challengeType: 'mcq',
      gradingConfig: { strategy: 'mcq', correctIds: ['h1'] },
      answer: { selected: ['h1'] },
      stagePoints: 10,
      passScorePct: 100,
    });
    expect(result.passed).toBe(true);
    expect(result.code).toBe('correct');
    expect(JSON.stringify(result)).not.toContain('h1');
  });

  it('rejects a wrong quiz answer', () => {
    const result = gradeSubmission({
      challengeType: 'mcq',
      gradingConfig: { strategy: 'mcq', correctIds: ['h1'] },
      answer: { selected: ['p'] },
      stagePoints: 10,
      passScorePct: 100,
    });
    expect(result.passed).toBe(false);
    expect(result.points).toBe(0);
  });

  it('grades JavaScript structurally and does not execute it', () => {
    const evil = 'function greet(){ return "سلام"; }\nwhile(true){}';
    const result = gradeSubmission({
      challengeType: 'test_cases',
      gradingConfig: {
        strategy: 'test_cases',
        language: 'javascript',
        mustDeclareFunctions: ['greet'],
      },
      answer: { code: 'function greet(){ return "سلام"; }' },
      stagePoints: 20,
      passScorePct: 100,
    });
    expect(result.passed).toBe(true);
    const trapped = gradeSubmission({
      challengeType: 'test_cases',
      gradingConfig: {
        strategy: 'test_cases',
        language: 'javascript',
        mustDeclareFunctions: ['greet'],
        forbid: ['while'],
      },
      answer: { code: evil },
      stagePoints: 20,
      passScorePct: 100,
    });
    expect(trapped.passed).toBe(false);
  });

  it('grades Python with patterns and never treats IO cases as executed', () => {
    const ok = gradeSubmission({
      challengeType: 'test_cases',
      gradingConfig: {
        strategy: 'test_cases',
        language: 'python',
        mustDeclareFunctions: ['greet'],
        mustMatch: ['return'],
      },
      answer: { code: 'def greet():\n    return "سلام"\n' },
      stagePoints: 15,
      passScorePct: 100,
    });
    expect(ok.passed).toBe(true);
    const blocked = gradeSubmission({
      challengeType: 'test_cases',
      gradingConfig: {
        strategy: 'test_cases',
        language: 'python',
        cases: [{ input: '1', output: '2' }],
      },
      answer: { code: 'print(1)' },
      stagePoints: 15,
      passScorePct: 100,
    });
    expect(blocked.passed).toBe(false);
    expect(blocked.code).toBe('invalid');
  });

  it('grades drag-drop and matching maps', () => {
    expect(
      gradeSubmission({
        challengeType: 'drag_drop',
        gradingConfig: { strategy: 'drag_drop', placements: { h1: 'title' } },
        answer: { placements: { h1: 'title' } },
        stagePoints: 8,
        passScorePct: 100,
      }).passed,
    ).toBe(true);
    expect(
      gradeSubmission({
        challengeType: 'matching',
        gradingConfig: { strategy: 'matching', pairs: { color: 'رنگ' } },
        answer: { pairs: { color: 'فاصله' } },
        stagePoints: 8,
        passScorePct: 100,
      }).passed,
    ).toBe(false);
  });

  it('grades output, exact order, html and dom structure', () => {
    expect(
      gradeSubmission({
        challengeType: 'output',
        gradingConfig: { strategy: 'output', expected: '5' },
        answer: { value: '5' },
        stagePoints: 5,
        passScorePct: 100,
      }).passed,
    ).toBe(true);
    expect(
      gradeSubmission({
        challengeType: 'exact',
        gradingConfig: { strategy: 'exact', order: ['a', 'b'] },
        answer: { order: ['a', 'b'] },
        stagePoints: 5,
        passScorePct: 100,
      }).passed,
    ).toBe(true);
    expect(
      gradeSubmission({
        challengeType: 'html',
        gradingConfig: { strategy: 'html', requiredTags: ['h1', 'p'] },
        answer: { code: '<h1>سلام</h1><p>متن</p>' },
        stagePoints: 5,
        passScorePct: 100,
      }).passed,
    ).toBe(true);
    const script = gradeSubmission({
      challengeType: 'dom',
      gradingConfig: { strategy: 'dom', checks: [{ tag: 'h1', min: 1 }] },
      answer: { code: '<h1>سلام</h1><script>alert(1)</script>' },
      stagePoints: 5,
      passScorePct: 100,
    });
    expect(script.passed).toBe(false);
  });

  it('flags manual evaluation instead of auto-passing', () => {
    const result = gradeSubmission({
      challengeType: 'manual',
      gradingConfig: { strategy: 'manual' },
      answer: { code: 'anything' },
      stagePoints: 30,
      passScorePct: 100,
    });
    expect(result.pendingManual).toBe(true);
    expect(result.passed).toBe(false);
    expect(result.points).toBe(0);
  });
});
