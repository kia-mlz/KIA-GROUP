'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity,
  BookOpen,
  Briefcase,
  Building2,
  ChevronLeft,
  CircleHelp,
  ClipboardList,
  Coins,
  CreditCard,
  FileText,
  Flag,
  FlaskConical,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Package,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Ticket,
  Trophy,
  Users,
  UsersRound,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { BrandMark } from '@/components/brand/BrandMark';
import type { DepartmentSlug } from '@/components/brand/departments';
import AdminCommandPalette, { type PaletteCommand } from '@/components/admin/AdminCommandPalette';
import AdminNotifications, { useAdminAttention } from '@/components/admin/AdminNotifications';
import { useAdminAccess } from '@/components/admin/useAdminAccess';
import { useAuth } from '@/context/AuthProvider';
import { useLanguage } from '@/context/LanguageProvider';
import {
  ADMIN_ROOT,
  DEPARTMENT_ORDER,
  DEPARTMENT_WORKSPACES,
  PLATFORM_NAV_GROUPS,
  departmentFromAdminPath,
  filterAdminNavGroups,
  flattenAdminNavLeaves,
  isAdminNavActive,
  type AdminNavGroup,
  type AdminNavLeaf,
} from '@/lib/adminNav';

const ICON_BY_ID: Record<string, LucideIcon> = {
  users: Users,
  'users-create': Users,
  staff: UsersRound,
  roles: ShieldCheck,
  tickets: Ticket,
  messages: MessageSquare,
  contact: MessageSquare,
  finance: Coins,
  orders: ClipboardList,
  payments: CreditCard,
  wallets: Wallet,
  entitlements: ShieldCheck,
  discounts: FileText,
  analytics: Activity,
  audit: FileText,
  settings: Settings,
  security: ShieldCheck,
  'academy-home': LayoutDashboard,
  courses: BookOpen,
  'courses-new': BookOpen,
  tests: ClipboardList,
  'events-home': LayoutDashboard,
  competitions: Flag,
  challenges: Trophy,
};

const DEPT_ICON: Record<DepartmentSlug, LucideIcon> = {
  academy: GraduationCap,
  work: Briefcase,
  material: Package,
  events: Trophy,
  community: UsersRound,
  labs: FlaskConical,
};

function leafIcon(item: AdminNavLeaf): LucideIcon {
  return ICON_BY_ID[item.id] ?? LayoutDashboard;
}

function NavSection({
  label,
  groups,
  pathname,
  countFor,
  showGroupLabels = false,
}: {
  label: string;
  groups: AdminNavGroup[];
  pathname: string;
  countFor: (item: AdminNavLeaf) => number;
  showGroupLabels?: boolean;
}) {
  if (!groups.length) return null;
  return (
    <div className="am-nav__items">
      <p className="am-nav__label">{label}</p>
      {groups.map((group) => (
        <div key={group.id}>
          {showGroupLabels && groups.length > 1 ? (
            <p className="am-nav__label" style={{ marginTop: '0.45rem', fontWeight: 550 }}>
              {group.label}
            </p>
          ) : null}
          {group.items.map((item) => {
            const Icon = leafIcon(item);
            const active = isAdminNavActive(pathname, item.href, item.exact);
            const count = countFor(item);
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`am-nav__item${active ? ' is-active' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={15} aria-hidden />
                <span>{item.label}</span>
                {count ? (
                  <b className="am-nav__badge" aria-label={`${count} مورد نیازمند توجه`}>
                    {count > 99 ? '۹۹+' : count}
                  </b>
                ) : null}
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/**
 * Kia Admin — minimal professional shell.
 * Platform ops vs department workspaces; permissions from server matrix.
 */
export default function AdminLayoutClient({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? '/admin';
  const { t } = useLanguage();
  const { user, loading, signedOut, logout } = useAuth();
  const { isSuper, isStaff, can } = useAdminAccess();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);

  const department = departmentFromAdminPath(pathname);
  const workspace = department ? DEPARTMENT_WORKSPACES[department] : null;

  useEffect(() => {
    if (!loading && !signedOut && (!user || !isStaff)) router.replace('/login?next=/admin');
  }, [loading, signedOut, user, isStaff, router]);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem('kia.admin.am.collapsed') === '1');
    } catch {
      /* optional */
    }
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setQuickOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.getElementById('admin-main')?.focus({ preventScroll: true });
  }, [pathname]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(true);
      }
      if (event.key === 'Escape') {
        setMobileOpen(false);
        setProfileOpen(false);
        setQuickOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const attention = useAdminAttention(Boolean(user) && isStaff);
  const counts = useMemo(
    () => ({
      tickets: attention.tickets.filter(
        (ticket) => ticket.status === 'OPEN' || ticket.status === 'IN_PROGRESS',
      ).length,
      messages: attention.messages.filter((message) => !message.readAt).length,
    }),
    [attention],
  );

  const platformGroups = useMemo(
    () => filterAdminNavGroups(PLATFORM_NAV_GROUPS, can),
    [can],
  );
  const generalGroups = useMemo(
    () => platformGroups.filter((group) => group.id !== 'system'),
    [platformGroups],
  );
  const systemGroups = useMemo(
    () => platformGroups.filter((group) => group.id === 'system'),
    [platformGroups],
  );
  const workspaceGroups = useMemo(
    () => (workspace ? filterAdminNavGroups(workspace.groups, can) : []),
    [workspace, can],
  );

  const allLeaves = useMemo(() => {
    const platform = flattenAdminNavLeaves(PLATFORM_NAV_GROUPS, can);
    const depts = DEPARTMENT_ORDER.flatMap((slug) =>
      flattenAdminNavLeaves(DEPARTMENT_WORKSPACES[slug].groups, can),
    );
    return [...platform, ...depts];
  }, [can]);

  const quickCreates = useMemo(
    () => allLeaves.filter((item) => item.quickCreate && /\/(create|new)$/.test(item.href)),
    [allLeaves],
  );

  const availableDepartments = useMemo(
    () =>
      DEPARTMENT_ORDER.filter((slug) => {
        const ws = DEPARTMENT_WORKSPACES[slug];
        if (!ws.live) return true;
        return flattenAdminNavLeaves(ws.groups, can).length > 0;
      }),
    [can],
  );

  useEffect(() => {
    if (isSuper || loading || !user) return;
    const allowed =
      allLeaves.some((item) => isAdminNavActive(pathname, item.href, item.exact)) ||
      pathname === '/admin/departments' ||
      pathname === '/admin' ||
      Boolean(department && !DEPARTMENT_WORKSPACES[department].live);
    if (!allowed) router.replace(allLeaves[0]?.href ?? '/');
  }, [isSuper, loading, user, allLeaves, pathname, router, department]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((previous) => {
      const next = !previous;
      try {
        window.localStorage.setItem('kia.admin.am.collapsed', next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const countFor = (item: AdminNavLeaf) => (item.badge ? counts[item.badge] : 0);
  const signOut = async () => {
    await logout();
    router.replace('/');
  };

  const page = allLeaves.find((item) => isAdminNavActive(pathname, item.href, item.exact));
  const pageTitle =
    page?.label ??
    (department
      ? `مدیریت ${DEPARTMENT_WORKSPACES[department].label}`
      : pathname === '/admin/departments'
        ? ADMIN_ROOT.departments.label
        : ADMIN_ROOT.overview.label);

  const initials = (user?.name || user?.email || 'ک')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  const paletteCommands = useMemo<PaletteCommand[]>(
    () =>
      allLeaves.map((item) => ({
        id: item.id,
        label: item.label,
        href: item.href,
        icon: leafIcon(item),
      })),
    [allLeaves],
  );

  if (loading || !user || !isStaff) {
    return <div className="page-content auth-loading">{t('admin.checking')}</div>;
  }

  return (
    <div
      className={`am-shell${mobileOpen ? ' is-drawer-open' : ''}${collapsed ? ' is-collapsed' : ''}${
        department ? ` is-workspace is-workspace--${department}` : ''
      }`}
    >
      <a className="am-skip" href="#admin-main">
        پرش به محتوای اصلی
      </a>

      <button
        type="button"
        className="am-mobile"
        aria-label="باز کردن منو"
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((open) => !open)}
      >
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>
      <button type="button" className="am-scrim" aria-label="بستن منو" onClick={() => setMobileOpen(false)} />

      <aside className="am-side" aria-label="ناوبری پنل مدیریت">
        <Link href={ADMIN_ROOT.overview.href} className="am-brand" aria-label="پنل مدیریت کیا">
          <span className="am-brand__mark">
            <BrandMark size={18} title="" />
          </span>
          <span className="am-brand__copy">
            <strong>کیا</strong>
            <small>{department ? `فضای کاری ${DEPARTMENT_WORKSPACES[department].label}` : 'پنل مدیریت'}</small>
          </span>
        </Link>

        {workspace ? (
          <Link className="am-back" href={ADMIN_ROOT.departments.href}>
            <ChevronLeft size={14} aria-hidden /> بازگشت به دپارتمان‌ها
          </Link>
        ) : (
          <>
            <Link
              className={`am-link${pathname === ADMIN_ROOT.overview.href ? ' is-active' : ''}`}
              href={ADMIN_ROOT.overview.href}
            >
              <LayoutDashboard size={15} aria-hidden />
              <span>{ADMIN_ROOT.overview.label}</span>
            </Link>
            <Link
              className={`am-link${pathname.startsWith(ADMIN_ROOT.departments.href) ? ' is-active' : ''}`}
              href={ADMIN_ROOT.departments.href}
            >
              <Building2 size={15} aria-hidden />
              <span>{ADMIN_ROOT.departments.label}</span>
              <b>{availableDepartments.length}</b>
            </Link>
          </>
        )}

        <nav
          className="am-nav"
          aria-label={department ? `ابزارهای ${DEPARTMENT_WORKSPACES[department].label}` : 'بخش‌های مدیریت'}
        >
          {workspace ? (
            workspaceGroups.length ? (
              <NavSection
                label="ابزارها"
                groups={workspaceGroups}
                pathname={pathname}
                countFor={countFor}
              />
            ) : !workspace.live ? (
              <p className="am-nav__empty">
                هنوز ماژول مدیریتی برای این دپارتمان فعال نشده است.
              </p>
            ) : null
          ) : (
            <>
              <NavSection
                label="عمومی"
                groups={generalGroups}
                pathname={pathname}
                countFor={countFor}
                showGroupLabels
              />
              <NavSection
                label="سیستم"
                groups={systemGroups}
                pathname={pathname}
                countFor={countFor}
              />
            </>
          )}
        </nav>

        {!workspace ? (
          <div className="am-depts" aria-label="دپارتمان‌ها">
            <span>دپارتمان‌ها</span>
            {DEPARTMENT_ORDER.map((slug) => {
              const Icon = DEPT_ICON[slug];
              const ws = DEPARTMENT_WORKSPACES[slug];
              return (
                <Link key={slug} href={ws.href} aria-label={`مدیریت ${ws.label}`}>
                  <i className={`am-dot am-dot--${slug}`} aria-hidden />
                  <Icon size={12} aria-hidden />
                  {ws.label}
                </Link>
              );
            })}
          </div>
        ) : null}

        <div className="am-account">
          <span className="am-avatar" aria-hidden>
            {initials}
          </span>
          <span>
            <strong>{user.name || 'مدیر کیا'}</strong>
            <small>{isSuper ? 'مدیر ارشد' : 'مدیر سامانه'}</small>
          </span>
          <button type="button" aria-label="خروج از حساب" onClick={() => void signOut()}>
            <LogOut size={15} />
          </button>
        </div>

        <button
          type="button"
          className="am-collapse"
          aria-label={collapsed ? 'باز کردن نوار کناری' : 'جمع کردن نوار کناری'}
          onClick={toggleCollapsed}
        >
          {collapsed ? <PanelRightOpen size={14} /> : <PanelRightClose size={14} />}
        </button>
      </aside>

      <main id="admin-main" className="am-main" tabIndex={-1}>
        <header className="am-top">
          <div className="am-top__title">
            <nav className="am-crumb" aria-label="مسیر صفحه">
              <Link href="/admin">مدیریت</Link>
              {department ? (
                <>
                  <ChevronLeft size={12} aria-hidden />
                  <Link href={`/admin/${department}`}>{DEPARTMENT_WORKSPACES[department].label}</Link>
                </>
              ) : null}
              <ChevronLeft size={12} aria-hidden />
              <span aria-current="page">{pageTitle}</span>
            </nav>
            <h1>{pageTitle}</h1>
          </div>

          <div className="am-top__actions">
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className="am-icon-btn"
                aria-expanded={quickOpen}
                aria-haspopup="menu"
                onClick={() => setQuickOpen((open) => !open)}
              >
                <Plus size={15} aria-hidden />
                <span className="am-search-label">ایجاد</span>
              </button>
              {quickOpen ? (
                <div className="am-menu" role="menu">
                  {quickCreates.length ? (
                    quickCreates.map((item) => (
                      <Link
                        key={item.id}
                        href={item.href}
                        role="menuitem"
                        onClick={() => setQuickOpen(false)}
                      >
                        {item.label}
                      </Link>
                    ))
                  ) : (
                    <span className="am-menu__empty">دسترسی ایجاد سریع ندارید</span>
                  )}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              className="am-icon-btn"
              onClick={() => setPaletteOpen(true)}
              aria-haspopup="dialog"
            >
              <Search size={15} aria-hidden />
              <span className="am-search-label">جستجو</span>
              <kbd>⌘K</kbd>
            </button>

            <AdminNotifications tickets={attention.tickets} messages={attention.messages} />

            <button
              type="button"
              className="am-icon-btn am-icon-btn--ghost"
              aria-label="باز کردن منوی حساب"
              aria-expanded={profileOpen}
              onClick={() => setProfileOpen((open) => !open)}
            >
              <span className="am-avatar" style={{ width: '1.65rem', height: '1.65rem' }}>
                {initials}
              </span>
            </button>
            {profileOpen ? (
              <div className="am-menu" role="menu">
                <strong>{user.name || 'مدیر کیا'}</strong>
                <small>{user.email}</small>
                <Link href="/admin/settings" role="menuitem" onClick={() => setProfileOpen(false)}>
                  <Settings size={14} /> تنظیمات
                </Link>
                <Link href="/admin/security" role="menuitem" onClick={() => setProfileOpen(false)}>
                  <ShieldCheck size={14} /> امنیت
                </Link>
                <Link href="/" role="menuitem">
                  <CircleHelp size={14} /> مشاهده سایت
                </Link>
                <button type="button" role="menuitem" onClick={() => void signOut()}>
                  <LogOut size={14} /> خروج
                </button>
              </div>
            ) : null}
          </div>
        </header>

        <div className="am-body">{children}</div>
      </main>

      <AdminCommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        commands={paletteCommands}
        canSearchUsers={can('users', 'view')}
      />
    </div>
  );
}
