'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { BrandMark } from '@/components/brand/BrandMark';
import { LanguageSelector } from '@/components/layout/LanguageSelector';
import { HOME_PATH } from '@/lib/postLoginPath';
import { useAuth } from '@/context/AuthProvider';
import { useLanguage } from '@/context/LanguageProvider';
import { useTheme } from '@/context/ThemeProvider';

/**
 * Minimal guest landing: brand mark, one-line pitch and a single
 * «ورود / ثبت‌نام» door. Everyone who is signed in with a completed profile
 * lands on the three-door home page (employer/freelancer · education · material).
 */
export default function HomePage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { toggleTheme } = useTheme();
  const { user, learnerState, loading, isAuthenticated } = useAuth();
  const registered = Boolean(user?.profileComplete || learnerState?.profileComplete);

  useEffect(() => {
    if (loading || !isAuthenticated || !registered) return;
    router.replace(HOME_PATH);
  }, [loading, isAuthenticated, registered, router]);

  if (loading || (isAuthenticated && registered)) {
    return <div className="page-content landing auth-loading" aria-busy="true" />;
  }

  return (
    <div className="page-content landing landing-min">
      {/* language + color mode — always reachable on the first page */}
      <div className="landing-controls">
        <LanguageSelector />
        <button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={t('nav.toggleColorMode')}
        >
          <span className="theme-toggle-icon" aria-hidden="true">
            ◐
          </span>
          <span className="theme-toggle-label">{t('nav.mode')}</span>
        </button>
      </div>

      <main className="landing-intro container">
        <header className="landing-hero">
          {/* The brand wordmark roots the heading outline; the tagline (the
              hero promise, one canonical string shared with the site wordmark
              and pinned by the brand suite) sits under it as a supporting
              heading (h3, dimmed) per UX feedback. */}
          <h1 className="landing-brand">
            <BrandMark className="landing-brand-mark" title="" />
            {t('common.brand')}
          </h1>
          <p className="landing-title">{t('common.tagline')}</p>
          <p className="landing-body">{t('landing.heroBody')}</p>

          <div className="hero-actions landing-min-actions">
            <Link href="/education" className="btn btn--accent btn--lg hero-cta">
              {t('landing.ctaAuth')}
            </Link>
          </div>

          <Link href="/login" className="landing-min-email">
            {t('landing.ctaEmail')}
          </Link>
        </header>
      </main>
    </div>
  );
}
