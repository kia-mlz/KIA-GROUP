import { describe, expect, it } from 'vitest';

import {
  BRAND_COLORS,
  BRAND_TOKENS,
  DEPARTMENT_SLUGS,
  GROUP_COLOR,
  departmentColor,
} from './tokens';
import { DARK_INK, contrastRatio, luminance, readableInk } from './contrast';

/**
 * The seven brand colours are the specification. These tests pin the exact
 * published values, the parent-gold reservation, distinctness across
 * departments, and measured ink choice — the same invariants the group app's
 * stylesheet suite checks on the CSS side.
 */
describe('Kia brand tokens', () => {
  it('pins the seven published brand colours verbatim', () => {
    expect(GROUP_COLOR).toBe('#FFC864');
    expect(Object.fromEntries(BRAND_TOKENS.map((t) => [t.slug, t.color]))).toEqual({
      academy: '#6464FF',
      work: '#6492FF',
      material: '#148165',
      labs: '#28C793',
      events: '#E32B1B',
      community: '#FF7344',
    });
  });

  it('reserves the parent gold for Kia alone', () => {
    for (const token of BRAND_TOKENS) {
      expect(token.color.toLowerCase(), token.slug).not.toBe(GROUP_COLOR.toLowerCase());
    }
  });

  it('gives every department a distinct colour', () => {
    const colours = BRAND_TOKENS.map((t) => t.color.toLowerCase());
    expect(new Set(colours).size).toBe(DEPARTMENT_SLUGS.length);
  });

  it('exposes a frozen colour lookup that includes the parent', () => {
    expect(BRAND_COLORS.group).toBe('#FFC864');
    expect(BRAND_COLORS.academy).toBe('#6464FF');
    expect(Object.isFrozen(BRAND_COLORS)).toBe(true);
  });

  it('resolves department colours by slug and rejects unknown slugs', () => {
    expect(departmentColor('events')).toBe('#E32B1B');
    expect(() => departmentColor('nope' as never)).toThrow(/Unknown department/);
  });

  it('carries the one official English name for every department', () => {
    for (const token of BRAND_TOKENS) {
      // One name for both locales: departments are named in English even in
      // the Persian UI, so no Persian spelling is stored anywhere.
      expect(token.name).toMatch(/^KIA\. /);
      expect(token.cssVariable).toBe(`--dept-${token.slug}`);
    }
  });
});

describe('readable ink (measured, not guessed)', () => {
  it('measures WCAG contrast ratios', () => {
    // 21:1 is the theoretical maximum (black on white).
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBe(1);
  });

  it('puts the more readable ink on every department fill', () => {
    for (const token of BRAND_TOKENS) {
      const white = contrastRatio(token.color, '#FFFFFF');
      const dark = contrastRatio(token.color, DARK_INK);
      const chosen = readableInk(token.color);
      const chosenRatio = chosen === '#FFFFFF' ? white : dark;
      expect(chosenRatio, token.slug).toBeCloseTo(Math.max(white, dark), 5);
      // Every fill must carry at least 3:1 with its ink (WCAG large text).
      expect(chosenRatio, token.slug).toBeGreaterThanOrEqual(3);
    }
  });

  it('computes luminance within the WCAG range', () => {
    expect(luminance('#000000')).toBe(0);
    expect(luminance('#FFFFFF')).toBeCloseTo(1, 5);
  });
});
