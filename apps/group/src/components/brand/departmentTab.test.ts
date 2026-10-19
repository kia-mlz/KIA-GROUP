import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { departmentColor } from '@kia./brand';
import { BRAND_WORDMARK } from '@/components/brand/BrandMark';
import { BRAND_MARK_PATHS } from '@/components/brand/brandMarkPaths';
import { DEPARTMENTS } from '@/components/brand/departments';
import {
  departmentFaviconDataUri,
  departmentTabTitle,
  stripBrandSuffix,
} from '@/components/brand/departmentTab';
import { SITE_NAME, SITE_TITLE } from '@/lib/seo';

/**
 * The browser tab, personalised per department (UX-28).
 *
 * Inside a department the tab reads «… | KIA. Academy» and the favicon is the
 * kia. emblem in that department's colour; on platform pages both fall back to
 * the parent identity. Three things could quietly break that, so they are
 * pinned here:
 *
 * 1. The suffix swap keys on the « | KIA.» marker the root layout's title
 *    template guarantees, is idempotent (Next rewrites document.title on every
 *    navigation, so the swap is re-applied), and never mangles a title that
 *    has no marker (the home title).
 * 2. The favicon is the very mark the rail logo renders, painted with the
 *    department's official colour from @kia./brand — never a hex typed into
 *    the app, and never the reserved parent gold.
 * 3. The component is wired into the client shell and reads the route the
 *    same way the rail does, so tab and rail can never name different
 *    departments.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB_SRC = path.join(HERE, '..', '..');
const read = (...parts: string[]) => readFileSync(path.join(WEB_SRC, ...parts), 'utf8');

const departmentTabSource = read('components', 'brand', 'departmentTab.ts');
const departmentTabComponent = read('components', 'brand', 'DepartmentBrowserTab.tsx');
const clientProviders = read('components', 'layout', 'ClientProviders.tsx');

/** Decode a `data:image/svg+xml,…` favicon back to its SVG source. */
function decodeFavicon(uri: string): string {
  expect(uri.startsWith('data:image/svg+xml,'), uri).toBe(true);
  return decodeURIComponent(uri.slice('data:image/svg+xml,'.length));
}

describe('departmentTabTitle', () => {
  it('swaps the parent brand suffix for the department wordmark', () => {
    expect(departmentTabTitle('دوره‌های موجود | KIA.', 'KIA. Academy')).toBe(
      'دوره‌های موجود | KIA. Academy',
    );
    expect(departmentTabTitle('پنل یادگیری | KIA.', 'KIA. Event')).toBe('پنل یادگیری | KIA. Event');
  });

  it('is idempotent, so re-applying after a navigation never stacks suffixes', () => {
    const once = departmentTabTitle('دوره‌های موجود | KIA.', 'KIA. Academy');
    expect(departmentTabTitle(once, 'KIA. Academy')).toBe(once);
    // Next can rewrite document.title back to the plain parent suffix between
    // two department pages; re-applying must still land on the same string.
    expect(departmentTabTitle('ادامه یادگیری | KIA.', 'KIA. Academy')).toBe(
      'ادامه یادگیری | KIA. Academy',
    );
  });

  it('restores the parent suffix when leaving the department', () => {
    expect(departmentTabTitle('دوره‌های موجود | KIA. Academy', null)).toBe('دوره‌های موجود | KIA.');
    // Already the parent suffix — leave it byte-identical.
    const parent = 'پنل یادگیری | KIA.';
    expect(departmentTabTitle(parent, null)).toBe(parent);
  });

  it('never mangles a title without the brand marker (the home title)', () => {
    expect(stripBrandSuffix(SITE_TITLE)).toBe(SITE_TITLE);
    expect(departmentTabTitle(SITE_TITLE, null)).toBe(SITE_TITLE);
  });

  it('keeps the suffix marker in step with the layout template and the rail', () => {
    // The layout template is `%s | ${SITE_NAME}` and the rail's parent
    // wordmark is BRAND_WORDMARK; both must be the same string the swap keys
    // on, or the tab would silently stop matching.
    expect(SITE_NAME).toBe(BRAND_WORDMARK);
    expect(` | ${SITE_NAME}`).toBe(' | KIA.');
  });
});

describe('departmentFaviconDataUri', () => {
  it('draws the same kia. mark the rail logo renders', () => {
    const svg = decodeFavicon(departmentFaviconDataUri('academy'));
    expect(svg).toContain('viewBox="0 0 497.37 512"');
    for (const d of BRAND_MARK_PATHS) expect(svg).toContain(`d="${d}"`);
  });

  it('paints every department in its official brand colour', () => {
    for (const dept of DEPARTMENTS) {
      const svg = decodeFavicon(departmentFaviconDataUri(dept.slug));
      expect(svg, dept.slug).toContain(departmentColor(dept.slug));
      expect(svg, dept.slug).toContain('<path fill=');
    }
    // Six departments, six distinct favicon colours.
    const uris = new Set(DEPARTMENTS.map((d) => departmentFaviconDataUri(d.slug)));
    expect(uris.size).toBe(6);
  });

  it('never uses the reserved parent gold', () => {
    for (const dept of DEPARTMENTS) {
      expect(decodeFavicon(departmentFaviconDataUri(dept.slug)), dept.slug).not.toContain('#FFC864');
    }
  });

  it('holds no colour of its own — every hex comes from @kia./brand', () => {
    expect(departmentTabSource).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });
});

describe('DepartmentTab wiring', () => {
  it('reads the route and the department exactly like the rail does', () => {
    expect(departmentTabComponent).toContain('usePathname');
    expect(departmentTabComponent).toContain('departmentForPathname(pathname)');
    expect(departmentTabComponent).toContain('departmentTabTitle(document.title, wordmark)');
    expect(departmentTabComponent).toContain('departmentFaviconDataUri(dept.slug)');
  });

  it('swaps the svg favicon and hides the recolourable-ico fallback', () => {
    expect(departmentTabComponent).toContain('link[rel~="icon"][type="image/svg+xml"]');
    expect(departmentTabComponent).toContain('link[rel~="icon"][type="image/x-icon"]');
    // The original href is remembered so a platform page restores it exactly.
    expect(departmentTabComponent).toContain('svgLink.dataset.deptIcon');
  });

  it('is mounted once in the client shell, inside the language provider', () => {
    expect(clientProviders).toContain('<DepartmentBrowserTab />');
    // Mounted after LanguageProvider wraps the tree (it calls useLanguage).
    expect(clientProviders.indexOf('<LanguageProvider')).toBeLessThan(
      clientProviders.indexOf('<DepartmentBrowserTab />'),
    );
  });
});
