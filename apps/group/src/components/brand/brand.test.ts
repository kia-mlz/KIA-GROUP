import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { en, fa } from '@/i18n/messages';
import { BRAND_WORDMARK } from '@/components/brand/BrandMark';

/**
 * Kia rebrand (was KIA. / kia. — and earlier Kia Academy / Kia Group).
 *
 * A rename is the one change with no failing test to point at it: every string
 * still compiles, every page still renders. So the invariants live here.
 *
 * English UI uses Latin «Kia»; Persian UI uses «کیا». Department names stay
 * Latin in both locales («Kia Academy», …). Stale spellings (KIA., Kia Group,
 * کیا گروه, کیا.) must not reappear in user-visible source.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));
/** apps/group — brand → components → src → apps/group */
const WEB_ROOT = path.join(HERE, '..', '..', '..');
/** repo root — apps/group → apps → repo root */
const ROOT = path.join(WEB_ROOT, '..', '..');

/** Source roots that can hold a user-visible brand string. */
const SWEEP_ROOTS = [
  path.join(WEB_ROOT, 'src'),
  path.join(WEB_ROOT, 'public'),
  path.join(WEB_ROOT, 'e2e'),
  path.join(ROOT, 'apps', 'api', 'src'),
  path.join(ROOT, 'apps', 'api', 'prisma'),
  path.join(ROOT, 'packages', 'shared', 'src'),
  path.join(ROOT, 'packages', 'platform', 'src'),
  path.join(ROOT, 'packages', 'brand', 'src'),
];

/** Build output and env files: generated, or local-only and git-ignored. */
const SKIP_DIRS = new Set(['node_modules', '.next', 'dist', '.git', 'coverage']);
const SKIP_FILES = new Set(['.env', '.env.local']);
/** This file names the old brand on purpose, so it cannot police itself. */
const SELF = fileURLToPath(import.meta.url);

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (!SKIP_FILES.has(entry)) yield full;
  }
}

const hits = (needle: string) => {
  const found: string[] = [];
  for (const root of SWEEP_ROOTS) {
    for (const file of walk(root)) {
      if (file === SELF) continue;
      const text = readFileSync(file, 'utf8');
      text.split('\n').forEach((line, i) => {
        if (!line.includes(needle)) return;
        found.push(`${path.relative(ROOT, file)}:${i + 1}`);
      });
    }
  }
  return found;
};

describe('Kia brand', () => {
  it('uses locale-aware brand names', () => {
    expect(BRAND_WORDMARK).toBe('Kia');
    expect(fa.common.brand).toBe('کیا');
    expect(en.common.brand).toBe('Kia');
  });

  it('never spells the obsolete KIA. wordmark in either dictionary', () => {
    const walkDict = (node: unknown, trail: string): string[] => {
      if (typeof node === 'string') {
        return node.includes('KIA.') ? [`${trail}: ${node}`] : [];
      }
      if (node && typeof node === 'object') {
        return Object.entries(node).flatMap(([key, value]) =>
          walkDict(value, `${trail}.${key}`),
        );
      }
      return [];
    };
    expect([...walkDict(fa, 'fa'), ...walkDict(en, 'en')]).toEqual([]);
  });

  it('carries the five-pillar tagline', () => {
    expect(fa.common.tagline).toBe('آموزش · اشتغال · نوآوری · ارتباط · توسعه');
    expect(en.common.tagline).toBe('Learn · Work · Create · Connect · Grow');
  });

  it('leaves no stale company or period-wordmark spellings in the source tree', () => {
    expect(hits('Kia Group')).toEqual([]);
    expect(hits('KIA Group')).toEqual([]);
    expect(hits('کیا گروه')).toEqual([]);
    expect(hits('کیاگروپ')).toEqual([]);
    expect(hits('KIA.')).toEqual([]);
    // Trailing-period Persian wordmark from the previous rebrand.
    expect(hits('کیا.')).toEqual([]);
  });

  it('names the admin panel without the old Group label', () => {
    expect(fa.admin.brandSub).toBe('پنل مدیریت');
    expect(en.admin.brandSub).toBe('Admin panel');
  });
});

describe('Kia departments', () => {
  const hub = readFileSync(
    path.join(WEB_ROOT, 'src', 'components', 'hub', 'DepartmentSolarSystem.tsx'),
    'utf8',
  );

  it('offers six departments, each a real link, in the orbit order', () => {
    const hrefs = [...hub.matchAll(/href: '([^']+)'/g)].map((m) => m[1]);
    expect(hrefs).toEqual([
      '/labs',
      '/freelance',
      '/events',
      '/tracks',
      '/material',
      '/community',
    ]);
  });

  it('lays the departments out on six orbit rings', () => {
    const css = readFileSync(path.join(WEB_ROOT, 'src', 'styles', 'hub.css'), 'utf8');
    for (const orbit of ['1', '2', '3', '4', '5', '6']) {
      expect(css).toMatch(new RegExp(`\\.solar__orbit--${orbit} \\{`));
      expect(css).toMatch(new RegExp(`\\.solar__pulse--${orbit} \\{`));
    }
    expect(css).toContain('aspect-ratio: 1 / 1;');
  });

  it('titles them as one family in both languages', () => {
    const faDoors = fa.dashboard.doors as Record<string, string>;
    const enDoors = en.dashboard.doors as Record<string, string>;
    expect([
      faDoors.academyTitle,
      faDoors.workTitle,
      faDoors.materialTitle,
      faDoors.eventsTitle,
      faDoors.communityTitle,
      faDoors.labsTitle,
    ]).toEqual(['Kia Academy', 'Kia Work', 'Kia Material', 'Kia Event', 'Kia Community', 'Kia Lab']);
    expect([
      enDoors.academyTitle,
      enDoors.workTitle,
      enDoors.materialTitle,
      enDoors.eventsTitle,
      enDoors.communityTitle,
      enDoors.labsTitle,
    ]).toEqual(['Kia Academy', 'Kia Work', 'Kia Material', 'Kia Event', 'Kia Community', 'Kia Lab']);
    expect(faDoors.heading).toBe('دپارتمان‌های کیا');
    expect(enDoors.heading).toBe('Kia departments');
  });

  it('routes every planet title through the dictionary, never a literal', () => {
    const titles = [...hub.matchAll(/dashboard\.doors\.(\w+Title)/g)].map((m) => m[1]);
    expect(titles.sort()).toEqual([
      'academyTitle',
      'communityTitle',
      'eventsTitle',
      'labsTitle',
      'materialTitle',
      'workTitle',
    ]);
    expect(hub).not.toContain('educationTitle');
  });

  it('creates the two departments that did not exist', () => {
    for (const slug of ['community', 'labs']) {
      const page = path.join(WEB_ROOT, 'src', 'app', `(${slug})`, slug, 'page.tsx');
      const src = readFileSync(page, 'utf8');
      expect(src, slug).toContain(`t('${slug}.title')`);
      expect(src, slug).not.toContain(`t('${slug}.sub')`);
      expect(src, slug).toContain(`t('${slug}.soon')`);
      expect(src, slug).toContain('door--soon');
    }
  });
});

describe('brand tagline placement', () => {
  const topBar = readFileSync(path.join(WEB_ROOT, 'src', 'components', 'layout', 'TopBar.tsx'), 'utf8');
  const css = readFileSync(path.join(WEB_ROOT, 'src', 'styles', 'layout.css'), 'utf8');
  const responsive = readFileSync(path.join(WEB_ROOT, 'src', 'styles', 'responsive.css'), 'utf8');

  it('sits under the mark + wordmark, inside the brand button', () => {
    expect(topBar).toContain('<span className="logo-lockup">');
    expect(topBar).toContain(
      "<span className=\"brand-tagline\">{dept ? t('common.brand') : t('common.tagline')}</span>",
    );
    expect(topBar.indexOf('logo-lockup')).toBeLessThan(topBar.indexOf('brand-tagline'));
  });

  it('stacks the brand as a column so the tagline has a row', () => {
    const rule = css.match(/^\.logo \{[^}]*\}/m);
    expect(rule).not.toBeNull();
    expect(rule?.[0]).toMatch(/flex-direction: column;/);
    expect(rule?.[0]).toMatch(/align-items: flex-start;/);
    expect(css).toMatch(/panel-nav--compact \.logo \{[^}]*align-items: center;/);
  });

  it('hides where the brand row is one icon tall', () => {
    expect(css).toMatch(/panel-nav--compact \.brand-tagline \{[^}]*display: none;/);
    expect(responsive).toMatch(/\.topbar \.logo-text,\s*\n\s*\.topbar \.brand-tagline \{[^}]*display: none;/);
  });
});
