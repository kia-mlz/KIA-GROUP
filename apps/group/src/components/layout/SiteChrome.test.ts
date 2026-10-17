import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Site chrome coverage and the mobile brand position.
 *
 * `TopBar` is the site's header, so it rides on every page a registered learner
 * can reach — `/home` alone is left bare, because the departments hub paints the
 * full screen. The *route* decides whether the chrome is there; the *viewport*
 * decides which of its two shapes it takes: the rail beside the page on desktop
 * (the right-hand edge in Persian) and the one-row bar across the top on mobile.
 * These tests pin the wiring (one shell, one bar, never two) and the mobile
 * brand geometry, which is measured from the *bar* rather than laid into the
 * grid row.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(HERE, '..', '..');
const read = (file: string) => readFileSync(path.join(SRC, file), 'utf8');

const chrome = read('components/layout/SiteChrome.tsx');
const layout = read('styles/layout.css');
const responsive = read('styles/responsive.css');

const occurrences = (haystack: string, needle: string) => haystack.split(needle).length - 1;

describe('SiteChrome coverage', () => {
  it('asks the shared predicate whether this route carries the header', () => {
    expect(chrome).toContain("import { showsTopBar } from '@/lib/topBar';");
    expect(chrome).toMatch(/const showTopBar = showChrome && showsTopBar\(pathname\);/);
  });

  it('renders one bar, inside one shell', () => {
    // A single `<TopBar />`, always inside `.panel-shell` — the shell is what
    // gives it both shapes, so a second render site could only double the header.
    expect(occurrences(chrome, '<TopBar')).toBe(1);
    const shell = chrome.indexOf('<div className="panel-shell">');
    const shellEnd = chrome.indexOf('</div>', chrome.indexOf('<TopBar />', shell));
    expect(shell).toBeGreaterThan(-1);
    expect(chrome.slice(shell, shellEnd)).toContain('<TopBar />');
    expect(chrome).toMatch(/\{showTopBar \? \(/);
  });

  it('does not fork the chrome by department any more', () => {
    // The rail used to belong to the six departments and every other route fell
    // back to a bare bar. The route no longer picks the shape: `.panel-shell`
    // wraps every chrome page and the breakpoint picks between rail and bar.
    expect(chrome).not.toMatch(/showRail/);
    expect(chrome).not.toMatch(/departmentForPathname/);
    expect(read('components/layout/TopBar.tsx')).not.toMatch(/standalone|topbar--bar/);
    expect(layout).not.toMatch(/topbar--bar/);
  });

  it('keeps admin on its own shell and guests on the landing CTA', () => {
    expect(chrome).toMatch(/const showChrome = !loading && registered && !isAdminRoute;/);
    expect(chrome).toContain("pathname?.startsWith('/admin')");
    expect(chrome).toMatch(
      /const registered = Boolean\(user\?\.profileComplete \|\| learnerState\?\.profileComplete\);/,
    );
  });
});

/** The rail is the desktop shape of the same shell: below 901px `.panel-shell`
    is a column whose only visible child is the bar pinned across the top. */
describe('shell shapes', () => {
  it('is a column on mobile and a row with the rail on desktop', () => {
    const base = layout.match(/^\.panel-shell \{[^}]*\}/m);
    expect(base).not.toBeNull();
    expect(base?.[0]).toMatch(/flex-direction: column;/);
    const rail = layout.match(/^ {2}\.panel-shell \{[^}]*\}/m);
    expect(rail).not.toBeNull();
    expect(rail?.[0]).toMatch(/flex-direction: row;/);
  });

  it('pins the bar across the top on mobile', () => {
    expect(responsive).toMatch(/\.topbar \{\s*position: sticky;/);
    expect(responsive).toMatch(/grid-template-columns: minmax\(0, 1fr\) auto minmax\(0, 1fr\);/);
  });
});

describe('mobile brand position', () => {
  const rule = responsive.match(/ {2}\.topbar \.logo \{[^}]*\}/);
  const at = responsive.indexOf('  .topbar .logo {');
  const blockStart = responsive.indexOf('@media (max-width: 900px)');
  const blockEnd = responsive.indexOf('@media (min-width: 901px)');

  it('pins the logo to the bar centre on both axes', () => {
    expect(rule).not.toBeNull();
    expect(rule?.[0]).toMatch(/position: absolute;/);
    expect(rule?.[0]).toMatch(/top: 50%;/);
    expect(rule?.[0]).toMatch(/left: 50%;/);
    // The translate cancels the button's own size, so the mark's centre — not
    // its corner — lands on the bar's centre.
    expect(rule?.[0]).toMatch(/transform: translate\(-50%, -50%\);/);
  });

  it('centres the column inside the button, not just the button in the bar', () => {
    // `flex-direction: column` parks its content at the start, which left the
    // mark 7px above the button's middle even once the button itself was centred.
    expect(rule?.[0]).toMatch(/justify-content: center;/);
    expect(rule?.[0]).toMatch(/align-items: center;/);
  });

  it('does not rely on grid placement or a half-pixel nudge', () => {
    // The old rule centred the *row box* (`justify-self`) and then nudged it
    // with `top: 50%` + `translateY(-50%)`, which left the mark off-centre by
    // the difference between the 40px button and the row.
    expect(rule?.[0]).not.toMatch(/justify-self|grid-column|grid-row/);
    expect(rule?.[0]).not.toMatch(/translateY\(-50%\)(?!,)/);
  });

  it('uses physical insets, because the button carries its own direction', () => {
    // `[dir='rtl'] .topbar .logo { direction: rtl }` comes later in the same
    // block, so a logical `inset-inline-start` would resolve against *right* in
    // Persian and push the brand off-centre.
    expect(rule?.[0]).not.toMatch(/inset-inline/);
    expect(responsive).toMatch(/\[dir='rtl'\] \.topbar \.logo \{\s*direction: rtl;/);
  });

  it('lives in the ≤900px bar, not in the desktop rail', () => {
    expect(blockStart).toBeGreaterThan(-1);
    expect(blockEnd).toBeGreaterThan(blockStart);
    expect(at).toBeGreaterThan(blockStart);
    expect(at).toBeLessThan(blockEnd);
    // Desktop keeps its own brand rule (the rail's top-of-rail nudge).
    expect(layout).toMatch(/\.panel-shell \.logo \.logo-text \{[^}]*transform: translateY\(2px\);/);
  });
});
