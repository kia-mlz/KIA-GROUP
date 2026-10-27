import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { departmentColor } from '@kia./brand';
import { BRAND_WORDMARK } from '@/components/brand/BrandMark';
import { BRAND_MARK_PATHS, BRAND_MARK_VIEWBOX } from '@/components/brand/brandMarkPaths';
import {
  departmentFaviconDataUri,
  departmentTabTitle,
  stripBrandSuffix,
} from '@/components/brand/departmentTab';
import { SITE_NAME, SITE_TITLE } from '@/lib/seo';

/**
 * Inside a department the tab reads «… | Kia Academy» and the favicon is the
 * Kia emblem in that department's colour; on platform pages both fall back to
 * the Persian-first parent brand («کیا»).
 *
 * 1. The suffix swap keys on the « | کیا» / « | Kia» markers.
 * 2. Favicon data URIs paint the shared mark paths with the department's
 *    official colour from @kia./brand — never a hex typed into
 *    the component.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(HERE, '..', '..', '..');

const read = (...parts: string[]) =>
  readFileSync(path.join(WEB, 'src', ...parts), 'utf8');

const departmentTabComponent = read('components', 'brand', 'DepartmentBrowserTab.tsx');
const clientProviders = read('components', 'layout', 'ClientProviders.tsx');

describe('departmentTabTitle', () => {
  it('swaps the Persian-first parent suffix for a department wordmark', () => {
    expect(departmentTabTitle('دوره‌های موجود | کیا', 'Kia Academy')).toBe(
      'دوره‌های موجود | Kia Academy',
    );
    expect(departmentTabTitle('پنل یادگیری | کیا', 'Kia Event')).toBe('پنل یادگیری | Kia Event');
  });

  it('is idempotent when re-applied with the same department', () => {
    const once = departmentTabTitle('دوره‌های موجود | کیا', 'Kia Academy');
    expect(departmentTabTitle(once, 'Kia Academy')).toBe(once);
  });

  it('also strips the Latin parent suffix when present', () => {
    expect(departmentTabTitle('Continue learning | Kia', 'Kia Academy')).toBe(
      'Continue learning | Kia Academy',
    );
  });

  it('restores the Persian-first parent suffix when leaving a department', () => {
    expect(departmentTabTitle('دوره‌های موجود | Kia Academy', null)).toBe('دوره‌های موجود | کیا');
  });

  it('leaves an already-correct parent title alone', () => {
    const parent = 'پنل یادگیری | کیا';
    expect(departmentTabTitle(parent, null)).toBe(parent);
  });

  it('does not strip the home title that has no separator', () => {
    expect(stripBrandSuffix(SITE_TITLE)).toBe(SITE_TITLE);
    expect(departmentTabTitle(SITE_TITLE, null)).toBe(SITE_TITLE);
  });

  it('keeps SITE_NAME as the Persian brand and BRAND_WORDMARK as Latin Kia', () => {
    expect(SITE_NAME).toBe('کیا');
    expect(BRAND_WORDMARK).toBe('Kia');
    expect(` | ${SITE_NAME}`).toBe(' | کیا');
  });
});

describe('departmentFaviconDataUri', () => {
  it('draws the same Kia mark the rail logo renders', () => {
    const uri = departmentFaviconDataUri('academy');
    expect(uri.startsWith('data:image/svg+xml,')).toBe(true);
    const svg = decodeURIComponent(uri.slice('data:image/svg+xml,'.length));
    expect(svg).toContain(`viewBox="${BRAND_MARK_VIEWBOX}"`);
    for (const d of BRAND_MARK_PATHS) {
      expect(svg).toContain(d);
    }
  });

  it('holds no colour of its own — every hex comes from @kia./brand', () => {
    for (const slug of ['academy', 'work', 'material', 'labs', 'events', 'community'] as const) {
      const uri = departmentFaviconDataUri(slug);
      const svg = decodeURIComponent(uri.slice('data:image/svg+xml,'.length));
      expect(svg).toContain(`fill="${departmentColor(slug)}"`);
    }
  });
});

describe('DepartmentBrowserTab wiring', () => {
  it('applies departmentTabTitle to the live document title', () => {
    expect(departmentTabComponent).toContain('departmentTabTitle(document.title, wordmark)');
  });

  it('is mounted from ClientProviders', () => {
    expect(clientProviders).toContain('<DepartmentBrowserTab />');
    expect(clientProviders.indexOf('<DepartmentBrowserTab />')).toBeGreaterThan(-1);
  });
});
