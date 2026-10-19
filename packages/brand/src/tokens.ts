/**
 * kia. brand tokens — the single source of truth for the seven brand
 * colours. Every department reads its identity from here: the CSS custom
 * properties in `css/brands.css` are generated from these values, and the
 * group app's `departmentColors` suite cross-checks the stylesheet against
 * this module so the two can never drift apart.
 *
 * The hex values are the published brand values from the kia. identity
 * (LOGO-1024). They are the specification — not a palette tuned for one UI —
 * so they are pinned verbatim:
 *
 *   KIA.      #FFC864   parent company — reserved, no department may use it
 *   KIA. Academy    #6464FF
 *   KIA. Work       #6492FF
 *   KIA. Material   #148165
 *   KIA. Lab       #28C793
 *   KIA. Event     #E32B1B
 *   KIA. Community  #FF7344
 *
 * `readableInk` (contrast.ts) chooses the on-fill ink by measurement, so a
 * recolour can never quietly leave unreadable text on a department tile.
 */

/** The parent brand. Reserved: no department may ever claim this colour. */
export const GROUP_COLOR = '#FFC864' as const;

/** CSS custom property that carries the parent colour in the app shell. */
export const GROUP_CSS_VARIABLE = '--group-gold' as const;

export const DEPARTMENT_SLUGS = [
  'academy',
  'work',
  'material',
  'labs',
  'events',
  'community',
] as const;

export type DepartmentSlug = (typeof DEPARTMENT_SLUGS)[number];

export interface BrandToken {
  /** Lowercase department slug used in CSS classes (`dept--<slug>`, routes). */
  readonly slug: DepartmentSlug;
  /** Official Latin brand name. */
  readonly name: string;
  /** Official brand hex (uppercase, 6-digit). */
  readonly color: string;
  /** CSS custom property carrying the colour in the app shell. */
  readonly cssVariable: string;
  /** One-line scope of the department. */
  readonly scope: string;
}

/**
 * The six departments, in canonical (alphabetical) order. UI ordering (hub
 * rows, navigation) is a presentation concern and stays with the UI.
 */
export const BRAND_TOKENS: readonly BrandToken[] = [
  {
    slug: 'academy',
    name: 'KIA. Academy',
    color: '#6464FF',
    cssVariable: '--dept-academy',
    scope: 'Education, learning & skill development',
  },
  {
    slug: 'work',
    name: 'KIA. Work',
    color: '#6492FF',
    cssVariable: '--dept-work',
    scope: 'Jobs, freelancing, hiring & projects',
  },
  {
    slug: 'material',
    name: 'KIA. Material',
    color: '#148165',
    cssVariable: '--dept-material',
    scope: 'Materials, resources, tools & style',
  },
  {
    slug: 'labs',
    name: 'KIA. Lab',
    color: '#28C793',
    cssVariable: '--dept-labs',
    scope: 'Technology, innovation, research & development',
  },
  {
    slug: 'events',
    name: 'KIA. Event',
    color: '#E32B1B',
    cssVariable: '--dept-events',
    scope: 'Competitions, events, webinars, workshops & bootcamps',
  },
  {
    slug: 'community',
    name: 'KIA. Community',
    color: '#FF7344',
    cssVariable: '--dept-community',
    scope: 'Community of users, professionals, students, teachers & employers',
  },
] as const;

/** Map a department slug to its official colour. */
export function departmentColor(slug: DepartmentSlug): string {
  const token = BRAND_TOKENS.find((t) => t.slug === slug);
  if (!token) throw new Error(`Unknown department: ${slug}`);
  return token.color;
}

/** Every brand colour — parent first — as a frozen lookup table. */
export const BRAND_COLORS: Readonly<Record<'group' | DepartmentSlug, string>> = Object.freeze({
  group: GROUP_COLOR,
  ...Object.fromEntries(BRAND_TOKENS.map((t) => [t.slug, t.color])),
} as Record<'group' | DepartmentSlug, string>);
