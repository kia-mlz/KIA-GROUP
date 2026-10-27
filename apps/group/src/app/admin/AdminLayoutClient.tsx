'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity,
  BookOpen,
  Briefcase,
  Building2,
  ChevronDown,
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
import type { AdminAccessSection } from '@kia./shared';
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
  type AdminNavLeaf,
} from '@/lib/adminNav';

const ICON_BY_ID: Record<string, LucideIcon> = {
  users: Users,
  'users-create': Users,
  roles: ShieldCheck,
  tickets: Ticket,
  messages: MessageSquare,
  contact: MailIconFallback,
  finance: Coins,
  orders: ClipboardList,
  payments: CreditCard,
  wallets: Wallet,
  entitlements: ShieldCheck,
  discounts: FileText,
  analytics: Activity,
  audit: ScrollIconFallback,
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

function MailIconFallback(props: { size?: number; className?: string }) {
  return <MessageSquare {...props} />;
}
function ScrollIconFallback(props: { size?: number; className?: string }) {
  return <FileText {...props} />;
}

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

function NavGroupBlock({
  group,
  pathname,
  expanded,
  onToggle,
  countFor,
}: {
  group: { id: string; label: string; items: AdminNavLeaf[] };
  pathname: string;
  expanded: boolean;
  onToggle: () => void;
  countFor: (item: AdminNavLeaf) => number;
}) {
  const groupActive = group.items.some((item) =>
    isAdminNavActive(pathname, item.href, item.exact),
  );
  return (
    <section className={`ops-nav-group${groupActive ? ' is-active' : ''}`}>
      <button
        type="button"
        className="ops-nav-group__trigger"
        aria-expanded={expanded}
        onClick={onToggle}
      >
        <span>{group.label}</span>
        <ChevronDown size={14} className="ops-nav-group__chevron" aria-hidden />
      </button>
      <div className="ops-nav-group__items" hidden={!expanded}>
        {group.items.map((item) => {
          const Icon = leafIcon(item);
          const active = isAdminNavActive(pathname, item.href, item.exact);
          const count = countFor(item);
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`ops-nav-link${active ? ' is-active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={16} aria-hidden />
              <span>{item.label}</span>
              {count ? (
                <b className="ops-nav-badge" aria-label={`${count} مورد نیازمند توجه`}>
                  {count > 99 ? '۹۹+' : count}
                </b>
              ) : null}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/**
 * Kia Admin Ops Center shell — redesigned from scratch.
 * Platform chrome vs department workspaces; permissions from server matrix.
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
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const department = departmentFromAdminPath(pathname);
  const workspace = department ? DEPARTMENT_WORKSPACES[department] : null;

  useEffect(() => {
    if (!loading && !signedOut && (!user || !isStaff)) router.replace('/login?next=/admin');
  }, [loading, signedOut, user, isStaff, router]);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem('kia.admin.ops.collapsed') === '1');
      setOpenSections(
        JSON.parse(window.localStorage.getItem('kia.admin.ops.open') ?? '{}') as Record<
          string,
          boolean
        >,
      );
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
  const workspaceGroups = useMemo(
    () => (workspace ? filterAdminNavGroups(workspace.groups, can) : []),
    [workspace, can],
  );
  const navigableGroups = workspace ? workspaceGroups : platformGroups;

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

  const toggleSection = useCallback((id: string) => {
    setOpenSections((previous) => {
      const next = { ...previous, [id]: !(previous[id] ?? true) };
      try {
        window.localStorage.setItem('kia.admin.ops.open', JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const toggleCollapsed = () =>
    setCollapsed((previous) => {
      const next = !previous;
      try {
        window.localStorage.setItem('kia.admin.ops.collapsed', next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });

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
      className={`ops-shell${mobileOpen ? ' is-drawer-open' : ''}${collapsed ? ' is-collapsed' : ''}${
        department ? ` is-workspace is-workspace--${department}` : ''
      }`}
    >
      <a className="ops-skip" href="#admin-main">
        پرش به محتوای اصلی
      </a>

      <button
        type="button"
        className="ops-mobile-menu"
        aria-label="باز کردن منو"
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((open) => !open)}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>
      <button type="button" className="ops-scrim" aria-label="بستن منو" onClick={() => setMobileOpen(false)} />

      <aside className="ops-sidebar" aria-label="ناوبری مرکز کنترل">
        <Link href={ADMIN_ROOT.overview.href} className="ops-brand" aria-label="مرکز کنترل کیا">
          <span className="ops-brand__mark">
            <BrandMark size={22} title="" />
          </span>
          <span className="ops-brand__copy">
            <strong>کیا</strong>
            <small>{department ? `فضای کاری ${DEPARTMENT_WORKSPACES[department].label}` : 'مرکز کنترل'}</small>
          </span>
        </Link>

        {workspace ? (
          <Link className="ops-return" href={ADMIN_ROOT.departments.href}>
            <ChevronLeft size={15} aria-hidden /> بازگشت به دپارتمان‌ها
          </Link>
        ) : (
          <>
            <Link
              className={`ops-root-link${pathname === ADMIN_ROOT.overview.href ? ' is-active' : ''}`}
              href={ADMIN_ROOT.overview.href}
            >
              <LayoutDashboard size={17} aria-hidden />
              <span>{ADMIN_ROOT.overview.label}</span>
            </Link>
            <Link
              className={`ops-root-link${pathname.startsWith(ADMIN_ROOT.departments.href) ? ' is-active' : ''}`}
              href={ADMIN_ROOT.departments.href}
            >
              <Building2 size={17} aria-hidden />
              <span>{ADMIN_ROOT.departments.label}</span>
              <b>{availableDepartments.length}</b>
            </Link>
          </>
        )}

        <nav
          className="ops-nav"
          aria-label={department ? `ابزارهای ${DEPARTMENT_WORKSPACES[department].label}` : 'بخش‌های مدیریت'}
        >
          {navigableGroups.length ? (
            navigableGroups.map((group) => (
              <NavGroupBlock
                key={group.id}
                group={group}
                pathname={pathname}
                expanded={openSections[group.id] ?? true}
                onToggle={() => toggleSection(group.id)}
                countFor={countFor}
              />
            ))
          ) : workspace && !workspace.live ? (
            <p className="ops-nav-empty">
              هنوز ماژول مدیریتی برای این دپارتمان فعال نشده است. از صفحهٔ فضای کاری برای جزئیات استفاده کنید.
            </p>
          ) : null}
        </nav>

        {!workspace ? (
          <div className="ops-dept-rail" aria-label="میانبر دپارتمان‌ها">
            <span>دپارتمان‌ها</span>
            {DEPARTMENT_ORDER.map((slug) => {
              const Icon = DEPT_ICON[slug];
              const ws = DEPARTMENT_WORKSPACES[slug];
              return (
                <Link key={slug} href={ws.href} aria-label={`مدیریت ${ws.label}`}>
                  <i className={`ops-dept-dot ops-dept-dot--${slug}`} aria-hidden />
                  <Icon size={13} aria-hidden />
                  {ws.label}
                </Link>
              );
            })}
          </div>
        ) : null}

        <div className="ops-account">
          <span className="ops-avatar" aria-hidden>
            {initials}
          </span>
          <span>
            <strong>{user.name || 'مدیر کیا'}</strong>
            <small>{isSuper ? 'مدیر ارشد' : 'مدیر سامانه'}</small>
          </span>
          <button type="button" aria-label="خروج از حساب" onClick={() => void signOut()}>
            <LogOut size={16} />
          </button>
        </div>

        <button
          type="button"
          className="ops-collapse"
          aria-label={collapsed ? 'باز کردن نوار کناری' : 'جمع کردن نوار کناری'}
          onClick={toggleCollapsed}
        >
          {collapsed ? <PanelRightOpen size={16} /> : <PanelRightClose size={16} />}
        </button>
      </aside>

      <main id="admin-main" className="ops-main" tabIndex={-1}>
        <header className="ops-header">
          <div className="ops-header__title">
            <nav className="ops-breadcrumb" aria-label="مسیر صفحه">
              <Link href="/admin">مدیریت</Link>
              {department ? (
                <>
                  <ChevronLeft size={13} aria-hidden />
                  <Link href={`/admin/${department}`}>{DEPARTMENT_WORKSPACES[department].label}</Link>
                </>
              ) : null}
              <ChevronLeft size={13} aria-hidden />
              <span aria-current="page">{pageTitle}</span>
            </nav>
            <h1>{pageTitle}</h1>
          </div>

          <div className="ops-header__actions">
            <div className="ops-quick">
              <button
                type="button"
                className="ops-quick__btn"
                aria-expanded={quickOpen}
                aria-haspopup="menu"
                onClick={() => setQuickOpen((open) => !open)}
              >
                <Plus size={16} aria-hidden />
                <span>ایجاد سریع</span>
              </button>
              {quickOpen ? (
                <div className="ops-quick__menu" role="menu">
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
                    <span className="ops-quick__empty">دسترسی ایجاد سریع ندارید</span>
                  )}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              className="ops-search"
              onClick={() => setPaletteOpen(true)}
              aria-haspopup="dialog"
            >
              <Search size={17} aria-hidden />
              <span>جستجو در پنل</span>
              <kbd>⌘ K</kbd>
            </button>

            <AdminNotifications tickets={attention.tickets} messages={attention.messages} />

            <button
              type="button"
              className="ops-profile"
              aria-label="باز کردن منوی حساب"
              aria-expanded={profileOpen}
              onClick={() => setProfileOpen((open) => !open)}
            >
              <span>{initials}</span>
            </button>
            {profileOpen ? (
              <div className="ops-profile-menu" role="menu">
                <strong>{user.name || 'مدیر کیا'}</strong>
                <small>{user.email}</small>
                <Link href="/admin/settings" role="menuitem" onClick={() => setProfileOpen(false)}>
                  <Settings size={15} /> تنظیمات
                </Link>
                <Link href="/admin/security" role="menuitem" onClick={() => setProfileOpen(false)}>
                  <ShieldCheck size={15} /> امنیت
                </Link>
                <Link href="/" role="menuitem">
                  <CircleHelp size={15} /> مشاهده سایت
                </Link>
                <button type="button" role="menuitem" onClick={() => void signOut()}>
                  <LogOut size={15} /> خروج
                </button>
              </div>
            ) : null}
          </div>
        </header>

        <div className="ops-page">{children}</div>
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
