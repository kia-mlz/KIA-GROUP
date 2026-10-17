import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * The sidebar width toggle (`panel-nav-size-toggle`) is a layout preference,
 * not a destination, so it closes the sidebar nav: the last row under the
 * rewards link. It used to sit right after the logo, above the account cluster
 * and the whole nav list. These tests pin the placement so it cannot drift
 * back to the top of the bar.
 */

const TOP_BAR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'TopBar.tsx');
const SRC = path.dirname(fileURLToPath(import.meta.url));
const src = readFileSync(TOP_BAR, 'utf8');

const navStart = src.indexOf('<nav id="site-top-nav"');
const navEnd = src.indexOf('</nav>');
const nav = navStart === -1 ? '' : src.slice(navStart, navEnd);

const occurrences = (needle: string) => src.split(needle).length - 1;

describe('TopBar sidebar width toggle', () => {
  /** UX-20 moved it out of the nav into the shared preferences parent. */
  const TOGGLE_CLASS = 'rail-control panel-nav-size-toggle';
  const controlsStart = src.indexOf('<div className="rail-controls">');
  const controls = controlsStart === -1 ? '' : src.slice(controlsStart);

  it('renders the toggle once, inside the shared preferences parent', () => {
    expect(occurrences(TOGGLE_CLASS)).toBe(1);
    expect(controlsStart).toBeGreaterThan(-1);
    expect(controls).toContain(TOGGLE_CLASS);
    // The nav is navigation only; the width control no longer lives there.
    expect(nav).not.toContain('panel-nav-size-toggle');
  });

  it('keeps the toggle out of the primary bar row (logo / burger)', () => {
    const primaryStart = src.indexOf('<div className="topbar-primary">');
    const primaryEnd = src.indexOf('<nav id="site-top-nav"');
    expect(primaryStart).toBeGreaterThan(-1);
    expect(src.slice(primaryStart, primaryEnd)).not.toContain('panel-nav-size-toggle');
  });

  it('keeps the toggle as the last row of the preferences parent', () => {
    const toggle = controls.indexOf(TOGGLE_CLASS);
    expect(toggle).toBeGreaterThan(-1);
    // Nothing may follow the toggle inside the parent (closing tags are fine).
    const after = controls.indexOf('</button>', toggle);
    expect(after).toBeGreaterThan(-1);
    expect(controls.slice(after + '</button>'.length)).not.toMatch(/<[A-Za-z]/);
  });

  it('holds no rewards link \u2014 that row lives in the account menu', () => {
    expect(nav).not.toContain('href="/rewards"');
    const menuStart = src.indexOf('<div className="user-dropdown">');
    expect(menuStart).toBeGreaterThan(-1);
    expect(src.slice(menuStart)).toContain('href="/rewards"');
    expect(src.slice(menuStart)).toContain("t('nav.rewards')");
  });

  it('stays a named control for assistive tech', () => {
    expect(src).toMatch(
      /className="rail-control panel-nav-size-toggle"[\s\S]{0,240}?aria-label=\{t\('nav\.resizeMenu'\)\}/,
    );
  });
});

describe('TopBar sidebar width presets', () => {
  /** Two steps only: «معمولی» (default) and «کوچیک» (compact). */
  const PRESETS = ["'default'", "'compact'"];

  it('cycles between exactly two sizes', () => {
    expect(src).toMatch(/PANEL_NAV_SIZES: PanelNavSize\[\] = \[[^\]]+\]/);
    const declared = src
      .match(/PANEL_NAV_SIZES: PanelNavSize\[\] = \[([^\]]+)\]/)?.[1]
      .split(',')
      .map((entry) => entry.trim());
    expect(declared).toEqual(PRESETS);
  });

  it('has no wide preset left in code, CSS or dictionaries', () => {
    const offenders: string[] = [];
    const files = [
      TOP_BAR,
      path.join(SRC, '../../styles/layout.css'),
      path.join(SRC, '../../i18n/messages/fa.ts'),
      path.join(SRC, '../../i18n/messages/en.ts'),
    ];
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      if (text.includes('menuSizeWide') || text.includes('panel-nav--wide')) {
        offenders.push(path.relative(SRC, file));
      }
    }
    expect(offenders, 'The wide sidebar step is gone — keep the presets to two.').toEqual([]);
  });

  it('labels only the two sizes it ships', () => {
    expect(src).toContain("t('nav.menuSizeDefault')");
    expect(src).toContain("t('nav.menuSizeCompact')");
  });
});

describe('TopBar departments chip', () => {
  const css = readFileSync(path.join(SRC, '../../styles/layout.css'), 'utf8');
  const chip = src.indexOf('className="user-chip departments-chip"');
  const menuWrap = src.indexOf('<div className="user-menu-wrap"');

  it('sits in the account cluster, directly under the user chip', () => {
    expect(chip).toBeGreaterThan(-1);
    expect(menuWrap).toBeGreaterThan(-1);
    expect(chip).toBeGreaterThan(menuWrap);
    // DOM order is not enough: `.user-menu-wrap` carries `order: 1`, so the
    // chip needs `order: 2` to actually render below it.
    expect(css).toMatch(/\.panel-shell \.departments-chip\s*\{[^}]*order: 2;/);
  });

  it('links to the departments hub through HOME_PATH', () => {
    expect(src).toMatch(/<Link href=\{HOME_PATH\} className="user-chip departments-chip"/);
    expect(src).toContain("t('nav.departments')");
  });

  it('keeps its icon in the compact rail and stays named', () => {
    // The compact hide list used `.user-chip svg`, which also matched this
    // chip's `LayoutGrid` mark and left an empty pill in the icon-only rail.
    expect(css).toContain('.panel-nav--compact .user-chip-caret');
    expect(css).not.toContain('.panel-nav--compact .user-chip svg');
    expect(src).toMatch(/className="user-chip departments-chip" aria-label=\{t\('nav\.departments'\)\}/);
    expect(src).toContain('className="user-chip-caret"');
  });

  it('stays named in the compact rail: the account chip has an aria-label too', () => {
    // Same reason as the chip above: `.user-chip-name` is `display: none` in the
    // icon-only rail and `.avatar` is `aria-hidden`, so without an explicit
    // label the account button had no accessible name at all.
    // The rail's first `<button>` is the brand mark, so anchor on the chip and
    // read its own element. (The opening tag holds `onClick={() => ...}`, so
    // it cannot be cut at the first `>`.)
    const chip = src.indexOf('className="user-chip"');
    const block = src.slice(chip, src.indexOf('</button>', chip));
    expect(block).toMatch(/aria-label=\{t\('nav\.userMenu'\)\}/);
    expect(src).toContain('<span className="avatar" aria-hidden="true" />');
    expect(css).toMatch(/\.panel-nav--compact \.user-chip-name/);
  });

  it('is desktop-only: the hide rule must follow .user-chip in source order', () => {
    // Both selectors are single-class, so `.user-chip`'s later `display: flex`
    // beat a `.departments-chip { display: none }` written above it — the chip
    // leaked into the mobile bar until the order was fixed.
    const hide = css.indexOf('.departments-chip {\n  display: none;\n}');
    const chipBase = css.indexOf('.user-chip {');
    expect(chipBase).toBeGreaterThan(-1);
    expect(hide).toBeGreaterThan(chipBase);
    expect(css).toMatch(/\.panel-shell \.departments-chip\s*\{[^}]*display: inline-flex;/);
    expect(css).toMatch(/a\.user-chip\s*\{\s*text-decoration: none;/);
  });
});
/**
 * Sidebar rail geometry. Measured in the browser with `getBoundingClientRect`:
 * one icon column, one vertical rhythm, no dead space above the width control.
 */
describe('sidebar rail geometry', () => {
  const css = readFileSync(path.join(SRC, '../../styles/layout.css'), 'utf8');
  // The count badge contract lives with the cart component, not the rail.
  const cartCss = readFileSync(path.join(SRC, '../../styles/cart.css'), 'utf8');

  it('shares one icon column: brand, chips and links all inset 12px', () => {
    // The chips used `.user-chip`'s 4px inset, which put their icons 8px right
    // of the nav icons. One shared `padding-inline` keeps a single column.
    expect(css).toMatch(/\.panel-shell \.logo,\s*\n\s*\.panel-shell \.user-chip \{\s*\n\s*padding-inline: var\(--space-3\);/);
  });

  it('optically centres the wordmark: ink on the parent centre, box untouched', () => {
    // `align-items: center` centres the *line box*, but the visible caps sat
    // ~2px high: `[dir='rtl'] .logo` renders Latin caps in pelak, whose font
    // box reserves 9px of descent for Persian descenders ("kia." draws
    // none). The offset is line-height-independent, so it needs a real nudge —
    // measured 2px puts the ink's bbox centre on the 39.44px button's centre.
    const rule = css.match(/\.panel-shell \.logo \.logo-text \{[^}]*\}/);
    expect(rule).not.toBeNull();
    expect(rule?.[0]).toMatch(/transform: translateY\(2px\);/);
    // `transform`, not padding/margin/line-height: the row must keep its
    // measured 39.44px height and stay centred by flex alone.
    expect(rule?.[0]).not.toMatch(/padding|margin|line-height|top:/);
    // Desktop-only: the mobile bar hides the wordmark outright and the global
    // `.logo-text` rule must not gain a transform.
    const start = css.indexOf('@media (min-width: 901px)');
    let depth = 0;
    let end = -1;
    for (let i = css.indexOf('{', start); i < css.length; i += 1) {
      if (css[i] === '{') depth += 1;
      else if (css[i] === '}') {
        depth -= 1;
        if (depth === 0) { end = i; break; }
      }
    }
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const at = css.indexOf('.panel-shell .logo .logo-text {');
    expect(at).toBeGreaterThan(start);
    expect(at).toBeLessThan(end);
    const global = css.match(/^\.logo-text \{[^}]*\}/m);
    expect(global).not.toBeNull();
    expect(global?.[0]).not.toMatch(/transform/);
  });

  it('does not stretch the nav list, so no void opens above the width control', () => {
    // `flex: 1 1 auto` pushed the toggle to the bottom of a ~390px gap.
    expect(css).toMatch(/\.panel-shell \.learner-nav \{\s*\n\s*flex: 0 0 auto;/);
    expect(css).not.toMatch(/\.panel-shell \.learner-nav \{[^}]*flex: 1 1 auto;/);
  });

  it('pins the shared preferences parent to the foot of the rail', () => {
    // UX-20: color mode, language and sidebar width live in one parent, pushed
    // to the bottom by `margin-top: auto` so they hold their place as the nav
    // grows. `order: 4` clears the logo (1), account cluster (2) and nav (3).
    const rule = css.match(/\.panel-shell \.rail-controls \{[^}]*\}/);
    expect(rule).not.toBeNull();
    expect(rule?.[0]).toMatch(/margin-top: auto;/);
    expect(rule?.[0]).toMatch(/order: 4;/);
    // The parent belongs to the rail: hidden below the desktop breakpoint.
    expect(css).toMatch(/\n\.rail-controls \{\n {2}display: none;\n\}/);
    expect(src).toContain('className="rail-controls"');
  });

  it('centres the cart icon in the compact rail without stranding the badge', () => {
    // The button is `inline-flex`, so it shrink-wrapped to its icon and hugged
    // the start edge: 20px off the column while every other row was centred.
    // The wrap is centred instead of widening the button, because
    // `.cart-badge-count` is positioned against `.cart-badge-btn` — a full-width
    // button puts the count badge mid-row, detached from the basket icon.
    const rule = css.match(/\.panel-shell \.topbar\.panel-nav--compact \.cart-badge-wrap \{[^}]*\}/);
    expect(rule).not.toBeNull();
    expect(rule?.[0]).toMatch(/justify-content: center;/);
    expect(css).not.toMatch(/\.panel-shell \.topbar\.panel-nav--compact \.cart-badge-btn \{[^}]*width: 100%;/);
    // The shared centring rule must still cover the button itself.
    expect(css).toMatch(/\.panel-shell \.topbar\.panel-nav--compact \.theme-toggle,[^}]*justify-content: center;/);
    // The badge anchors to the button, so that button must stay shrink-wrapped.
    expect(cartCss).toMatch(/\.cart-badge-btn \{[^}]*position: relative;/);
    expect(cartCss).toMatch(/\.cart-badge-count \{[^}]*inset-inline-end: -4px;/);
  });
});

/**
 * Popovers anchored inside the rail. Both open *outside* the sidebar, so the
 * rail must not clip them — in the 76px compact rail `overflow: hidden` cut the
 * 240px account menu down to a 68px strip, and the mini-cart's `inset-inline-end`
 * anchoring pushed 203px of its 270px panel past the viewport edge.
 */
describe('sidebar popovers', () => {
  const css = readFileSync(path.join(SRC, '../../styles/layout.css'), 'utf8');
  const cartCss = readFileSync(path.join(SRC, '../../styles/cart.css'), 'utf8');

  it('lets popovers escape the rail instead of clipping them', () => {
    const rail = css.match(/\.panel-shell \.topbar \{[^}]*\}/);
    expect(rail).not.toBeNull();
    expect(rail?.[0]).toMatch(/overflow: visible;/);
    expect(rail?.[0]).not.toMatch(/overflow: hidden;/);
  });

  it('keeps the nav list as the clipping scroll container', () => {
    // The rail's `overflow: hidden` existed so expanded groups never covered the
    // account cluster. Removing it is only safe because the list still clips.
    expect(css).toMatch(/\.panel-shell \.learner-nav \{[^}]*overflow-x: hidden;[^}]*overflow-y: hidden;/);
  });

  it('anchors the mini-cart inward inside the rail, outward in the mobile bar', () => {
    // The rail hugs the viewport edge, so its panel must open inward or it runs
    // off-screen. The mobile bar's pill sits left of centre, where the opposite
    // direction is the only one that fits — hence the override, not a global flip.
    const mini = cartCss.match(/\.mini-cart \{[^}]*\}/);
    expect(mini).not.toBeNull();
    // Declaration-only: the rule's own comment names the other property.
    expect(mini?.[0]).toMatch(/^\s*inset-inline-end: 0;/m);
    const railOverride = css.match(/\.panel-shell \.mini-cart \{[^}]*\}/);
    expect(railOverride).not.toBeNull();
    expect(railOverride?.[0]).toMatch(/inset-inline-start: 0;/);
    expect(railOverride?.[0]).toMatch(/inset-inline-end: auto;/);
    // The rail override must live *inside* the desktop-only block, else the
    // mobile bar breaks. Slice-by-index would also match a rule that sat after
    // the block, so match the block's braces.
    const start = css.indexOf('@media (min-width: 901px)');
    let depth = 0;
    let end = -1;
    for (let i = css.indexOf('{', start); i < css.length; i += 1) {
      if (css[i] === '{') depth += 1;
      else if (css[i] === '}') {
        depth -= 1;
        if (depth === 0) { end = i; break; }
      }
    }
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const overrideAt = css.indexOf('.panel-shell .mini-cart {');
    expect(overrideAt).toBeGreaterThan(start);
    expect(overrideAt).toBeLessThan(end);
    // `.user-dropdown` opens the same way; the two must not drift apart.
    expect(css).toMatch(/\.panel-shell \.user-dropdown \{[^}]*inset-inline-start: 0;/);
  });

  it('caps the compact menu so it always fits the viewport', () => {
    expect(css).toMatch(
      /\.panel-shell \.topbar\.panel-nav--compact \.user-dropdown \{[^}]*width: 15rem;[^}]*max-width: min\(100vw - 24px, 100dvw - 24px\);/,
    );
    expect(cartCss).toMatch(/\.mini-cart \{[^}]*width: min\(270px, calc\(100dvw - 24px\)\);/);
  });
});

/**
 * UX-20 — the three preferences (color mode, language, sidebar width) share one
 * parent pinned to the foot of the rail. Below 901px there is no rail, so the
 * account menu carries color mode + language and the width control disappears
 * with the desktop toggle it belongs to.
 */
describe('rail preferences parent', () => {
  const css = readFileSync(path.join(SRC, '../../styles/layout.css'), 'utf8');
  const start = src.indexOf('<div className="rail-controls">');
  const controls = start === -1 ? '' : src.slice(start);

  it('holds all three preferences, theme → language → width, in one parent', () => {
    expect(start).toBeGreaterThan(-1);
    const theme = controls.indexOf("t('nav.toggleColorMode')");
    const lang = controls.indexOf('<LanguageSelector />');
    const width = controls.indexOf('rail-control panel-nav-size-toggle');
    expect(theme).toBeGreaterThan(-1);
    expect(lang).toBeGreaterThan(-1);
    expect(width).toBeGreaterThan(-1);
    expect(theme).toBeLessThan(lang);
    expect(lang).toBeLessThan(width);
  });

  it('renders one language selector per home, never a stray second copy', () => {
    // One in the rail parent, one in the mobile-only menu group.
    expect(src.split('<LanguageSelector />').length - 1).toBe(2);
    const menu = src.slice(src.indexOf('<div className="user-dropdown-platform">'));
    expect(menu).toContain('<LanguageSelector />');
  });

  it('gives the menu group and its separators one desktop/mobile home each', () => {
    // Hiding the group but leaving its separators would put two dividers in a
    // row in the desktop menu, so all three hide together above 901px.
    expect(css).toMatch(
      /\.panel-shell \.user-dropdown-platform,\s*\n\s*\.panel-shell \.user-dropdown-sep--platform \{\s*\n\s*display: none;/,
    );
    expect(src).toContain('className="user-dropdown-sep user-dropdown-sep--platform"');
    expect(src.split('user-dropdown-sep--platform').length - 1).toBe(2);
  });

  it('opens the language list upward from the rail foot', () => {
    // Anchored below the toggle it ran 46px past the viewport bottom and hid
    // the second option, because these rows sit at the very bottom.
    const rule = css.match(/\.panel-shell \.rail-controls \.lang-menu \{[^}]*\}/);
    expect(rule).not.toBeNull();
    expect(rule?.[0]).toMatch(/top: auto;/);
    expect(rule?.[0]).toMatch(/bottom: calc\(100% \+ var\(--space-2\)\);/);
  });

  it('anchors the language list inward so it clears the rail edge', () => {
    // The rail hugs the viewport edge, so the list must open inward like
    // `.mini-cart` and `.user-dropdown`. The global `inset-inline-end: 0`
    // anchors the menu's *left* edge in RTL: in the 59px compact rail the 190px
    // list hung 131px past the right of the screen and `.panel-shell`'s
    // `overflow-x: clip` left a 67px strip. Only the rail override flips it —
    // the mobile bar's pill sits left of centre and needs the global direction.
    const rule = css.match(/\.panel-shell \.rail-controls \.lang-menu \{[^}]*\}/);
    expect(rule).not.toBeNull();
    expect(rule?.[0]).toMatch(/inset-inline-start: 0;/);
    expect(rule?.[0]).toMatch(/inset-inline-end: auto;/);
    // The global rule keeps its outward default for the mobile bar.
    const global = css.match(/^\.lang-menu \{[^}]*\}/m);
    expect(global).not.toBeNull();
    expect(global?.[0]).toMatch(/inset-inline-end: 0;/);
    expect(global?.[0]).not.toMatch(/inset-inline-start:/);
    // The override must live *inside* the desktop-only block, else the mobile
    // account menu breaks. Match the block's braces rather than slicing by
    // index, which would also accept a rule placed after the block.
    const start = css.indexOf('@media (min-width: 901px)');
    let depth = 0;
    let end = -1;
    for (let i = css.indexOf('{', start); i < css.length; i += 1) {
      if (css[i] === '{') depth += 1;
      else if (css[i] === '}') {
        depth -= 1;
        if (depth === 0) { end = i; break; }
      }
    }
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const overrideAt = css.indexOf('.panel-shell .rail-controls .lang-menu {');
    expect(overrideAt).toBeGreaterThan(start);
    expect(overrideAt).toBeLessThan(end);
  });

  it('stops the language pill overhanging the icon-only rail', () => {
    // `.topbar button.lang-toggle` pins `min-width: 86px`; inside the 59px
    // compact row that overhung the rail and pushed the icon 13px off column.
    const rule = css.match(
      /\.panel-shell \.rail-controls \.lang-toggle \{\s*\n\s*justify-content: flex-start;[\s\S]*?\}/,
    );
    expect(rule).not.toBeNull();
    expect(rule?.[0]).toMatch(/min-width: 0;/);
    expect(rule?.[0]).toMatch(/line-height: normal;/);
    expect(css).toMatch(/\.topbar button\.lang-toggle \{[^}]*min-width: 86px;/);
  });

  it('gives all three rows one height and centres them in the compact rail', () => {
    const rule = css.match(/\.panel-shell \.rail-controls > \.rail-control,\s*\n\s*\.panel-shell \.rail-controls \.lang-toggle \{[^}]*\}/);
    expect(rule).not.toBeNull();
    expect(rule?.[0]).toMatch(/min-height: var\(--control-h-lg\);/);
    // Compact: labels hidden, icons centred like every other rail row.
    expect(css).toMatch(/\.panel-nav--compact \.rail-control,\s*\n[\s\S]{0,120}?justify-content: center;/);
    expect(css).toMatch(/\.panel-nav--compact \.rail-control-label,\s*\n[\s\S]{0,200}?display: none;/);
  });
});
