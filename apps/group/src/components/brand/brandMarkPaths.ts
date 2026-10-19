/**
 * The kia. emblem, drawn once. `BrandMark` renders it in the rail and page
 * headers, and the browser-tab favicon paints the very same paths in a
 * department colour — so the tab logo and the rail logo can never diverge.
 */

/** Native aspect ratio of the Kia mark (viewBox 497.37 × 512). */
export const BRAND_MARK_VIEWBOX = '0 0 497.37 512' as const;

/** The dual-path blue emblem from the brand assets, in draw order. */
export const BRAND_MARK_PATHS: readonly string[] = [
  'M315.11,44.83c25.43,25.95,51.38,50.48,75.87,80.75-4.19,18.46-214.64,45.98-250.87,99.67-65.37,96.89,153.96,95.82,55.24,209.25-13.61,13.65-45.08,49.52-59.1,45.88-7.62-1.98-102.52-101.16-110.74-111.11C-87.16,232.72,208.28,33.05,233.72,4.91c31.33-18.26,60.68,18.78,81.4,39.92Z',
  'M319.85,511.69c38.1-60.93,66.95-127.24,4.49-183.11-44.87-40.14-157.98-70.92-36.7-120.16,46.38-18.83,96.82-27.15,145.01-39.85,60.57,42.21,84.2,127.85,46.67,190.4-17.35,28.91-91.98,106.02-119.42,128.55-4.9,4.02-36.61,27.44-40.06,24.17Z',
];
