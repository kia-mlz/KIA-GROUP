import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { en, fa } from './messages';
import { createTranslator } from './translate';

/**
 * User-facing i18n regression guard.
 *
 * Every literal `t('…')` key consumed by the admin and auth UI must resolve
 * from the dictionaries.  `createTranslator` returns the key itself when a
 * lookup misses, so a key that lives under the wrong namespace renders raw
 * paths such as `auth.register.twoFactorTitle` on screen.  This test pins the
 * whole surface down: a key that is moved, renamed or deleted fails here.
 *
 * The dictionary-parity test in i18n.test.ts still asserts that `en` and `fa`
 * share an identical key tree, so a key present in one language is present in
 * both.
 */

/** Strip // and block comments so commented-out sample keys are not counted. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

function discoverUiFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...discoverUiFiles(full));
      continue;
    }
    if (/\.(test|spec)\./.test(entry.name)) continue;
    if (/\.tsx?$/.test(entry.name)) results.push(full);
  }
  return results;
}

const uiRoots = [
  path.join(__dirname, '..', 'app', 'admin'),
  path.join(__dirname, '..', 'app', '(auth)'),
  path.join(__dirname, '..', 'components', 'admin'),
];

function collectUiKeys(): Map<string, string[]> {
  const usage = new Map<string, string[]>();
  for (const root of uiRoots) {
    for (const file of discoverUiFiles(root)) {
      const source = stripComments(readFileSync(file, 'utf8'));
      for (const match of source.matchAll(/\bt\(\s*'([^']+)'\s*\)/g)) {
        const key = match[1];
        const owners = usage.get(key) ?? [];
        owners.push(path.relative(path.join(__dirname, '..'), file));
        usage.set(key, owners);
      }
    }
  }
  return usage;
}

describe('i18n usage coverage (admin + auth)', () => {
  const usage = collectUiKeys();
  const tEn = createTranslator(en, en);
  const tFa = createTranslator(fa, fa);

  it('finds the admin/auth translation surface', () => {
    expect(usage.size).toBeGreaterThan(100);
  });

  it('resolves every literal admin/auth key in English and Persian', () => {
    const unresolved: string[] = [];
    for (const [key, owners] of usage) {
      const english = tEn(key);
      const persian = tFa(key);
      if (english === key) unresolved.push(`en ${key}  (used in ${owners[0]})`);
      if (persian === key) unresolved.push(`fa ${key}  (used in ${owners[0]})`);
    }
    expect(unresolved).toEqual([]);
  });

  /**
   * Values that are intentionally identical in both languages: proper names —
   * department names stay Latin («Kia Academy», …) in both locales — plus
   * masked input placeholders, an email example, the `IP` column label, an
   * em-dash and an example slug. The parent brand (`common.brand`) is
   * locale-aware (Kia / کیا) and must NOT be on this list.
   */
  const languageNeutral = new Set([
    'admin.audit.col.ip',
    'admin.audit.noReason',
    'admin.courses.placeholder.slug',
    'auth.forgotPassword.emailPlaceholder',
    'auth.login.emailPlaceholder',
    'auth.login.passwordPlaceholder',
    'dashboard.doors.academyTitle',
    'dashboard.doors.communityTitle',
    'dashboard.doors.eventsTitle',
    'dashboard.doors.labsTitle',
    'dashboard.doors.materialTitle',
    'dashboard.doors.workTitle',
  ]);

  it('keeps a shrinking allowlist of language-neutral values', () => {
    // Every allowlisted key must still be used by the UI, so the exemption
    // cannot quietly cover copy that should have been translated.
    const stale = [...languageNeutral].filter((key) => !usage.has(key));
    expect(stale).toEqual([]);
  });

  it('does not fall back to English for Persian admin/auth copy', () => {
    // A key that only exists in `en` would silently show English text for
    // Persian operators; the parity test covers the dictionaries, this covers
    // the keys actually reached from the UI.
    const englishOnly = [...usage.keys()]
      .filter((key) => !languageNeutral.has(key))
      .filter((key) => tFa(key) === tEn(key) && tEn(key) !== key);
    expect(englishOnly).toEqual([]);
  });
});
