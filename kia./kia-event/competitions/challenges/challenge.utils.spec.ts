import { buildChallengeResult, scoreFizzBuzz } from '@kia./shared';

describe('challenge scoring', () => {
  it('re-exports scoreFizzBuzz from @kia./shared', () => {
    const code = `
      for (let i = 1; i <= 100; i++) {
        if (i % 3 === 0 && i % 5 === 0) console.log('FizzBuzz');
        else if (i % 3 === 0) console.log('Fizz');
        else if (i % 5 === 0) console.log('Buzz');
        else console.log(i);
      }
    `;
    expect(scoreFizzBuzz(code)).toBeGreaterThanOrEqual(75);
  });

  it('re-exports buildChallengeResult from @kia./shared', () => {
    const code = `
      for (let i = 1; i <= 100; i++) {
        if (i % 3 === 0 && i % 5 === 0) console.log('FizzBuzz');
        else if (i % 3 === 0) console.log('Fizz');
        else if (i % 5 === 0) console.log('Buzz');
        else console.log(i);
      }
    `;
    const result = buildChallengeResult(code);
    expect(result.topScore).toBe(true);
    expect(result.unlockInterviewCourse).toBe(true);
  });

  it('returns non-top-score result for incomplete code', () => {
    const result = buildChallengeResult('console.log("hello")');
    expect(result.topScore).toBe(false);
    expect(result.unlockInterviewCourse).toBe(false);
  });
});
