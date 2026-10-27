import type { AdminAccessSection } from '@kia./shared';
import type { DepartmentSlug } from '@/components/brand/departments';
import { DEPARTMENTS } from '@/components/brand/departments';

/**
 * Single source of truth for Admin panel navigation.
 * Shell, command palette, and tests must read from here — not duplicate menus.
 */

export type AdminNavBadge = 'tickets' | 'messages';

export type AdminNavLeaf = {
  id: string;
  label: string;
  href: string;
  section: AdminAccessSection;
  exact?: boolean;
  badge?: AdminNavBadge;
  /** Shown in «ایجاد سریع» when manage/edit is allowed. */
  quickCreate?: boolean;
};

export type AdminNavGroup = {
  id: string;
  label: string;
  items: AdminNavLeaf[];
};

export const ADMIN_ROOT = {
  overview: { href: '/admin', label: 'نمای کلی' },
  departments: { href: '/admin/departments', label: 'دپارتمان‌ها' },
} as const;

/** Shared platform operations — never mix department-only tools here. */
export const PLATFORM_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: 'people',
    label: 'افراد و دسترسی',
    items: [
      { id: 'users', label: 'کاربران', href: '/admin/users', section: 'users' },
      {
        id: 'users-create',
        label: 'کاربر جدید',
        href: '/admin/users/create',
        section: 'users',
        quickCreate: true,
      },
      {
        id: 'staff',
        label: 'کارکنان و مدیران',
        href: '/admin/staff',
        section: 'users',
      },
      { id: 'roles', label: 'نقش‌ها و دسترسی‌ها', href: '/admin/users/roles', section: 'users' },
    ],
  },
  {
    id: 'support',
    label: 'پشتیبانی و ارتباط',
    items: [
      {
        id: 'tickets',
        label: 'تیکت‌ها',
        href: '/admin/tickets',
        section: 'tickets',
        badge: 'tickets',
      },
      {
        id: 'messages',
        label: 'پیام‌ها',
        href: '/admin/messages',
        section: 'messages',
        badge: 'messages',
      },
      { id: 'contact', label: 'صندوق تماس', href: '/admin/contact', section: 'messages' },
    ],
  },
  {
    id: 'commerce',
    label: 'مالی و فروش',
    items: [
      { id: 'finance', label: 'نمای مالی', href: '/admin/finance', section: 'payments', exact: true },
      { id: 'orders', label: 'سفارش‌ها', href: '/admin/orders', section: 'payments' },
      { id: 'payments', label: 'پرداخت‌ها', href: '/admin/payments', section: 'payments' },
      { id: 'wallets', label: 'کیف پول‌ها', href: '/admin/wallets', section: 'payments' },
      { id: 'entitlements', label: 'دسترسی‌های خرید', href: '/admin/entitlements', section: 'payments' },
      {
        id: 'discounts',
        label: 'تخفیف‌ها و کوپن',
        href: '/admin/discounts',
        section: 'discounts',
        quickCreate: true,
      },
    ],
  },
  {
    id: 'system',
    label: 'سیستم',
    items: [
      { id: 'analytics', label: 'گزارش‌ها', href: '/admin/analytics', section: 'stats' },
      { id: 'audit', label: 'حسابرسی', href: '/admin/audit', section: 'audit' },
      { id: 'settings', label: 'تنظیمات پلتفرم', href: '/admin/settings', section: 'settings' },
      { id: 'security', label: 'امنیت حساب', href: '/admin/security', section: 'settings' },
    ],
  },
];

export type DepartmentWorkspace = {
  slug: DepartmentSlug;
  label: string;
  href: string;
  groups: AdminNavGroup[];
  /** True when at least one real admin module exists. */
  live: boolean;
};

export const DEPARTMENT_WORKSPACES: Record<DepartmentSlug, DepartmentWorkspace> = {
  academy: {
    slug: 'academy',
    label: 'آکادمی',
    href: '/admin/academy',
    live: true,
    groups: [
      {
        id: 'academy-core',
        label: 'آموزش',
        items: [
          {
            id: 'academy-home',
            label: 'نمای کلی آکادمی',
            href: '/admin/academy',
            section: 'courses',
            exact: true,
          },
          {
            id: 'courses',
            label: 'دوره‌ها و درس‌ها',
            href: '/admin/academy/courses',
            section: 'courses',
          },
          {
            id: 'courses-new',
            label: 'دوره جدید',
            href: '/admin/academy/courses/new',
            section: 'courses',
            quickCreate: true,
          },
          {
            id: 'course-exams',
            label: 'آزمون‌های میان‌ترم و پایان‌ترم',
            href: '/admin/academy/course-exams',
            section: 'courses',
          },
          {
            id: 'tests',
            label: 'بانک سؤال ارزیابی',
            href: '/admin/academy/tests',
            section: 'tests',
          },
        ],
      },
    ],
  },
  events: {
    slug: 'events',
    label: 'ایونت',
    href: '/admin/events',
    live: true,
    groups: [
      {
        id: 'events-core',
        label: 'رویداد و رقابت',
        items: [
          {
            id: 'events-home',
            label: 'نمای کلی ایونت',
            href: '/admin/events',
            section: 'competitions',
            exact: true,
          },
          {
            id: 'competitions',
            label: 'رقابت‌ها',
            href: '/admin/events/competitions',
            section: 'competitions',
            quickCreate: true,
          },
          {
            id: 'challenges',
            label: 'چالش‌ها',
            href: '/admin/events/challenges',
            section: 'challenges',
            quickCreate: true,
          },
        ],
      },
    ],
  },
  work: {
    slug: 'work',
    label: 'کار',
    href: '/admin/work',
    live: false,
    groups: [],
  },
  material: {
    slug: 'material',
    label: 'متریال',
    href: '/admin/material',
    live: false,
    groups: [],
  },
  community: {
    slug: 'community',
    label: 'کامیونیتی',
    href: '/admin/community',
    live: false,
    groups: [],
  },
  labs: {
    slug: 'labs',
    label: 'لب',
    href: '/admin/labs',
    live: false,
    groups: [],
  },
};

export const DEPARTMENT_ORDER: DepartmentSlug[] = DEPARTMENTS.map((d) => d.slug);

export function departmentFromAdminPath(pathname: string): DepartmentSlug | null {
  return (
    DEPARTMENT_ORDER.find(
      (slug) => pathname === `/admin/${slug}` || pathname.startsWith(`/admin/${slug}/`),
    ) ?? null
  );
}

export function isAdminNavActive(pathname: string, href: string, exact?: boolean): boolean {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function flattenAdminNavLeaves(
  groups: AdminNavGroup[],
  can: (section: AdminAccessSection, level?: 'view' | 'manage' | 'edit') => boolean,
): AdminNavLeaf[] {
  return groups.flatMap((group) => group.items.filter((item) => can(item.section, 'view')));
}

export function filterAdminNavGroups(
  groups: AdminNavGroup[],
  can: (section: AdminAccessSection, level?: 'view' | 'manage' | 'edit') => boolean,
): AdminNavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        const isCreateRoute = /\/(create|new)$/.test(item.href);
        if (isCreateRoute) {
          return can(item.section, 'manage') || can(item.section, 'edit');
        }
        return can(item.section, 'view');
      }),
    }))
    .filter((group) => group.items.length > 0);
}
