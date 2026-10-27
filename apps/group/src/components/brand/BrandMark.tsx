'use client';

import { BRAND_MARK_PATHS, BRAND_MARK_VIEWBOX } from './brandMarkPaths';

/** Native aspect ratio of the Kia mark (viewBox 497.37 × 512). */
const LOGO_ASPECT = 497.37 / 512;

/** Latin wordmark (English canonical). Locale UI uses `t('common.brand')` (Kia / کیا). */
export const BRAND_WORDMARK = 'Kia';

/** Kia mark — dual-path blue emblem from brand assets. */
export function BrandMark({
  className = 'brand-mark',
  size,
  title = 'Kia',
}: {
  className?: string;
  /** Pixel height; width follows the mark’s native aspect ratio. Omit to size via CSS. */
  size?: number;
  title?: string;
}) {
  const dim = size
    ? { height: size, width: Number((size * LOGO_ASPECT).toFixed(2)) }
    : undefined;

  return (
    <svg
      className={className}
      viewBox={BRAND_MARK_VIEWBOX}
      role="img"
      aria-hidden={title ? undefined : true}
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
      {...dim}
    >
      {title ? <title>{title}</title> : null}
      {BRAND_MARK_PATHS.map((d) => (
        <path key={d} className="brand-mark-shape" fill="currentColor" d={d} />
      ))}
    </svg>
  );
}
