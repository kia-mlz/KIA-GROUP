'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

import { PageBackButton } from '@/components/layout/PageBackButton';
import { SiteAurora } from '@/components/layout/SiteAurora';
import { TopBar } from '@/components/layout/TopBar';
import { useAuth } from '@/context/AuthProvider';
import { useEffect } from 'react';
import { PAGE_BACK_FALLBACK, showsPageBack } from '@/lib/pageBack';
import { showsTopBar } from '@/lib/topBar';

/**
 * Site chrome only after registration. Admin uses its own full-bleed shell.
 *
 * The `TopBar` is the site's header and rides on **every** page a registered
 * learner can reach — `/home` alone is left bare, because its department hub
 * paints the full screen.
 *
 * The route decides whether the chrome is there at all, not which shape it
 * takes: the viewport does that. Inside `.panel-shell` the same `TopBar` is the
 * rail beside the page on desktop (the inline-start edge — the right-hand side
 * in Persian) and the one-row bar across the top from 900px down.
 */
export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, learnerState, loading, signedOut, finishSignOut } = useAuth();
  const isAdminRoute = Boolean(pathname?.startsWith('/admin'));
  const registered = Boolean(user?.profileComplete || learnerState?.profileComplete);
  const showChrome = !loading && registered && !isAdminRoute;
  const showTopBar = showChrome && showsTopBar(pathname);
  // Admin brings its own shell (with its own back slot); / and /home are roots.
  const showBack = !isAdminRoute && showsPageBack(pathname);

  // The landing page is the destination every sign-out navigates to — once it is
  // on screen the transition is over and normal rendering resumes.
  useEffect(() => {
    if (signedOut && pathname === '/') finishSignOut();
  }, [signedOut, pathname, finishSignOut]);

  // A sign-out owns the screen until the landing page arrives: unmounting the
  // current page also disarms its auth gate, which would otherwise redirect to
  // the login or phone-OTP screen in the same tick and undo the sign-out.
  const main = (
    <main
      className={`site-main${showChrome ? '' : ' site-main--guest'}${isAdminRoute ? ' site-main--admin' : ''}`}
    >
      {signedOut ? null : (
        <>
          {showBack ? <PageBackButton href={PAGE_BACK_FALLBACK} /> : null}
          {children}
        </>
      )}
    </main>
  );

  return (
    <>
      {!isAdminRoute ? <SiteAurora /> : null}
      {/* One shell, both shapes: `.panel-shell` is the rail on desktop and adds
          only a column above the mobile bar, which stays pinned across the top. */}
      {showTopBar ? (
        <div className="panel-shell">
          <TopBar />
          <div className="panel-content">
            {main}
          </div>
        </div>
      ) : (
        main
      )}
    </>
  );
}
