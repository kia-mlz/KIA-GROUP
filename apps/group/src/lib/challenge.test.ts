import { describe, expect, it } from 'vitest';
import { scoreFizzBuzz } from '@kia./shared';

describe('scoreFizzBuzz', () => {
  it('returns 0 for empty or minimal code', () => {
    expect(scoreFizzBuzz('')).toBe(0);
    expect(scoreFizzBuzz('function fizzbuzz(n) {}')).toBe(0);
  });

  it('awards 25 for modulo 3 check', () => {
    expect(scoreFizzBuzz('const x = n % 3')).toBe(25);
  });

  it('awards 25 for modulo 5 check', () => {
    expect(scoreFizzBuzz('const x = n % 5')).toBe(25);
  });

  it('awards 25 for Fizz and Buzz strings', () => {
    expect(scoreFizzBuzz('return "Fizz" + "Buzz"')).toBe(25);
  });

  it('awards 50 for Fizz/Buzz strings plus no-if/else bonus', () => {
    const code =
      'function fizzbuzz(n) {\n  const map = { 3: "Fizz", 5: "Buzz" };\n  return map[n] ?? n;\n}';
    expect(scoreFizzBuzz(code)).toBe(50);
  });

  it('returns 100 for a complete solution without if/else', () => {
    const code = `function fizzbuzz(n) {
  const fizz = n % 3 === 0 ? "Fizz" : "";
  const buzz = n % 5 === 0 ? "Buzz" : "";
  const result = fizz + buzz;
  return result || n;
}`;
    expect(scoreFizzBuzz(code)).toBe(100);
  });

  it('deducts no-if/else bonus when else if is used', () => {
    const code = `function fizzbuzz(n) {
  if (n % 3 === 0 && n % 5 === 0) return "FizzBuzz";
  else if (n % 3 === 0) return "Fizz";
  else if (n % 5 === 0) return "Buzz";
  else return n;
}`;
    expect(scoreFizzBuzz(code)).toBe(75);
  });
});
