import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The public catalog's page chrome, pinned to what the owner asked for.
 *
 * Both views — the حوزه home and the single-domain (or all-courses) list — used
 * to open with an `<h1>` and an intro line; the copy pushed the tiles below the
 * fold, so the heading and its paragraph were removed and the eyebrow now names
 * the catalog on its own. The eyebrow was renamed with them: «کاتالوگ حوزه‌ها»,
 * not the course-catalog wording it carried while the h1 said the same thing.
 *
 * The dictionary entries themselves stay (`publicCourses.title`, `sub`,
 * `domains.sub`, `domains.domainSub`, `viewIntro`): `i18n.test.ts` pins two of
 * them, and retiring catalog copy is a whole-catalog decision, not this one.
 */

const read = (rel: string) => readFileSync(path.join(__dirname, rel), 'utf8');

const publicPage = read('public-page.tsx');
const fa = read('../../../i18n/messages/fa.ts');
const en = read('../../../i18n/messages/en.ts');

describe('catalog page chrome', () => {
  it('opens with no page heading and no intro line', () => {
    // Neither branch renders one: the domain home and the course list share the
    // same "eyebrow → filters → grid" opening.
    expect(publicPage).not.toMatch(/<h1[\s>]/);
    for (const key of [
      'publicCourses.title',
      'publicCourses.sub',
      'publicCourses.domains.sub',
      'publicCourses.domains.domainSub',
    ]) {
      expect(publicPage, key).not.toContain(`t('${key}')`);
    }
  });

  it('drops the per-card «مشاهده معرفی» button', () => {
    expect(publicPage).not.toContain("t('publicCourses.viewIntro')");
    expect(publicPage).not.toContain('catalog-actions');
  });

  it('names the catalog with the domain eyebrow on both views', () => {
    // Twice: the domain home and the course list.
    expect(publicPage.split("t('publicCourses.domains.eyebrow')").length - 1).toBe(2);
  });

  it('reads «کاتالوگ حوزه‌ها» in Persian and «Domain catalog» in English', () => {
    expect(fa).toContain("eyebrow: 'کاتالوگ حوزه‌ها',");
    expect(en).toContain("eyebrow: 'Domain catalog',");
    // The old wording is gone from both dictionaries.
    expect(fa).not.toContain("eyebrow: 'کاتالوگ دوره‌ها',");
    expect(en).not.toContain("eyebrow: 'Course catalog',");
  });

  it('keeps the labels that stand in for the removed heading', () => {
    // With the h1 gone, the filter list's own name and the way back to the
    // domain home are the only labels the page still carries.
    expect(publicPage).toContain("aria-label={t('publicCourses.domains.title')}");
    expect(publicPage).toContain("t('publicCourses.domains.back')");
    expect(publicPage).toContain("t('publicCourses.domains.all')");
    expect(publicPage).toContain("t('publicCourses.domains.emptyDomain')");
  });
});
