import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * The page background has one owner: `body`'s flat `--bg` plus the fixed
 * `.site-aurora` wash (`components/layout/SiteAurora.tsx`, rendered by
 * `SiteChrome` for every non-admin route). Admin keeps its own dark shell.
 *
 * Two copies of the same wash used to coexist — a `--gradient-aurora` image on
 * `body` plus the aurora layer — and page shells repainted over both
 * (`.dash-panel`, `.material-studio-root` with its own orbs), so routes drifted
 * apart. These tests pin the invariant: `body` paints the base colour only, the
 * old token is gone, the shared layer is wired, and no page shell paints a
 * background of its own.
 */

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Page roots: full-viewport wrappers whose background must stay the site's. */
const PAGE_ROOTS = [
  'site-main',
  'panel-content',
  'dash-panel',
  'landing',
  'catalog-shell',
  'results',
  'lesson-shell',
  'legal-shell',
  'wizard-shell',
  'test-shell',
  'result-shell',
  'gate',
  'challenge-shell',
  'rewards',
  'auth-shell',
  'cart-shell',
  'checkout-result',
  'material-studio-root',
  'material-page-shell',
];
const ROOT_CLASSES = new Set(PAGE_ROOTS);
const PAINT_PROPS = ['background', 'background-color', 'background-image'];
/** `transparent` paints nothing — anything else is a competing background. */
const NEUTRAL = new Set(['transparent', 'none', 'inherit', 'initial', 'unset']);

function walk(dir: string, extensions: string[]): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      out.push(...walk(full, extensions));
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      out.push(full);
    }
  }
  return out;
}

type Rule = { prelude: string; body: string };

/** Flat CSS rule list (at-rules are unwrapped, their prelude is dropped). */
function cssRules(src: string): Rule[] {
  const withoutComments = src.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules: Rule[] = [];
  let depth = 0;
  let prelude = '';
  let bodyStart = 0;
  for (let i = 0; i < withoutComments.length; i += 1) {
    const char = withoutComments[i];
    if (char === '{') {
      if (depth === 0) {
        prelude = withoutComments.slice(bodyStart, i);
        bodyStart = i + 1;
      }
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        const head = prelude.trim();
        const body = withoutComments.slice(bodyStart, i);
        if (head.startsWith('@')) rules.push(...cssRules(`${body}{}`));
        else if (head && !head.includes('{')) rules.push({ prelude: head, body });
        bodyStart = i + 1;
      }
    }
  }
  return rules;
}

function declarations(body: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const part of body.split(';')) {
    const index = part.indexOf(':');
    if (index === -1) continue;
    map.set(part.slice(0, index).trim().toLowerCase(), part.slice(index + 1).trim());
  }
  return map;
}

/** Last compound of one comma-separated selector (`.a .b` → `.b`). */
function lastCompound(selector: string): string {
  return selector.trim().split(/[\s>+~]+/).pop() ?? '';
}

describe('page background', () => {
  // The Material Studio package ships site CSS too — it used to live under
  // src/features/material and is now kia./kia-material/resources.
  const MATERIAL = path.resolve(SRC, '../../../kia./kia-material/resources');
  const sheets = [...walk(SRC, ['.css']), ...walk(MATERIAL, ['.css'])];
  const rules = sheets.flatMap((file) =>
    cssRules(readFileSync(file, 'utf8')).map((rule) => ({
      file: path.relative(SRC, file),
      ...rule,
    })),
  );

  const bodyRule = rules.find((rule) => rule.prelude.trim().split(',').includes('body'));
  const auroraRule = rules.find((rule) =>
    rule.prelude.split(',').some((selector) => lastCompound(selector) === '.site-aurora'),
  );
  const siteChrome = readFileSync(path.join(SRC, 'components/layout/SiteChrome.tsx'), 'utf8');

  it('knows the page roots it is guarding', () => {
    const declared = new Set(
      rules.flatMap((rule) =>
        rule.prelude
          .split(',')
          .map((selector) => lastCompound(selector).replace(/^\./, ''))
          .filter((compound) => ROOT_CLASSES.has(compound)),
      ),
    );
    for (const root of ['site-main', 'dash-panel', 'landing', 'material-studio-root']) {
      expect([...declared]).toContain(root);
    }
  });

  it('paints the page gradient on body and nothing else', () => {
    expect(bodyRule).toBeDefined();
    const decls = declarations(bodyRule!.body);
    const bg = decls.get('background') ?? '';
    // The page is one soft gradient built from --bg → --bg-elevated (light theme).
    expect(bg).toMatch(/^linear-gradient\(.*var\(--bg\).*var\(--bg-elevated\).*\)$/);
    expect(decls.get('background-image')).toBeUndefined();
    expect(decls.get('background-attachment')).toBeUndefined();
    expect(decls.get('background-repeat')).toBeUndefined();
  });

  it('has no second aurora token competing with .site-aurora', () => {
    const offenders: string[] = [];
    const sources = [...sheets, ...walk(SRC, ['.tsx', '.ts']), ...walk(MATERIAL, ['.tsx', '.ts'])].filter(
      (file) => !file.endsWith('.test.ts'),
    );
    for (const file of sources) {
      const src = readFileSync(file, 'utf8');
      if (src.includes('--gradient-aurora') || src.includes('--gradient-hero')) {
        offenders.push(path.relative(SRC, file));
      }
    }
    expect(offenders, 'The shared wash lives in SiteAurora; drop extra page gradients.').toEqual([]);
  });

  it('wires the fixed aurora layer into every non-admin route', () => {
    expect(auroraRule).toBeDefined();
    const decls = declarations(auroraRule!.body);
    expect(decls.get('position')).toBe('fixed');
    expect(decls.get('inset')).toBe('0');
    expect(siteChrome).toMatch(/!isAdminRoute \? <SiteAurora \/>/);
  });

  it('never lets a page shell paint its own background', () => {
    const offenders: string[] = [];
    for (const rule of rules) {
      if (rule.prelude.includes('admin')) continue;
      const targets = rule.prelude
        .split(',')
        .map((selector) => lastCompound(selector).replace(/^\./, ''))
        .filter((compound) => ROOT_CLASSES.has(compound));
      if (!targets.length) continue;

      const decls = declarations(rule.body);
      for (const property of PAINT_PROPS) {
        const value = decls.get(property);
        if (!value || NEUTRAL.has(value.toLowerCase())) continue;
        offenders.push(`${rule.file} → ${rule.prelude.trim()} { ${property}: ${value} }`);
      }
    }

    expect(
      offenders,
      `Page shells must stay transparent so every route shares the body + .site-aurora background:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });

  it('keeps .site-aurora the only layer on the background plane', () => {
    // `--z-base` is the plane behind page content; a second fixed wash has to
    // claim it, so this catches any rival background layer (overlays use the
    // much higher --z-modal / --z-toast planes instead).
    const rivals: string[] = [];
    for (const rule of rules) {
      const decls = declarations(rule.body);
      if (decls.get('z-index') !== 'var(--z-base)') continue;
      const paint = decls.get('background') ?? decls.get('background-image');
      if (!paint || NEUTRAL.has(paint.toLowerCase())) continue;
      if (lastCompound(rule.prelude) === '.site-aurora') continue;
      rivals.push(`${rule.file} → ${rule.prelude.trim()} { z-index: var(--z-base) }`);
    }
    expect(rivals, 'Add the wash to .site-aurora instead of a rival background layer.').toEqual(
      [],
    );
  });

  it('keeps the aurora component painting the shared layer', () => {
    const component = readFileSync(path.join(SRC, 'components/layout/SiteAurora.tsx'), 'utf8');
    for (const blob of ['site-aurora-a', 'site-aurora-b', 'site-aurora-c']) {
      expect(component).toContain(blob);
      expect(rules.some((rule) => lastCompound(rule.prelude) === `.${blob}`)).toBe(true);
    }
  });
});
