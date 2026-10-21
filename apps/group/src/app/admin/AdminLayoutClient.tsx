'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  BookOpen,
  Building2,
  ChevronDown,
  ChevronRight,
  Coins,
  CreditCard,
  ClipboardList,
  Flag,
  Globe,
  LineChart,
  LogOut,
  Mail,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  Search,
  Settings,
  Ticket,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  type AdminAccessSection,
} from '@kia./shared';
import { BrandMark } from '@/components/brand/BrandMark';
import { PageBackButton } from '@/components/layout/PageBackButton';
import AdminCommandPalette, { type PaletteCommand } from '@/components/admin/AdminCommandPalette';
import AdminNotifications, { useAdminAttention } from '@/components/admin/AdminNotifications';
import { useAdminAccess } from '@/components/admin/useAdminAccess';
import { useAuth } from '@/context/AuthProvider';
import { useLanguage } from '@/context/LanguageProvider';
import { ADMIN_PAGE_BACK_FALLBACK, showsAdminPageBack } from '@/lib/pageBack';

type AdminSection = AdminAccessSection;

type NavLeaf = {
  id: string;
  href: string;
  label: string;
  exact?: boolean;
  key: AdminSection;
  /**
   * Visible to a staff account that may open *any* section, not one section in
   * particular. The departments hub is the entry point to "where do I manage
   * this?", so a moderator with any single section must still find it.
   */
  anySection?: boolean;
};

type NavItem =
  | (NavLeaf & { icon: typeof BarChart3; children?: undefined })
  | {
      id: string;
      label: string;
      icon: typeof BarChart3;
      key: AdminSection;
      children: NavLeaf[];
    };

/** Sidebar section grouping (visual only — permission keys stay unchanged). */
type NavGroup = {
  id: string;
  labelKey: string;
  items: NavItem[];
};

const GROUP_OF: Record<string, string> = {
  dashboard: 'general',
  departments: 'departments',
  users: 'general',
  courses: 'content',
  challenges: 'content',
  tests: 'content',
  competitions: 'content',
  finance: 'finance',
  'finance-discounts': 'finance',
  analytics: 'finance',
  tickets: 'support',
  messages: 'support',
  audit: 'system',
  settings: 'system',
};
function pathActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

const OPEN_GROUPS_STORAGE = 'kia.admin.openGroups';
const COLLAPSED_STORAGE = 'kia.admin.sidebarCollapsed';

/** Flat sidebar link (icon + label + optional live badge). */
function NavLink({
  leaf,
  active,
  badge,
}: {
  leaf: NavLeaf & { icon: typeof BarChart3 };
  active: boolean;
  badge: number;
}) {
  const Icon = leaf.icon;
  return (
    <Link
      href={leaf.href}
      className={`admin-nav-link${active ? ' active' : ''}`}
      aria-current={active ? 'page' : undefined}
      data-tip={leaf.label}
    >
      <Icon size={16} />
      <span>{leaf.label}</span>
      {badge > 0 ? (
        <span className="admin-nav-badge" aria-hidden>
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </Link>
  );
}

/** Expandable sidebar group with children (accordion, persisted). */
function NavGroupItem({
  item,
  pathname,
  open,
  onToggle,
  badgeFor,
}: {
  item: {
    id: string;
    label: string;
    icon: typeof BarChart3;
    children: NavLeaf[];
  };
  pathname: string;
  open: boolean;
  onToggle: () => void;
  badgeFor: (id: string) => number;
}) {
  const Icon = item.icon;
  const badge = item.children.reduce((sum, child) => sum + badgeFor(child.id), 0);
  return (
    <div className={`admin-nav-group${open ? ' open' : ''}`}>
      <button
        type="button"
        className="admin-nav-group-toggle"
        aria-expanded={open}
        data-tip={item.label}
        onClick={onToggle}
      >
        <Icon size={16} />
        <span>{item.label}</span>
        {badge > 0 ? (
          <span className="admin-nav-badge" aria-hidden>
            {badge > 99 ? '99+' : badge}
          </span>
        ) : null}
        <ChevronDown size={14} className="admin-nav-chevron" />
      </button>
      <div className="admin-nav-submenu">
        <div>
          {item.children.map((child) => {
            const active = pathActive(pathname, child.href, child.exact);
            const childBadge = badgeFor(child.id);
            return (
              <Link
                key={child.id}
                href={child.href}
                className={`admin-nav-link${active ? ' active' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                <span>{child.label}</span>
                {childBadge > 0 ? (
                  <span className="admin-nav-badge" aria-hidden>
                    {childBadge > 99 ? '99+' : childBadge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLanguage();
  const { user, loading, logout, signedOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  /* Close the profile dropdown on outside click / Escape. */
  useEffect(() => {
    if (!profileOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!event.target || !(event.target instanceof Element)) return;
      if (!event.target.closest('.admin-dropdown-wrap')) setProfileOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setProfileOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [profileOpen]);

  const { isSuper, isStaff, access, can } = useAdminAccess();

  useEffect(() => {
    if (loading || signedOut) return;
    // Guests and learners both get the admin login gate (not the learner dashboard).
    if (!user || !isStaff) {
      router.replace('/login?next=/admin');
    }
  }, [user, loading, signedOut, router, isStaff]);

  /** Every sign-out ends on the landing page — never back on a login form. */
  const handleSignOut = async () => {
    await logout();
    router.replace('/');
  };

  /* --- persisted UI state (open groups / collapsed sidebar) ----------------- */

  useEffect(() => {
    try {
      setOpenGroups(JSON.parse(window.localStorage.getItem(OPEN_GROUPS_STORAGE) ?? '{}') as Record<string, boolean>);
      setCollapsed(window.localStorage.getItem(COLLAPSED_STORAGE) === '1');
    } catch {
      /* storage unavailable — defaults are fine */
    }
  }, []);

  const toggleGroup = useCallback((id: string) => {
    setOpenGroups((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        window.localStorage.setItem(OPEN_GROUPS_STORAGE, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSED_STORAGE, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  /* --- Cmd/Ctrl+K command palette ------------------------------------------- */

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* --- real attention counts (sidebar badges + notification bell) ----------- */

  const attention = useAdminAttention(Boolean(user) && isStaff);
  const openTicketCount = useMemo(
    () =>
      attention.tickets.filter(
        (ticket) => ticket.status === 'OPEN' || ticket.status === 'IN_PROGRESS',
      ).length,
    [attention.tickets],
  );
  const unreadMessageCount = useMemo(
    () => attention.messages.filter((message) => !message.readAt).length,
    [attention.messages],
  );

  /**
   * Any staff account that can open at least one section may open the
   * departments hub — it is the shared answer to "where do I manage this?",
   * and it shows only the modules that account is actually allowed to reach.
   */
  const canOpenDepartments = useMemo(
    () => isSuper || (access ? Object.values(access).some((section) => section.view) : false),
    [isSuper, access],
  );

  const nav = useMemo((): NavItem[] => {
    const items: NavItem[] = [
      {
        id: 'dashboard',
        href: '/admin',
        label: t('admin.nav.stats'),
        icon: BarChart3,
        exact: true,
        key: 'stats',
      },
      {
        id: 'departments',
        href: '/admin/departments',
        label: t('admin.nav.departments'),
        icon: Building2,
        key: 'stats',
        anySection: true,
      },
      {
        id: 'users',
        label: t('admin.nav.users'),
        icon: Users,
        key: 'users',
        children: [
          {
            id: 'users-list',
            href: '/admin/users',
            label: t('admin.nav.usersList'),
            exact: true,
            key: 'users',
          },
          {
            id: 'users-create',
            href: '/admin/users/create',
            label: t('admin.nav.usersCreate'),
            key: 'users',
          },
          {
            id: 'users-roles',
            href: '/admin/users/roles',
            label: t('admin.nav.usersRoles'),
            key: 'users',
          },
        ],
      },
      {
        id: 'audit',
        href: '/admin/audit',
        label: t('admin.nav.audit'),
        icon: ScrollText,
        exact: true,
        key: 'audit',
      },
      {
        id: 'courses',
        label: t('admin.nav.courses'),
        icon: BookOpen,
        key: 'courses',
        children: [
          {
            id: 'courses-list',
            href: '/admin/academy/courses',
            label: t('admin.nav.coursesList'),
            exact: true,
            key: 'courses',
          },
          {
            id: 'courses-new',
            href: '/admin/academy/courses/new',
            label: t('admin.nav.coursesNew'),
            key: 'courses',
          },
        ],
      },
      {
        id: 'challenges',
        href: '/admin/events/challenges',
        label: t('admin.nav.challenges'),
        icon: Trophy,
        key: 'challenges',
      },
      {
        id: 'tests',
        href: '/admin/academy/tests',
        label: t('admin.nav.tests'),
        icon: ClipboardList,
        key: 'tests',
      },
      {
        id: 'tickets',
        href: '/admin/tickets',
        label: t('admin.nav.tickets'),
        icon: Ticket,
        key: 'tickets',
      },
      {
        id: 'messages',
        href: '/admin/messages',
        label: t('admin.nav.messages'),
        icon: Mail,
        key: 'messages',
      },
      {
        id: 'competitions',
        href: '/admin/events/competitions',
        label: t('admin.nav.competitions'),
        icon: Flag,
        key: 'competitions',
      },
      {
        id: 'finance',
        label: t('admin.nav.finance'),
        icon: Coins,
        key: 'payments',
        children: [
          {
            id: 'finance-revenue',
            href: '/admin/finance',
            label: t('admin.nav.financeRevenue'),
            exact: true,
            key: 'payments',
          },
          {
            id: 'finance-transactions',
            href: '/admin/payments',
            label: t('admin.nav.financeTransactions'),
            key: 'payments',
          },
          {
            id: 'finance-orders',
            href: '/admin/orders',
            label: t('admin.nav.financeOrders'),
            key: 'payments',
          },
          {
            id: 'finance-discounts',
            href: '/admin/discounts',
            label: t('admin.nav.discounts'),
            key: 'discounts',
          },
          {
            id: 'finance-entitlements',
            href: '/admin/entitlements',
            label: t('admin.nav.financeEntitlements'),
            key: 'payments',
          },
          {
            id: 'finance-wallets',
            href: '/admin/wallets',
            label: t('admin.nav.financeWallets'),
            key: 'payments',
          },
        ],
      },
      {
        id: 'analytics',
        href: '/admin/analytics',
        label: t('admin.nav.analytics'),
        icon: LineChart,
        key: 'stats',
      },
      {
        id: 'settings',
        label: t('admin.nav.settings'),
        icon: Settings,
        key: 'settings',
        children: [
          {
            id: 'settings-general',
            href: '/admin/settings',
            label: t('admin.nav.settingsGeneral'),
            exact: true,
            key: 'settings',
          },
          {
            id: 'settings-security',
            href: '/admin/security',
            label: t('auth.twoFactor.title'),
            key: 'settings',
          },
          {
            id: 'settings-contact',
            href: '/admin/contact',
            label: t('admin.nav.contact'),
            key: 'settings',
          },
        ],
      },
    ];

    return items
      .map((item) => {
        if ('children' in item && item.children) {
          const children = item.children.filter((child) => can(child.key));
          if (!children.length) return null;
          return { ...item, children };
        }
        if (item.anySection) return canOpenDepartments ? item : null;
        return can(item.key) ? item : null;
      })
      .filter(Boolean) as NavItem[];
  }, [t, can, canOpenDepartments]);

  const flatLeaves = useMemo(() => {
    const leaves: NavLeaf[] = [];
    for (const item of nav) {
      if ('children' in item && item.children) leaves.push(...item.children);
      else leaves.push(item as NavLeaf);
    }
    return leaves;
  }, [nav]);

  /** Sidebar visual grouping — items keep their original order & permissions. */
  const navGroups = useMemo<NavGroup[]>(() => {
    const groups: Record<string, NavItem[]> = {};
    for (const item of nav) {
      const groupId = GROUP_OF[item.id] ?? 'general';
      (groups[groupId] ??= []).push(item);
    }
    // Departments sit directly under General: the brief's IA puts the six
    // departments one step below the overview, not buried with content.
    const order = ['general', 'departments', 'content', 'finance', 'support', 'system'];
    return order
      .filter((id) => groups[id]?.length)
      .map((id) => ({ id, labelKey: `admin.navGroup.${id}`, items: groups[id] }));
  }, [nav]);

  /** Permission-filtered palette commands (single flat list of leaves). */
  const paletteCommands = useMemo<PaletteCommand[]>(
    () =>
      flatLeaves.map((leaf) => ({
        id: leaf.id,
        label: leaf.label,
        href: leaf.href,
        icon: BarChart3,
      })),
    [flatLeaves],
  );

  useEffect(() => {
    if (isSuper || loading || !user || !access) return;
    const path = pathname || '/admin';
    const allowed =
      flatLeaves.some((item) => pathActive(path, item.href, item.exact)) ||
      path.startsWith('/admin/academy/') ||
      path.startsWith('/admin/events/') ||
      path.startsWith('/admin/users/') ||
      path.startsWith('/admin/finance') ||
      path.startsWith('/admin/analytics') ||
      path.startsWith('/admin/payments') ||
      path.startsWith('/admin/contact') ||
      path.startsWith('/admin/settings');
    if (!allowed && path.startsWith('/admin')) {
      router.replace(flatLeaves[0]?.href ?? '/');
    }
  }, [access, isSuper, loading, user, pathname, flatLeaves, router]);

  useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const item of nav) {
      if ('children' in item && item.children) {
        const childHit = item.children.some((child) =>
          pathActive(pathname, child.href, child.exact),
        );
        const nestedHit =
          item.id === 'courses'
            ? pathname.startsWith('/admin/academy/courses/')
            : item.id === 'users'
              ? pathname.startsWith('/admin/users/')
              : item.id === 'settings'
                ? pathname.startsWith('/admin/settings') || pathname.startsWith('/admin/contact')
                : item.id === 'finance'
                  ? pathname.startsWith('/admin/finance') ||
                    pathname.startsWith('/admin/payments') ||
                    pathname.startsWith('/admin/discounts')
                  : false;
        if (childHit || nestedHit) next[item.id] = true;
      }
    }
    setOpenGroups((prev) => ({ ...prev, ...next }));
  }, [pathname, nav]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.getElementById('admin-main')?.focus({ preventScroll: true });
  }, [pathname]);

  const pageMeta = useMemo(() => {
    for (const item of nav) {
      if ('children' in item && item.children) {
        const child = item.children.find((c) => pathActive(pathname, c.href, c.exact));
        if (child) return { group: item.label, title: child.label, subtitle: t('admin.header.sub') };
      } else if (pathActive(pathname, item.href, item.exact)) {
        return { group: '', title: item.label, subtitle: t('admin.header.sub') };
      }
    }
    return { group: '', title: t('admin.sidebar'), subtitle: t('admin.header.sub') };
  }, [nav, pathname, t]);

  if (loading || !user || !isStaff) {
    return <div className="page-content auth-loading">{t('admin.checking')}</div>;
  }

  const roleLabel = isSuper ? t('domain.roles.superAdmin') : t('domain.roles.moderator');
  const initials = (user.name || user.email || '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  const badgeFor = (itemId: string): number => {
    if (itemId === 'tickets') return openTicketCount;
    if (itemId === 'messages') return unreadMessageCount;
    return 0;
  };


  return (
    <div
      className={`admin-shell${sidebarOpen ? ' sidebar-open' : ''}${
        collapsed ? ' sidebar-collapsed' : ''
      } admin-shell--redesigned`}
    >
      <a className="admin-skip-link" href="#admin-main">
        پرش به محتوای اصلی
      </a>
      {/* Mobile menu button (drawer toggle) */}
      <button
        type="button"
        className="admin-menu-button"
        aria-label={t('admin.menu')}
        aria-expanded={sidebarOpen}
        onClick={() => setSidebarOpen((open) => !open)}
      >
        {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
      </button>
      <div
        className="admin-sidebar-overlay"
        onClick={() => setSidebarOpen(false)}
        aria-hidden={!sidebarOpen}
      />

      <aside className="admin-sidebar" aria-label={t('admin.sidebar')}>
        <Link href="/admin" className="admin-brand" data-tip={t('admin.brand')}>
          <span className="admin-brand-mark">
            <BrandMark size={22} title="" />
          </span>
          <span>
            <strong>{t('admin.brand')}</strong>
            <small>{t('admin.brandSub')}</small>
          </span>
        </Link>

        <nav className="admin-nav" aria-label={t('admin.sidebar')}>
          {navGroups.map((group, groupIndex) => (
            <div key={group.id}>
              {groupIndex > 0 ? <hr className="admin-menu-sep" aria-hidden /> : null}
              <span className="admin-nav-group-label">{t(group.labelKey)}</span>
              {group.items.map((item) =>
                'children' in item && item.children ? (
                  <NavGroupItem
                    key={item.id}
                    item={item}
                    pathname={pathname}
                    open={Boolean(openGroups[item.id])}
                    onToggle={() => toggleGroup(item.id)}
                    badgeFor={badgeFor}
                  />
                ) : (
                  <NavLink
                    key={item.id}
                    leaf={item}
                    active={pathActive(pathname, item.href, item.exact)}
                    badge={badgeFor(item.id)}
                  />
                ),
              )}
            </div>
          ))}
        </nav>

        <div className="admin-sidebar-profile">
          <span className="admin-brand-mark admin-brand-mark--profile">
            <BrandMark size={18} title="" />
          </span>
          <span className="profile">
            <strong>{user.name || user.email || t('admin.brand')}</strong>
            <small>{roleLabel}</small>
          </span>
          <span className="profile-status" title="online" />
        </div>

        <button
          type="button"
          className="admin-collapse-button"
          aria-label={collapsed ? t('admin.sidebarExpand') : t('admin.sidebarCollapse')}
          aria-pressed={collapsed}
          onClick={toggleCollapsed}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </aside>

      <main id="admin-main" className="admin-main" tabIndex={-1}>
        <header className="admin-header">
          <div className="admin-header-left">
            <div className="admin-header-title">
              <nav className="admin-breadcrumb" aria-label={t('admin.breadcrumb')}>
                <Link href="/admin">{t('admin.breadcrumbRoot')}</Link>
                {pageMeta.group ? (
                  <>
                    <ChevronRight size={10} className="admin-breadcrumb-sep" aria-hidden />
                    <span>{pageMeta.group}</span>
                  </>
                ) : null}
                <ChevronRight size={10} className="admin-breadcrumb-sep" aria-hidden />
                <span aria-current="page">{pageMeta.title}</span>
              </nav>
              <h1>{pageMeta.title}</h1>
            </div>
          </div>

          <div className="admin-header-actions">
            <button
              type="button"
              className="admin-search-trigger"
              onClick={() => setPaletteOpen(true)}
              aria-haspopup="dialog"
            >
              <Search size={14} aria-hidden />
              <span className="admin-search-label">{t('admin.palette.searchLabel')}</span>
              <kbd>Ctrl K</kbd>
            </button>

            <AdminNotifications tickets={attention.tickets} messages={attention.messages} />

            <div className="admin-dropdown-wrap">
              <button
                type="button"
                className="admin-profile-button"
                aria-haspopup="menu"
                aria-expanded={profileOpen}
                onClick={() => setProfileOpen((open) => !open)}
              >
                <span className="admin-profile-avatar" aria-hidden>
                  {initials}
                </span>
                <span className="admin-profile-name">{user.name || t('admin.brand')}</span>
              </button>
              {profileOpen ? (
                <div
                  className="admin-header-dropdown admin-profile-menu"
                  role="menu"
                  aria-label={t('admin.profileMenu')}
                >
                  <div className="admin-profile-head">
                    <span className="admin-profile-avatar" aria-hidden>
                      {initials}
                    </span>
                    <span>
                      <strong>{user.name || t('admin.brand')}</strong>
                      <small>{user.email ?? ''}</small>
                    </span>
                  </div>
                  <span className="admin-badge info profile-role">
                    <CreditCard size={12} />
                    {roleLabel}
                  </span>
                  <Link
                    href="/admin/settings"
                    role="menuitem"
                    className="admin-menu-item"
                    onClick={() => setProfileOpen(false)}
                  >
                    <Settings size={14} aria-hidden />
                    {t('admin.nav.settings')}
                  </Link>
                  <Link
                    href="/"
                    role="menuitem"
                    className="admin-menu-item"
                    onClick={() => void handleSignOut()}
                  >
                    <Globe size={14} aria-hidden />
                    {t('admin.backToSite')}
                  </Link>
                  <hr className="admin-menu-sep" />
                  <button
                    type="button"
                    role="menuitem"
                    className="admin-menu-item danger"
                    onClick={() => {
                      setProfileOpen(false);
                      void handleSignOut();
                    }}
                  >
                    <LogOut size={14} aria-hidden />
                    {t('admin.logout')}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {showsAdminPageBack(pathname) ? (
          <PageBackButton href={ADMIN_PAGE_BACK_FALLBACK} variant="admin" />
        ) : null}

        <div className="admin-page-content">{children}</div>
      </main>

      <AdminCommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        commands={paletteCommands}
      />
    </div>
  );
}
