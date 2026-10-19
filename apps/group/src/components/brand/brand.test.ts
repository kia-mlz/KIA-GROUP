import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { en, fa } from '@/i18n/messages';
import { BRAND_WORDMARK } from '@/components/brand/BrandMark';

/**
 * kia. rebrand (was Kia Academy).
 *
 * A rename is the one change with no failing test to point at it: every string
 * still compiles, every page still renders. So the invariants live here.
 *
 * The six departments and the wordmark are written in English in both locales,
 * so no Persian spelling of the brand survives in the source tree either. The
 * sweep below proves it: any `Kia Academy`/`KIA ACADEMY`, any `کیا.` wordmark
 * and any `کیا ` department name anywhere, fails this file.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));
/** apps/group — brand → components → src → apps/group */
const WEB = path.join(HERE, '..', '..', '..');
/** repo root — apps/group → apps → repo root */
const ROOT = path.join(WEB, '..', '..');

/** Source roots that can hold a user-visible brand string. */
const SWEEP_ROOTS = [
  path.join(WEB, 'src'),
  path.join(WEB, 'public'),
  path.join(WEB, 'e2e'),
  path.join(ROOT, 'apps', 'api', 'src'),
  path.join(ROOT, 'apps', 'api', 'prisma'),
  path.join(ROOT, 'packages', 'shared', 'src'),
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

describe('kia. brand', () => {
  it('uses one Latin wordmark in both locales', () => {
    expect(BRAND_WORDMARK).toBe('kia.');
    expect(fa.common.brand).toBe('kia.');
    expect(en.common.brand).toBe('kia.');
  });

  it('carries the five-pillar tagline', () => {
    expect(fa.common.tagline).toBe('آموزش · اشتغال · نوآوری · ارتباط · توسعه');
    expect(en.common.tagline).toBe('Learn · Work · Create · Connect · Grow');
  });

  it('leaves no stale company name or Persian brand spelling in the source tree', () => {
    expect(hits('Kia Academy')).toEqual([]);
    expect(hits('KIA ACADEMY')).toEqual([]);
    // Neither the wordmark nor a department name may be spelled in Persian.
    // `کیا ` / `کیا.` catch both forms without matching the city names in the
    // province data (کیاکلا، کیاشهر … have no space or dot after کیا).
    expect(hits('کیا.')).toEqual([]);
    expect(hits('کیا ')).toEqual([]);
  });

  it('names the admin control room after the group, not the academy', () => {
    expect(fa.admin.brandSub).toBe('مرکز کنترل گروه');
    expect(en.admin.brandSub).toBe('Group control center');
  });
});

describe('kia. departments', () => {
  const hub = readFileSync(
    path.join(WEB, 'src', 'components', 'hub', 'DepartmentSolarSystem.tsx'),
    'utf8',
  );

  it('offers six departments, each a real link, in the orbit order', () => {
    // User feedback reordered the rings small → large by planet size: the
    // smallest planet (labs) takes orbit 1 and the largest (community) takes
    // orbit 6. PLANETS is spelled out in that order, and each entry links to
    // the department's route.
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
    // The mock supersedes the old three-column grid on the hub: one ring per
    // department, 36% → 86% of the square stage, each with a comet pulse.
    const css = readFileSync(path.join(WEB, 'src', 'styles', 'hub.css'), 'utf8');
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
    ]).toEqual(['KIA Academy', 'KIA Work', 'KIA Material', 'KIA Event', 'KIA Community', 'KIA Lab']);
    expect([
      enDoors.academyTitle,
      enDoors.workTitle,
      enDoors.materialTitle,
      enDoors.eventsTitle,
      enDoors.communityTitle,
      enDoors.labsTitle,
    ]).toEqual(['KIA Academy', 'KIA Work', 'KIA Material', 'KIA Event', 'KIA Community', 'KIA Lab']);
    expect(faDoors.heading).toBe('دپارتمان‌های kia.');
    expect(enDoors.heading).toBe('kia. departments');
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
    // The old department keys must not linger next to the new ones.
    expect(hub).not.toContain('educationTitle');
  });

  it('creates the two departments that did not exist', () => {
    for (const slug of ['community', 'labs']) {
      // Each department lives in its own route group under src/app.
      const page = path.join(WEB, 'src', 'app', `(${slug})`, slug, 'page.tsx');
      const src = readFileSync(page, 'utf8');
      expect(src, slug).toContain(`t('${slug}.title')`);
      // The header tagline (`.sub`) was removed with the per-page header; the
      // door tile keeps the title and the coming-soon copy.
      expect(src, slug).not.toContain(`t('${slug}.sub')`);
      expect(src, slug).toContain(`t('${slug}.soon')`);
      // A coming-soon department must not look tappable.
      expect(src, slug).toContain('door--soon');
    }
  });
});

describe('brand tagline placement', () => {
  const topBar = readFileSync(path.join(WEB, 'src', 'components', 'layout', 'TopBar.tsx'), 'utf8');
  const css = readFileSync(path.join(WEB, 'src', 'styles', 'layout.css'), 'utf8');
  const responsive = readFileSync(path.join(WEB, 'src', 'styles', 'responsive.css'), 'utf8');

  it('sits under the mark + wordmark, inside the brand button', () => {
    expect(topBar).toContain('<span className="logo-lockup">');
    // UX-27 gave this line a second job: outside a department it is the group's
    // five pillars, inside one it names the parent («kia.»). Either way it
    // is the same row under the lockup, and it stays a dictionary lookup.
    expect(topBar).toContain(
      "<span className=\"brand-tagline\">{dept ? BRAND_WORDMARK : t('common.tagline')}</span>",
    );
    // Lockup first, tagline second: the tagline must follow the wordmark.
    expect(topBar.indexOf('logo-lockup')).toBeLessThan(topBar.indexOf('brand-tagline'));
  });

  it('stacks the brand as a column so the tagline has a row', () => {
    const rule = css.match(/^\.logo \{[^}]*\}/m);
    expect(rule).not.toBeNull();
    expect(rule?.[0]).toMatch(/flex-direction: column;/);
    expect(rule?.[0]).toMatch(/align-items: flex-start;/);
    // Cross-axis centring is what the compact rail needs, not justify-content.
    expect(css).toMatch(/panel-nav--compact \.logo \{[^}]*align-items: center;/);
  });

  it('hides where the brand row is one icon tall', () => {
    expect(css).toMatch(/panel-nav--compact \.brand-tagline \{[^}]*display: none;/);
    expect(responsive).toMatch(/\.topbar \.logo-text,\s*\n\s*\.topbar \.brand-tagline \{[^}]*display: none;/);
  });
});