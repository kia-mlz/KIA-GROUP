import { departmentColor, type DepartmentSlug } from '@kia./brand';
import { SITE_NAME } from '@/lib/seo';
import { BRAND_MARK_PATHS, BRAND_MARK_VIEWBOX } from './brandMarkPaths';

/**
 * The browser tab, personalised per department (UX-28).
 *
 * The root layout's title template appends « | KIA.» to every page title and
 * Next ships one gold favicon for the whole site. Inside a department the tab
 * should wear that department instead: «دوره‌های موجود | KIA. Academy» with the
 * kia. emblem painted in Academy indigo. This module holds the two pure
 * transformations behind that, so they can be tested without a DOM:
 *
 * - `departmentTabTitle` swaps the brand suffix of a live document.title and
 *   back, keyed only on the « | KIA.» marker the template guarantees.
 * - `departmentFaviconDataUri` renders the kia. mark (the very paths the rail
 *   logo uses) in the department's official colour, read from
 *   @kia./brand — never a hex typed here.
 */

/** The suffix the root layout's `title.template` appends to every page. */
const TITLE_SEPARATOR = ` | ${SITE_NAME}`;

/**
 * The page-specific part of a title — everything before the brand suffix.
 * A title without the marker (the home «KIA. — …» title, or one already
 * stripped) is returned unchanged.
 */
export function stripBrandSuffix(title: string): string {
  const idx = title.lastIndexOf(TITLE_SEPARATOR);
  return idx === -1 ? title : title.slice(0, idx);
}

/**
 * Re-brand a live `document.title` for the department currently on screen.
 *
 * `departmentWordmark` is the translated department name («KIA. Academy») or
 * `null` on platform pages. The function is idempotent: a title already
 * carrying the department suffix is stripped and re-suffixed to the same
 * string, so it can be re-applied after Next rewrites document.title during a
 * navigation without ever stacking suffixes.
 */
export function departmentTabTitle(title: string, departmentWordmark: string | null): string {
  const base = stripBrandSuffix(title);
  if (!departmentWordmark) {
    // Platform page: a title that has no marker (or already the parent
    // suffix) is already correct — leave it exactly as Next rendered it.
    return base === title ? title : `${base}${TITLE_SEPARATOR}`;
  }
  return `${base} | ${departmentWordmark}`;
}

/**
 * The kia. emblem as a `data:` URI, painted in the department's official
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
