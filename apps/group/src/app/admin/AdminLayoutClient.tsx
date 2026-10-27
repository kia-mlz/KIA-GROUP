'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity, BarChart3, BookOpen, Building2, ChevronDown, ChevronRight,
  CircleHelp, ClipboardList, Coins, CreditCard, FileText, Flag, GraduationCap,
  LayoutDashboard, LogOut, Menu, MessageSquare, PanelRightClose, PanelRightOpen,
  Search, Settings, ShieldCheck, Ticket, Trophy, Users, Wallet, X,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AdminAccessSection } from '@kia./shared';
import { BrandMark } from '@/components/brand/BrandMark';
import AdminCommandPalette, { type PaletteCommand } from '@/components/admin/AdminCommandPalette';
import AdminNotifications, { useAdminAttention } from '@/components/admin/AdminNotifications';
import { useAdminAccess } from '@/components/admin/useAdminAccess';
import { useAuth } from '@/context/AuthProvider';
import { useLanguage } from '@/context/LanguageProvider';

type NavLeaf = {
  id: string; label: string; href: string; icon: LucideIcon; section: AdminAccessSection;
  exact?: boolean; badge?: 'tickets' | 'messages';
};
type NavGroup = { id: string; label: string; icon: LucideIcon; items: NavLeaf[] };

/* Kept as a small, explicit root registry: the two destinations are available
   to every staff workspace and stay discoverable independently of permissions. */
const rootNavigation = [
  { href: '/admin', label: 'نمای کلی' },
  { href: '/admin/departments', label: 'دپارتمان‌ها' },
] as const;

const platformGroups: NavGroup[] = [
  { id: 'platform', label: 'مدیریت پلتفرم', icon: Building2, items: [
    { id: 'users', label: 'کاربران', href: '/admin/users', icon: Users, section: 'users' },
    { id: 'roles', label: 'نقش‌ها و دسترسی‌ها', href: '/admin/users/roles', icon: ShieldCheck, section: 'users' },
    { id: 'tickets', label: 'پشتیبانی', href: '/admin/tickets', icon: Ticket, section: 'tickets', badge: 'tickets' },
    { id: 'messages', label: 'پیام‌ها', href: '/admin/messages', icon: MessageSquare, section: 'messages', badge: 'messages' },
  ]},
  { id: 'commerce', label: 'مالی و فروش', icon: Wallet, items: [
    { id: 'finance', label: 'نمای مالی', href: '/admin/finance', icon: Coins, section: 'payments', exact: true },
    { id: 'orders', label: 'سفارش‌ها', href: '/admin/orders', icon: ClipboardList, section: 'payments' },
    { id: 'payments', label: 'پرداخت‌ها', href: '/admin/payments', icon: CreditCard, section: 'payments' },
    { id: 'wallets', label: 'کیف پول‌ها', href: '/admin/wallets', icon: Wallet, section: 'payments' },
    { id: 'discounts', label: 'تخفیف‌ها', href: '/admin/discounts', icon: FileText, section: 'discounts' },
  ]},
  { id: 'control', label: 'کنترل و سیستم', icon: Activity, items: [
    { id: 'analytics', label: 'گزارش‌ها و تحلیل', href: '/admin/analytics', icon: BarChart3, section: 'stats' },
    { id: 'audit', label: 'ثبت رویدادها', href: '/admin/audit', icon: ShieldCheck, section: 'audit' },
    { id: 'settings', label: 'تنظیمات پلتفرم', href: '/admin/settings', icon: Settings, section: 'settings' },
    { id: 'security', label: 'امنیت حساب', href: '/admin/security', icon: ShieldCheck, section: 'settings' },
  ]},
];

const departmentGroups: Record<string, NavGroup> = {
  academy: { id: 'academy', label: 'مدیریت آکادمی', icon: GraduationCap, items: [
    { id: 'academy-home', label: 'نمای کلی آکادمی', href: '/admin/academy', icon: LayoutDashboard, section: 'courses', exact: true },
    { id: 'courses', label: 'دوره‌ها و درس‌ها', href: '/admin/academy/courses', icon: BookOpen, section: 'courses' },
    { id: 'tests', label: 'آزمون‌ها و آمادگی', href: '/admin/academy/tests', icon: ClipboardList, section: 'tests' },
  ]},
  events: { id: 'events', label: 'مدیریت ایونت', icon: Trophy, items: [
    { id: 'events-home', label: 'نمای کلی ایونت', href: '/admin/events', icon: LayoutDashboard, section: 'competitions', exact: true },
    { id: 'competitions', label: 'رقابت‌ها', href: '/admin/events/competitions', icon: Flag, section: 'competitions' },
    { id: 'challenges', label: 'چالش‌ها', href: '/admin/events/challenges', icon: Trophy, section: 'challenges' },
  ]},
  // These workspaces deliberately start empty: the shell remains department
  // scoped, but no fictional management action is exposed before an API exists.
  work: { id: 'work', label: 'مدیریت کار', icon: Building2, items: [] },
  material: { id: 'material', label: 'مدیریت متریال', icon: FileText, items: [] },
  community: { id: 'community', label: 'مدیریت کامیونیتی', icon: Users, items: [] },
  labs: { id: 'labs', label: 'مدیریت لب', icon: Activity, items: [] },
};
const departmentNames: Record<string, string> = {
  academy: 'آکادمی', work: 'کار', material: 'متریال', events: 'ایونت', community: 'کامیونیتی', labs: 'لب',
};
function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}
function departmentFromPath(pathname: string) {
  return Object.keys(departmentNames).find((key) => pathname === `/admin/${key}` || pathname.startsWith(`/admin/${key}/`)) ?? null;
}

function NavSection({ group, pathname, expanded, onToggle, countFor }: {
  group: NavGroup; pathname: string; expanded: boolean; onToggle: () => void; countFor: (item: NavLeaf) => number;
}) {
  const GroupIcon = group.icon;
  const groupActive = group.items.some((item) => isActive(pathname, item.href, item.exact));
  return <section className={`admin-cr-nav-section${groupActive ? ' is-active' : ''}`}>
    <button type="button" className="admin-cr-nav-section-trigger" aria-expanded={expanded} onClick={onToggle}>
      <GroupIcon size={17} aria-hidden /><span>{group.label}</span><ChevronDown size={15} className="admin-cr-nav-section-chevron" aria-hidden />
    </button>
    <div className="admin-cr-nav-items" hidden={!expanded}>
      {group.items.map((item) => {
        const Icon = item.icon; const count = countFor(item); const active = isActive(pathname, item.href, item.exact);
        return <Link key={item.id} href={item.href} className={`admin-cr-nav-item${active ? ' is-active' : ''}`} aria-current={active ? 'page' : undefined}>
          <Icon size={16} aria-hidden /><span>{item.label}</span>
          {count ? <b className="admin-cr-count" aria-label={`${count} مورد نیازمند توجه`}>{count > 99 ? '۹۹+' : count}</b> : null}
        </Link>;
      })}
    </div>
  </section>;
}

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
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const department = departmentFromPath(pathname);

  useEffect(() => {
    if (!loading && !signedOut && (!user || !isStaff)) router.replace('/login?next=/admin');
  }, [loading, signedOut, user, isStaff, router]);
  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem('kia.admin.control-room.collapsed') === '1');
      setOpenSections(JSON.parse(window.localStorage.getItem('kia.admin.control-room.open') ?? '{}') as Record<string, boolean>);
    } catch { /* storage is optional */ }
  }, []);
  useEffect(() => { setMobileOpen(false); }, [pathname]);
  useEffect(() => { document.getElementById('admin-main')?.focus({ preventScroll: true }); }, [pathname]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setPaletteOpen(true); }
      if (event.key === 'Escape') { setMobileOpen(false); setProfileOpen(false); }
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, []);

  const attention = useAdminAttention(Boolean(user) && isStaff);
  const counts = useMemo(() => ({
    tickets: attention.tickets.filter((ticket) => ticket.status === 'OPEN' || ticket.status === 'IN_PROGRESS').length,
    messages: attention.messages.filter((message) => !message.readAt).length,
  }), [attention]);
  const permittedPlatform = useMemo(() => platformGroups.map((group) => ({ ...group, items: group.items.filter((item) => can(item.section)) })).filter((group) => group.items.length), [can]);
  const workspace = department ? departmentGroups[department] : undefined;
  const permittedWorkspace = useMemo(() => workspace ? { ...workspace, items: workspace.items.filter((item) => can(item.section)) } : undefined, [workspace, can]);
  const availableDepartments = useMemo(() => Object.entries(departmentGroups).filter(([, group]) => group.items.some((item) => can(item.section))).map(([key]) => key), [can]);
  const navigableGroups = permittedWorkspace ? [permittedWorkspace] : permittedPlatform;
  const allLeaves = useMemo(() => [...permittedPlatform.flatMap((group) => group.items), ...Object.values(departmentGroups).flatMap((group) => group.items.filter((item) => can(item.section)))], [permittedPlatform, can]);
  const paletteCommands = useMemo<PaletteCommand[]>(() => allLeaves.map((item) => ({ id: item.id, label: item.label, href: item.href, icon: item.icon })), [allLeaves]);
  useEffect(() => {
    if (isSuper || loading || !user) return;
    const allowed = allLeaves.some((item) => isActive(pathname, item.href, item.exact)) || pathname === '/admin/departments';
    if (!allowed) router.replace(allLeaves[0]?.href ?? '/');
  }, [isSuper, loading, user, allLeaves, pathname, router]);

  const toggleSection = useCallback((id: string) => setOpenSections((previous) => {
    const next = { ...previous, [id]: !(previous[id] ?? true) };
    try { window.localStorage.setItem('kia.admin.control-room.open', JSON.stringify(next)); } catch { /* ignore */ }
    return next;
  }), []);
  const toggleCollapsed = () => setCollapsed((previous) => {
    const next = !previous;
    try { window.localStorage.setItem('kia.admin.control-room.collapsed', next ? '1' : '0'); } catch { /* ignore */ }
    return next;
  });
  const countFor = (item: NavLeaf) => item.badge ? counts[item.badge] : 0;
  const signOut = async () => { await logout(); router.replace('/'); };
  const page = allLeaves.find((item) => isActive(pathname, item.href, item.exact));
  const pageTitle = page?.label ?? (department ? `مدیریت ${departmentNames[department]}` : 'مرکز کنترل');
  const initials = (user?.name || user?.email || 'ک').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  if (loading || !user || !isStaff) return <div className="page-content auth-loading">{t('admin.checking')}</div>;

  return <div className={`admin-shell admin-control-room${mobileOpen ? ' is-drawer-open' : ''}${collapsed ? ' is-collapsed' : ''}${department ? ` is-workspace is-workspace--${department}` : ''}`}>
    <a className="admin-skip-link" href="#admin-main">پرش به محتوای اصلی</a>
    <button type="button" className="admin-cr-mobile-menu" aria-label="باز کردن منو" aria-expanded={mobileOpen} onClick={() => setMobileOpen((open) => !open)}>{mobileOpen ? <X size={20} /> : <Menu size={20} />}</button>
    <button type="button" className="admin-cr-scrim" aria-label="بستن منو" onClick={() => setMobileOpen(false)} />
    <aside className="admin-cr-sidebar" aria-label="ناوبری پنل مدیریت">
      <Link href={rootNavigation[0].href} className="admin-cr-brand" aria-label="مرکز کنترل کیا"><span className="admin-cr-brand-mark"><BrandMark size={23} title="" /></span><span className="admin-cr-brand-copy"><strong>Kia</strong><small>{department ? `فضای کاری ${departmentNames[department]}` : 'مرکز کنترل'}</small></span></Link>
      {permittedWorkspace ? <Link className="admin-cr-return" href={rootNavigation[1].href}><ChevronRight size={15} aria-hidden /> بازگشت به دپارتمان‌ها</Link> : <Link className={`admin-cr-overview${pathname === rootNavigation[0].href ? ' is-active' : ''}`} href={rootNavigation[0].href}><LayoutDashboard size={17} aria-hidden /><span>{rootNavigation[0].label}</span></Link>}
      {!permittedWorkspace ? <Link className={`admin-cr-departments${pathname.startsWith(rootNavigation[1].href) ? ' is-active' : ''}`} href={rootNavigation[1].href}><Building2 size={17} aria-hidden /><span>{rootNavigation[1].label}</span><b>{availableDepartments.length}</b></Link> : null}
      <nav className="admin-cr-nav" aria-label={department ? `ابزارهای ${departmentNames[department]}` : 'بخش‌های مدیریت'}>
        {navigableGroups.map((group) => <NavSection key={group.id} group={group} pathname={pathname} expanded={openSections[group.id] ?? true} onToggle={() => toggleSection(group.id)} countFor={countFor} />)}
      </nav>
      {!permittedWorkspace ? <div className="admin-cr-department-switcher"><span>فضاهای کاری</span>{Object.entries(departmentNames).map(([key, label]) => <Link key={key} href={`/admin/${key}`} aria-label={`مدیریت ${label}`}><i className={`admin-cr-dept-dot admin-cr-dept-dot--${key}`} aria-hidden />{label}</Link>)}</div> : null}
      <div className="admin-cr-account"><span className="admin-cr-avatar" aria-hidden>{initials}</span><span><strong>{user.name || 'مدیر کیا'}</strong><small>{isSuper ? 'مدیر ارشد' : 'مدیر سامانه'}</small></span><button type="button" aria-label="خروج از حساب" onClick={() => void signOut()}><LogOut size={16} /></button></div>
      <button type="button" className="admin-cr-collapse" aria-label={collapsed ? 'باز کردن نوار کناری' : 'جمع کردن نوار کناری'} onClick={toggleCollapsed}>{collapsed ? <PanelRightOpen size={16} /> : <PanelRightClose size={16} />}</button>
    </aside>
    <main id="admin-main" className="admin-main" tabIndex={-1}>
      <header className="admin-cr-header"><div className="admin-cr-title"><nav className="admin-cr-breadcrumb" aria-label="مسیر صفحه"><Link href="/admin">مدیریت</Link>{department ? <><ChevronRight size={13} aria-hidden /><Link href={`/admin/${department}`}>{departmentNames[department]}</Link></> : null}<ChevronRight size={13} aria-hidden /><span aria-current="page">{pageTitle}</span></nav><h1>{pageTitle}</h1></div>
        <div className="admin-cr-header-actions"><button type="button" className="admin-cr-search" onClick={() => setPaletteOpen(true)} aria-haspopup="dialog"><Search size={17} aria-hidden /><span>جستجو در پنل</span><kbd>⌘ K</kbd></button><AdminNotifications tickets={attention.tickets} messages={attention.messages} /><button type="button" className="admin-cr-profile" aria-label="باز کردن منوی حساب" aria-expanded={profileOpen} onClick={() => setProfileOpen((open) => !open)}><span>{initials}</span></button>{profileOpen ? <div className="admin-cr-profile-menu" role="menu"><strong>{user.name || 'مدیر کیا'}</strong><small>{user.email}</small><Link href="/admin/settings" role="menuitem" onClick={() => setProfileOpen(false)}><Settings size={15} /> تنظیمات</Link><Link href="/" role="menuitem"><CircleHelp size={15} /> مشاهده سایت</Link><button type="button" role="menuitem" onClick={() => void signOut()}><LogOut size={15} /> خروج</button></div> : null}</div>
      </header>
      <div className="admin-page-content">{children}</div>
    </main>
    <AdminCommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={paletteCommands} canSearchUsers={can('users', 'view')} />
  </div>;
}
