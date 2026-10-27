'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, LayoutGrid, LogOut, Menu, Moon, MoveHorizontal, Shield, Sun, Trophy, UserRound, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { isStaffRole } from '@kia./shared';
import { BrandMark } from '@/components/brand/BrandMark';
import { DEPARTMENTS, departmentForPathname } from '@/components/brand/departments';
import { CartBadge } from '@/components/cart/CartBadge';
import { LanguageSelector } from '@/components/layout/LanguageSelector';
import { LearnerNav } from '@/components/layout/LearnerNav';
import { useAuth } from '@/context/AuthProvider';
import { useLanguage } from '@/context/LanguageProvider';
import { useTheme } from '@/context/ThemeProvider';
import { learnerDepartmentSlugForPathname } from '@/lib/learnerPanels';
import { HOME_PATH } from '@/lib/postLoginPath';

/** Sidebar width presets — 'default' is the 18.5rem panel, 'compact' the 4.75rem
    icon rail. A third 'wide' step existed and was removed: it only pushed the
    content column right, so two steps are enough to read the sidebar. */
type PanelNavSize = 'compact' | 'default';

const PANEL_NAV_SIZES: PanelNavSize[] = ['default', 'compact'];
const PANEL_NAV_STORAGE_KEY = 'kia-panel-nav-size';

function isPanelNavSize(value: string | null): value is PanelNavSize {
  return value === 'compact' || value === 'default';
}

export function TopBar() {
  const router = useRouter();
  const pathname = usePathname();
  // Inside a department the rail wears that department's identity (UX-27):
  // the kia. emblem in that department's colour, its name as the
  // wordmark, and the parent kia. left underneath as the group it belongs
  // to. Only the colour changes — the shape stays the brand's own mark, so the
  // rail and the department page header show the same logo.
  // Learner panels under `/dashboard` (Academy / Events) and `*/panel` also
  // resolve to a department so the rail matches the active workspace menu.
  const dept =
    departmentForPathname(pathname) ??
    (() => {
      const slug = learnerDepartmentSlugForPathname(pathname);
      return slug ? (DEPARTMENTS.find((d) => d.slug === slug) ?? null) : null;
    })();
  const { t } = useLanguage();
  const { toggleTheme, theme } = useTheme();
  const { user, logout, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  // Sidebar size starts at the original default; the stored preference is
  // applied after mount so server and client markup stay identical.
  const [navSize, setNavSize] = useState<PanelNavSize>('default');
  const menuRef = useRef<HTMLDivElement>(null);
  const topbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(PANEL_NAV_STORAGE_KEY);
      if (isPanelNavSize(stored)) setNavSize(stored);
    } catch {
      /* storage unavailable — keep default */
    }
  }, []);

  const cycleNavSize = () => {
    setNavSize((prev) => {
      const next =
        PANEL_NAV_SIZES[(PANEL_NAV_SIZES.indexOf(prev) + 1) % PANEL_NAV_SIZES.length];
      try {
        localStorage.setItem(PANEL_NAV_STORAGE_KEY, next);
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  };


  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  // ADM-1: any non-learner role gets the admin-panel entry point.
  const isAdmin = !isSuperAdmin && isStaffRole(user?.role);

  const handleLogoClick = () => {
    if (isSuperAdmin) {
      router.push('/admin');
      return;
    }
    router.push(HOME_PATH);
  };

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  useEffect(() => {
    if (!navOpen) return;

    const onPointerDown = (e: MouseEvent | PointerEvent) => {
      const target = e.target as Node;
      if (topbarRef.current && !topbarRef.current.contains(target)) {
        setNavOpen(false);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNavOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [navOpen]);

  /** Sign out lands on the landing page; `replace` keeps Back out of the session. */
  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    router.replace('/');
  };

  const navSizeClass = navSize === 'compact' ? ' panel-nav--compact' : '';
  const navSizeLabel =
    navSize === 'compact' ? t('nav.menuSizeCompact') : t('nav.menuSizeDefault');

  return (
    /* `dept--<slug>` puts the department's own token (`--dept` and the tile
       mixins) in scope for the whole rail, so the emblem chip is painted from
       the same values as the hub card that was clicked. */
    <div className={`topbar${navSizeClass}${dept ? ` dept--${dept.slug}` : ''}`} ref={topbarRef}>
      <div className="topbar-primary">
        {/* `aria-label` keeps the button named on mobile, where the wordmark is
            hidden and the mark alone would leave it unlabelled. The lockup row
            keeps the mark and the wordmark on one optical line; the tagline
            sits under them (and hides with the wordmark in the compact rail and
            the mobile bar, where the row is one icon tall). */}
        <button
          type="button"
          className={`logo${dept ? ' logo--dept' : ''}`}
          onClick={handleLogoClick}
          aria-label={dept ? t(dept.titleKey) : t('common.brand')}
        >
          <span className="logo-lockup">
            <BrandMark className="logo-mark" size={26} title="" />
            <span className="logo-text">{dept ? t(dept.titleKey) : t('common.brand')}</span>
          </span>
          {/* The supporting line swaps roles rather than disappearing: outside a
              department it is the five pillars, inside one it is the
              parent name, so a department rail still says who it belongs to. */}
          <span className="brand-tagline">{dept ? t('common.brand') : t('common.tagline')}</span>
          {dept ? <span className="logo-dept-bar" aria-hidden="true" /> : null}
        </button>

        <button
          type="button"
          className="mobile-nav-toggle"
          aria-label={t('nav.menu')}
          aria-expanded={navOpen}
          aria-controls="site-top-nav"
          onClick={() => setNavOpen((o) => !o)}
        >
          {navOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <nav id="site-top-nav" className={`top-nav${navOpen ? ' top-nav--open' : ''}`}>
          {isSuperAdmin ? (
            <Link href="/admin" className="top-nav-link" onClick={() => setNavOpen(false)}>
              <Shield size={14} />
              <span className="learner-nav-text">{t('nav.admin')}</span>
            </Link>
          ) : (
            <>
              <LearnerNav onNavigate={() => setNavOpen(false)} />
              {isAdmin && (
                <Link href="/admin" className="top-nav-link" onClick={() => setNavOpen(false)}>
                  <Shield size={14} />
                  <span className="learner-nav-text">{t('nav.admin')}</span>
                </Link>
              )}
            </>
          )}

          {/* Rewards moved into the account menu (UX-18), so the nav list ends
              with the layout control rather than a second destination. */}

          {/* Sidebar width control moved out of the nav into `.rail-controls`
              (UX-20), where it sits with theme and language at the rail's foot. */}
        </nav>
      </div>

      <div className="topbar-secondary top-right">
        {loading || !user ? null : (
          <>
            {!isSuperAdmin ? <CartBadge /> : null}
            <div className="user-menu-wrap" ref={menuRef}>
              <button
                type="button"
                className="user-chip"
                onClick={() => setMenuOpen((o) => !o)}
                aria-expanded={menuOpen}
                aria-label={t('nav.userMenu')}
              >
                <span className="avatar" aria-hidden="true" />
                <span className="user-chip-name">{user.name.split(' ')[0]}</span>
                <ChevronDown size={14} className="user-chip-caret" />
              </button>
              {menuOpen && (
                <div className="user-dropdown">
                  <div className="user-dropdown-head">
                    <b>{user.name}</b>
                    <span className="ltr-isolate">{user.email || user.phone}</span>
                  </div>
                  <Link
                    href="/dashboard/profile"
                    className="user-dropdown-item"
                    onClick={() => setMenuOpen(false)}
                  >
                    <UserRound size={14} aria-hidden="true" />
                    <span>{t('panel.nav.profile')}</span>
                  </Link>

                  <Link
                    href="/rewards"
                    className="user-dropdown-item"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Trophy size={14} aria-hidden="true" />
                    <span>{t('nav.rewards')}</span>
                  </Link>

                  {/* Theme and language live in `.rail-controls` on the desktop
                      rail (UX-20); this group is their mobile-only home, hidden
                      from the menu by CSS above 901px along with both separators
                      so the desktop menu does not show two dividers in a row. */}
                  <div className="user-dropdown-sep user-dropdown-sep--platform" role="separator" />

                  <div className="user-dropdown-platform">
                    <button
                      type="button"
                      className="user-dropdown-item"
                      onClick={toggleTheme}
                      aria-label={t('nav.toggleColorMode')}
                    >
                      {theme === 'dark' ? (
                        <Moon size={14} aria-hidden="true" />
                      ) : (
                        <Sun size={14} aria-hidden="true" />
                      )}
                      <span>{t('nav.mode')}</span>
                      <span className="user-dropdown-value">
                        {theme === 'dark' ? t('nav.modeDark') : t('nav.modeLight')}
                      </span>
                    </button>

                    <LanguageSelector />
                  </div>

                  <div className="user-dropdown-sep user-dropdown-sep--platform" role="separator" />

                  <button
                    type="button"
                    className="user-dropdown-item danger"
                    onClick={() => {
                      setMenuOpen(false);
                      void handleLogout();
                    }}
                  >
                    <LogOut size={14} aria-hidden="true" />
                    <span>{t('nav.signOut')}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Departments hub shortcut — the user chip's twin, sitting right
                under it so the four doors are one click away from anywhere. */}
            {!isSuperAdmin ? (
              <Link href={HOME_PATH} className="user-chip departments-chip" aria-label={t('nav.departments')}>
                <LayoutGrid size={16} aria-hidden="true" />
                <span className="learner-nav-text">{t('nav.departments')}</span>
              </Link>
            ) : null}
          </>
        )}
      </div>

      {/* UX-20 — the three preferences (color mode, language, sidebar width)
          share one parent, pinned to the foot of the rail so they stay in the
          same place whatever the nav grows to. Below 901px this hides and the
          account menu carries theme + language; the width control has no mobile
          equivalent because the mobile bar has no width to resize. */}
      <div className="rail-controls">
        <button
          type="button"
          className="rail-control"
          onClick={toggleTheme}
          aria-label={t('nav.toggleColorMode')}
        >
          {theme === 'dark' ? (
            <Moon size={16} aria-hidden="true" />
          ) : (
            <Sun size={16} aria-hidden="true" />
          )}
          <span className="rail-control-label">
            <span>{t('nav.mode')}</span>
            <span className="rail-control-value">
              {theme === 'dark' ? t('nav.modeDark') : t('nav.modeLight')}
            </span>
          </span>
        </button>

        <LanguageSelector />

        <button
          type="button"
          className="rail-control panel-nav-size-toggle"
          onClick={cycleNavSize}
          aria-label={t('nav.resizeMenu')}
          title={`${t('nav.resizeMenu')} — ${navSizeLabel}`}
        >
          <MoveHorizontal size={16} aria-hidden="true" />
          <span className="panel-nav-size-toggle-label">{navSizeLabel}</span>
        </button>
      </div>
    </div>
  );
}
