import { departmentColor, type DepartmentSlug } from '@kia./brand';
import { SITE_NAME } from '@/lib/seo';
import { BRAND_MARK_PATHS, BRAND_MARK_VIEWBOX } from './brandMarkPaths';

/** Latin parent wordmark — keep in sync with `BRAND_WORDMARK` in BrandMark.tsx. */
const LATIN_BRAND = 'Kia';

/**
 * The browser tab, personalised per department (UX-28).
 *
 * The root layout's title template appends « | کیا» (Persian-first SITE_NAME)
 * to every page title and Next ships one gold favicon for the whole site.
 * Inside a department the tab should wear that department instead:
 * «دوره‌های موجود | Kia Academy» with the Kia emblem painted in Academy indigo.
 * This module holds the two pure transformations behind that, so they can be
 * tested without a DOM:
 *
 * - `departmentTabTitle` swaps the brand suffix of a live document.title and
 *   back, keyed on the parent brand markers (` | کیا` / ` | Kia`).
 * - `departmentFaviconDataUri` renders the Kia mark (the very paths the rail
 *   logo uses) in the department's official colour, read from
 *   @kia./brand — never a hex typed here.
 */

/** Parent brand suffixes the layout or Latin fallback may append. */
const TITLE_SEPARATORS = Array.from(
  new Set([` | ${SITE_NAME}`, ` | ${BRAND_WORDMARK}`]),
);

/**
 * The page-specific part of a title — everything before the brand suffix.
 * A title without the marker (the home «Kia» / «کیا» title, or one already
 * stripped) is returned unchanged.
 */
export function stripBrandSuffix(title: string): string {
  for (const separator of TITLE_SEPARATORS) {
    const idx = title.lastIndexOf(separator);
    if (idx !== -1) return title.slice(0, idx);
  }
  return title;
}

/**
 * Re-brand a live `document.title` for the department currently on screen.
 *
 * `departmentWordmark` is the translated department name («Kia Academy») or
 * `null` on platform pages. The function is idempotent: a title already
 * carrying the department suffix is stripped and re-suffixed to the same
 * string, so it can be re-applied after Next rewrites document.title during a
 * navigation without ever stacking suffixes.
 */
export function departmentTabTitle(title: string, departmentWordmark: string | null): string {
  const base = stripBrandSuffix(title);
  if (!departmentWordmark) {
    // Platform page: restore the Persian-first parent suffix the layout uses.
    return base === title ? title : `${base} | ${SITE_NAME}`;
  }
  return `${base} | ${departmentWordmark}`;
}

/**
 * The Kia emblem as a `data:` URI, painted in the department's official
 * colour. Swapping the href of the existing `<link rel="icon">` to this value
 * recolours the tab logo with no extra requests and no second source of truth
 * for either the mark or the palette.
 */
export function departmentFaviconDataUri(slug: DepartmentSlug): string {
  const color = departmentColor(slug);
  const paths = BRAND_MARK_PATHS.map((d) => `<path fill="${color}" d="${d}"/>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${BRAND_MARK_VIEWBOX}">${paths}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
