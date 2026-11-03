import { isStaffRole } from '@kia./shared';

/** Post-auth landing: a single page holding only the three primary doors. */
export const HOME_PATH = '/home';

/**
 * Turn a `?next=` value into a destination we are willing to navigate to.
 * Only single-slash internal paths are honoured, `/` folds into HOME_PATH (a
 * signed-in learner must not bounce off the landing page) and everything else —
 * protocol-relative `//host`, backslash tricks, absolute URLs, `/login` — falls
 * back to HOME_PATH.
 */
export function resolveInternalNext(next: string | null | undefined): string {
  const raw = (next ?? '').trim();
  const hasControls = [...raw].some((ch) => {
    const code = ch.charCodeAt(0);
    return code <= 0x1f || code === 0x7f;
  });
  if (
    !raw.startsWith('/') ||
    raw === '/' ||
    raw.startsWith('//') ||
    raw.startsWith('/login') ||
    raw.includes('\\') ||
    raw.includes('://') ||
    hasControls
  ) {
    return HOME_PATH;
  }
  return raw;
}

/**
 * Resolve where to send a user after a successful login submit.
 * - Staff always prefer the admin panel (honor /admin* next paths).
 * - Learners must not enter /admin (admin shell will send them back to login).
 */
export function resolvePostLoginPath(
  role: string | undefined,
  next: string | null | undefined,
): string {
  const target = resolveInternalNext(next);

  // ADM-1: shared staff predicate — custom (non-learner) roles are staff too.
  if (isStaffRole(role)) {
    return target.startsWith('/admin') ? target : '/admin';
  }

  // After a learner signs in with next=/admin, send them to the learner home.
  // (The login page itself clears learner sessions when opening the admin gate.)
  if (target.startsWith('/admin')) {
    return HOME_PATH;
  }
  return target;
}
