/**
 * Where the site header (`components/layout/TopBar.tsx`) is drawn.
 *
 * The bar rides on every page a registered learner can reach, and the single
 * exception is the departments hub: `/home` paints the solar system edge to
 * edge and keeps the whole screen for it. Admin is excluded by `SiteChrome`
 * (it brings its own shell) and guests are excluded by `SiteChrome`'s
 * registration gate — neither is this predicate's business.
 */

import { HOME_PATH } from '@/lib/postLoginPath';

/** Routes that own their screen outright, so the bar stays off them. */
const CHROMELESS_PATHS = new Set<string>([HOME_PATH]);

/**
 * `usePathname` never hands back a trailing slash, but a hand-typed `/home/`
 * (or the root) must still resolve to the hub rather than slipping past the set.
 */
export function normalizePathname(pathname: string | null | undefined): string {
  const clean = (pathname ?? '').trim().replace(/\/+$/, '');
  return clean === '' ? '/' : clean;
}

/** Whether the `TopBar` belongs on this route. */
export function showsTopBar(pathname: string | null | undefined): boolean {
  return !CHROMELESS_PATHS.has(normalizePathname(pathname));
}
