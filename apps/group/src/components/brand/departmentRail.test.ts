import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { en, fa } from '@/i18n/messages';
import { DEPARTMENTS, departmentForPathname } from '@/components/brand/departments';

/**
 * The rail, personalised per department (UX-27).
 *
 * Opening KIA Lab puts that department's mark, colour and name in the rail
 * instead of the parent group's, with «kia.» left underneath. Three things
 * could quietly break that, so they are pinned here:
 *
 * 1. The registry is the only place a department is written down. It is checked
 *    against the hub cards, so the rail and the grid cannot disagree about a
 *    route, a colour class or a name.
 * 2. Route resolution must respect slash boundaries — `/materiality` is not
 *    Material, and a rail that claims otherwise paints the wrong department.
 * 3. The chip is painted from the department's own tokens, never a hex typed
 *    into `layout.css`, so it cannot drift from the card it came from.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB_SRC = path.join(HERE, '..', '..');
const read = (...parts: string[]) =>
  readFileSync(path.join(WEB_SRC, ...parts), 'utf8');

/** The seven brand tokens now live in @kia./brand (imported before base.css). */
const brandsCss = readFileSync(
  path.join(WEB_SRC, '..', '..', '..', 'packages', 'brand', 'css', 'brands.css'),
  'utf8',
);
const layout = read('styles', 'layout.css');
const topBar = read('components', 'layout', 'TopBar.tsx');
/** The departments hub now renders as the solar system; the registry mapping
 * ('slug → href') lives there and must stay in step with the rail. */
const hub = read('components', 'hub', 'DepartmentSolarSystem.tsx');

/** Read a dotted message key out of a catalogue. */
const lookup = (catalogue: unknown, key: string): string | undefined =>
  key
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined,
      catalogue,
    ) as string | undefined;

const SLUGS = DEPARTMENTS.map((d) => d.slug);

describe('department registry', () => {
  it('holds exactly the six departments, each with its own route and name', () => {
    expect(SLUGS).toEqual(['academy', 'work', 'material', 'events', 'community', 'labs']);
    expect(new Set(DEPARTMENTS.map((d) => d.href)).size).toBe(6);
    expect(new Set(DEPARTMENTS.map((d) => d.titleKey)).size).toBe(6);
    for (const dept of DEPARTMENTS) {
      expect(dept.href, dept.slug).toMatch(/^\/[a-z]+$/);
    }
  });

  it('gives every department a colour token and a translated name', () => {
    for (const dept of DEPARTMENTS) {
      expect(brandsCss, dept.slug).toContain(`--dept-${dept.slug}:`);
      expect(lookup(fa, dept.titleKey), `fa ${dept.titleKey}`).toBeTruthy();
      expect(lookup(en, dept.titleKey), `en ${dept.titleKey}`).toBeTruthy();
    }
  });

  it('agrees with the hub planet registry on every route, colour class and name', () => {
    // The solar-system hub spells its planet registry out as mapped entries;
    // this comparison is what keeps the two descriptions of a department in
    // step. Every slug must carry its own dept-- class and its own titleKey.
    for (const dept of DEPARTMENTS) {
      expect(hub, dept.slug).toContain(`href: '${dept.href}'`);
      expect(hub, dept.slug).toMatch(new RegExp(`slug: '${dept.slug}'`));
      expect(hub, dept.slug).toContain(`titleKey: '${dept.titleKey}'`);
    }
  });
});

describe('departmentForPathname', () => {
  it('claims each department route and everything below it', () => {
    expect(departmentForPathname('/labs')?.slug).toBe('labs');
    expect(departmentForPathname('/tracks/technology')?.slug).toBe('academy');
    expect(departmentForPathname('/material/pdf')?.slug).toBe('material');
    for (const dept of DEPARTMENTS) {
      expect(departmentForPathname(dept.href)?.slug, dept.href).toBe(dept.slug);
    }
  });

  it('claims nothing outside the six departments', () => {
    for (const pathname of [
      '/',
      '/home',
      '/dashboard',
      '/courses',
      '/education',
      '/learn/abc',
      '/admin',
      undefined,
      null,
      '',
    ]) {
      expect(departmentForPathname(pathname), String(pathname)).toBeNull();
    }
  });

  it('matches on a slash boundary, not a bare prefix', () => {
    // `/materiality` starting with `/material` is exactly the bug a
    // `startsWith(href)` implementation would ship.
    expect(departmentForPathname('/materiality')).toBeNull();
    expect(departmentForPathname('/labsx')).toBeNull();
    expect(departmentForPathname('/events-archive')).toBeNull();
    expect(departmentForPathname('/tracksy')).toBeNull();
  });
});

describe('department rail in TopBar', () => {
  it('resolves the department from the route it is on', () => {
    expect(topBar).toContain('usePathname');
    expect(topBar).toContain('departmentForPathname(pathname)');
  });

  it('puts the department token in scope for the whole rail', () => {
    expect(topBar).toContain("dept ? ` dept--${dept.slug}` : ''");
  });

  it('swaps the name and the supporting line, and recolours the emblem', () => {
    // One emblem element either way: the rail keeps kia.'s own mark and
    // only the colour changes, so the shape never shifts between departments.
    expect(topBar.match(/<BrandMark /g)).toHaveLength(1);
    expect(topBar).toContain('<BrandMark className="logo-mark" size={26} title="" />');
    expect(topBar).not.toContain('logo-dept-emblem');
    expect(topBar).toContain('<span className="logo-text">{dept ? t(dept.titleKey) : BRAND_WORDMARK}</span>');
    // Inside a department the supporting line becomes the parent name.
    expect(topBar).toContain(
      "<span className=\"brand-tagline\">{dept ? BRAND_WORDMARK : t('common.tagline')}</span>",
    );
  });

  it('names the button after whichever brand it is showing', () => {
    expect(topBar).toContain('aria-label={dept ? t(dept.titleKey) : BRAND_WORDMARK}');
  });
});

describe('department rail styles', () => {
  /** The global (unindented) rule for a selector, not a media-query copy. */
  const rule = (selector: string) => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = layout.match(new RegExp(`^${escaped} \\{[^}]*\\}`, 'm'));
    expect(match, selector).not.toBeNull();
    return match?.[0] ?? '';
  };

  it('repaints the emblem from the department token, not a hex of its own', () => {
    const mark = rule('.logo--dept .logo-mark');
    expect(mark).toMatch(/color: var\(--dept\);/);
    expect(mark).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });

  it('keeps the parent name in the parent gold', () => {
    expect(rule('.logo--dept .brand-tagline')).toMatch(/color: var\(--group-gold\);/);
  });

  it('draws the underline in the department colour and shows it on the rail only', () => {
    const bar = rule('.logo-dept-bar');
    expect(bar).toMatch(/background: var\(--dept\);/);
    expect(bar).toMatch(/display: none;/);
    // Enabled inside the desktop rail, and off again in the icon-only rail. The
    // enabling selector has to out-specify the global `display: none`, since a
    // media query adds none of its own.
    expect(layout).toMatch(
      /@media \(min-width: 901px\)[\s\S]*?\.logo--dept \.logo-dept-bar \{\s*\n\s*display: block;/,
    );
    expect(layout).toMatch(
      /\.panel-shell \.topbar\.panel-nav--compact \.logo-dept-bar \{\s*\n\s*display: none;/,
    );
  });

  it('stops the generic hover from recolouring a department name', () => {
    // `.logo:hover` paints the button brand-blue, which inheritance would hand
    // to the department name. The emblem has its own declaration, so it keeps
    // the department colour on hover.
    expect(rule('.logo--dept:hover')).toMatch(/color: var\(--text\);/);
  });

  it('leaves the parent emblem on the reserved gold', () => {
    expect(rule('.logo-mark')).toMatch(/color: var\(--group-gold\);/);
  });
});
