import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  BRAND_TOKENS,
  DARK_INK,
  GROUP_COLOR,
  contrastRatio,
  normalizeHex,
  readableInk,
} from '@kia./brand';

/**
 * kia. colour separation.
 *
 * Three rules, and the second exists only because of the first:
 *
 * 1. Every department owns one colour, and its tile *and* its logo both read
 *    from it — a card in the hub and the page it opens can never drift apart.
 * 2. `--group-gold` (#ffc864) is kia.'s alone. No department may use it.
 *    This is not free: `--amber-400` has always been #ffc864, and `tint--amber`
 *    is painted on tiles that live *inside* department pages, so its fill had
 *    to move to `--amber-500` or gold would show up inside a department.
 * 3. The six values are the brand's published hexes, and each fill carries
 *    whichever ink actually reads on it.
 *
 * The tests read the tokens out of the stylesheet and check the arithmetic, so
 * a "close enough" colour cannot slip in: the exact official hexes, six
 * distinct values, and measured contrast for the ink.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STYLES = path.join(HERE, '..', '..', 'styles');
/** The token package is the single source of truth for the seven brand values. */
const BRANDS_CSS = path.join(HERE, '..', '..', '..', '..', '..', 'packages', 'brand', 'css', 'brands.css');
const read = (f: string) => readFileSync(path.join(STYLES, f), 'utf8');

const base = read('base.css');
const brandsCss = readFileSync(BRANDS_CSS, 'utf8');

const SLUGS = BRAND_TOKENS.map((t) => t.slug);

const token = (name: string) => {
  const m = brandsCss.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  expect(m, `${name} must be defined as a hex token`).not.toBeNull();
  return m?.[1].toLowerCase() ?? '';
};

const deptColour = (slug: string) => token(`dept-${slug}`);

describe('kia. parent colour', () => {
  it('reserves the parent gold for kia.', () => {
    expect(token('group-gold')).toBe(GROUP_COLOR.toLowerCase());
  });

  it('paints every parent-brand emblem in that gold', () => {
    // The KIA Group emblem: rail, footer, guest landing, auth pages, admin.
    for (const [file, selector] of [
      ['layout.css', '.logo-mark'],
      ['landing.css', '.landing-brand-mark'],
      ['auth.css', '.education-brand-mark'],
      ['admin.css', '.admin-brand-mark'],
    ] as const) {
      const rule = read(file).match(new RegExp(`\\${selector} \\{[^}]*\\}`));
      expect(rule, `${file}: ${selector}`).not.toBeNull();
      expect(rule?.[0], `${file}: ${selector}`).toMatch(/color: var\(--group-gold\);/);
    }
  });
});

describe('department colours', () => {
  it('gives each department its own colour', () => {
    const colours = SLUGS.map(deptColour);
    expect(colours.filter(Boolean)).toHaveLength(6);
    expect(new Set(colours).size, 'departments must not share a colour').toBe(6);
  });

  it('keeps the parent gold out of every department', () => {
    for (const slug of SLUGS) {
      expect(deptColour(slug), slug).not.toBe(GROUP_COLOR.toLowerCase());
    }
  });

  it('carries the official logo colours verbatim, from the brand package', () => {
    // These six hexes are kia.'s published brand values, not a palette
    // tuned for this UI. The values live in @kia./brand (src/tokens.ts)
    // and are re-declared in css/brands.css — this suite keeps the stylesheet
    // and the package pinned to each other so neither can drift.
    expect(
      Object.fromEntries(SLUGS.map((slug) => [slug, deptColour(slug)])),
    ).toEqual(Object.fromEntries(BRAND_TOKENS.map((t) => [t.slug, t.color.toLowerCase()])));
  });

  it('puts the more readable ink on every fill', () => {
    // The official colours span very light to very dark fills, so ink choice
    // is a measurement, not a preference. Each tile must wear whichever of
    // the two inks wins — computed by @kia./brand (readableInk), which
    // also means a future recolour cannot quietly leave the wrong ink behind.
    for (const tokenInfo of BRAND_TOKENS) {
      const fill = deptColour(tokenInfo.slug);
      const rule = base.match(new RegExp(`\\.dept--${tokenInfo.slug} \\{[^}]*\\}`));
      const declared = rule?.[0].match(/--tile-on-fill:\s*([^;]+);/)?.[1].trim() ?? '';
      expect(declared, `${tokenInfo.slug} must read one of the two inks`).toMatch(
        new RegExp(`^(#ffffff|var\\(--ink-950\\))$`),
      );
      const best = normalizeHex(readableInk(fill));
      const declaredHex = declared === '#ffffff' ? '#ffffff' : DARK_INK.toLowerCase();
      expect(
        declaredHex,
        `${tokenInfo.slug}: ${declared} on ${fill}, but the measured better ink is ${best} ` +
          `(${contrastRatio(fill, '#ffffff').toFixed(2)}:1 white vs ${contrastRatio(fill, DARK_INK).toFixed(2)}:1 dark)`,
      ).toBe(best);
    }
  });

  it('gives KIA Academy indigo and KIA Event an orange presence, as the brand specifies', () => {
    // #6464ff reads as blue; it is also the long-standing academy hue, so the
    // department keeps its identity through the rebrand. Events carries the
    // official orange — distinct from the parent gold.
    const [, r, g, b] = /^#(..)(..)(..)$/.exec(deptColour('academy')) ?? [];
    const [red, green, blue] = [r, g, b].map((n) => parseInt(n, 16));
    expect(blue).toBeGreaterThan(red);
    expect(blue).toBeGreaterThan(green);
    const [, er, eg, eb] = /^#(..)(..)(..)$/.exec(deptColour('events')) ?? [];
    const [ered, egreen, eblue] = [er, eg, eb].map((n) => parseInt(n, 16));
    expect(ered).toBeGreaterThan(egreen);
    expect(ered).toBeGreaterThan(eblue);
  });

  it('paints each department tile from its own token', () => {
    for (const slug of SLUGS) {
      expect(base, slug).toMatch(
        new RegExp(`\\.dept--${slug} \\{\\s*\\n\\s*--dept: var\\(--dept-${slug}\\);`),
      );
    }
    // Tile surface, hairline, tint and hover all derive from that one token.
    const shared = base.match(/\.dept--academy,\n\.dept--work,[\s\S]*?\n\}/);
    expect(shared).not.toBeNull();
    expect(shared?.[0]).toMatch(/--tile-fill: var\(--dept\);/);
    expect(shared?.[0]).toMatch(/--tile-border-hover: var\(--dept\);/);
  });

  it('paints each department logo from the same token as its tile', () => {
    for (const slug of SLUGS) {
      expect(base, slug).toMatch(
        new RegExp(`\\.dept-mark--${slug} \\{ color: var\\(--dept-${slug}\\); \\}`),
      );
    }
  });

  it('never lets an amber tile wear the parent gold', () => {
    // `tint--amber` paints sub-tiles that live inside department pages.
    const rule = base.match(/\.tint--amber \{[^}]*\}/);
    expect(rule).not.toBeNull();
    expect(rule?.[0]).toMatch(/--tile-fill: var\(--amber-500\);/);
    expect(rule?.[0]).not.toMatch(/--tile-fill: var\(--amber-400\);/);
  });
});

describe('department marks in the markup', () => {
  const appDir = path.join(HERE, '..', '..', 'app');

  it('keeps inline dept marks off the department hub pages', () => {
    // Feedback: the per-page header (mark + title + tagline) was removed from
    // every department hub — the department identity now lives only in the
    // TopBar rail, so a hub page must not grow a second inline mark.
    const page = {
      academy: path.join(appDir, '(academy)', 'tracks', 'page.tsx'),
      work: path.join(appDir, '(work)', 'freelance', 'page.tsx'),
      material: pathFile(path.join(appDir, '..', '..', '..', '..', 'kia.', 'kia-material', 'resources', 'MaterialStudio.tsx')),
      events: path.join(appDir, '(events)', 'events', 'page.tsx'),
      community: path.join(appDir, '(community)', 'community', 'page.tsx'),
      labs: path.join(appDir, '(labs)', 'labs', 'page.tsx'),
    } as Record<string, string>;
    for (const [slug, file] of Object.entries(page)) {
      const src = readFileSync(file, 'utf8');
      expect(src, slug).not.toContain(`dept-mark--${slug}`);
    }
  });

  it('paints a department’s own tile in its own colour', () => {
    // KIA Community’s page showed a `tint--violet` coming-soon tile — which is
    // Material's violet — beside its own logo. A department page must not
    // introduce a second department's colour.
    for (const slug of ['community', 'labs'] as const) {
      const src = readFileSync(
        path.join(appDir, `(${slug})`, slug, 'page.tsx'),
        'utf8',
      );
      expect(src, slug).toContain(`door--soon dept--${slug}`);
      expect(src, slug).not.toMatch(/door--soon tint--/);
    }
  });
});

function pathFile(p: string) {
  return path.normalize(p);
}