'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  Briefcase,
  ClipboardList,
  Compass,
  Flag,
  FlaskConical,
  LayoutDashboard,
  LayoutGrid,
  MessageSquare,
  Package,
  Radio,
  Route,
  Ticket,
  Trophy,
  UserRound,
  UsersRound,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { useMemo } from 'react';
import { useLanguage } from '@/context/LanguageProvider';
import {
  DEPARTMENT_LEARNER_PANELS,
  LEARNER_PANELS,
  learnerPanelScopeForPathname,
  type LearnerNavItemId,
  type LearnerPanelScope,
} from '@/lib/learnerPanels';

const NAV_ICONS: Record<LearnerNavItemId, LucideIcon> = {
  overview: LayoutDashboard,
  'my-courses': BookOpen,
  progress: ClipboardList,
  results: ClipboardList,
  roadmap: Route,
  tracks: Compass,
  bootcamps: Radio,
  competitions: Flag,
  events: Trophy,
  rewards: Trophy,
  studio: Package,
  hub: LayoutGrid,
  finance: Wallet,
  purchases: Package,
  tickets: Ticket,
  messages: MessageSquare,
  profile: UserRound,
  todos: ClipboardList,
};

const SCOPE_ICONS: Record<Exclude<LearnerPanelScope, 'platform'>, LucideIcon> = {
  academy: BookOpen,
  events: Trophy,
  material: Package,
  work: Briefcase,
  community: UsersRound,
  labs: FlaskConical,
};

function pathActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Sidebar of the learner chrome — path-aware per department.
 *
 * Inside Academy (or `/dashboard` learning routes) the rail lists courses /
 * progress / exams; inside Events it lists bootcamps & competitions; other
 * departments get their own short menu. Platform account routes
 * (finance, tickets, …) show the cross-department account items, with a
 * switcher back into each department panel.
 */
export function LearnerNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname() || '/dashboard';
  const { t } = useLanguage();
  const scope = learnerPanelScopeForPathname(pathname);
  const panel = LEARNER_PANELS[scope];

  const nav = useMemo(
    () =>
      panel.nav.map((item) => ({
        ...item,
        label: t(item.labelKey),
        icon: NAV_ICONS[item.id],
      })),
    [panel, t],
  );

  return (
    <div className="learner-nav">
      <div className="learner-nav__workspace">
        <span className="learner-nav__workspace-label learner-nav-text">{t(panel.titleKey)}</span>
      </div>

      {nav.map((item) => {
        const Icon = item.icon;
        const active = pathActive(pathname, item.href, item.exact);
        return (
          <Link
            key={`${scope}-${item.id}`}
            href={item.href}
            className={`top-nav-link learner-nav-link${active ? ' is-active' : ''}`}
            title={item.label}
            aria-current={active ? 'page' : undefined}
            onClick={onNavigate}
          >
            <Icon size={16} aria-hidden="true" />
            <span className="learner-nav-text">{item.label}</span>
          </Link>
        );
      })}

      {scope !== 'platform' ? (
        <>
          <div className="learner-nav__sep" role="separator" />
          <Link
            href="/dashboard/tickets"
            className={`top-nav-link learner-nav-link${pathActive(pathname, '/dashboard/tickets') ? ' is-active' : ''}`}
            title={t('panel.nav.tickets')}
            aria-current={pathActive(pathname, '/dashboard/tickets') ? 'page' : undefined}
            onClick={onNavigate}
          >
            <Ticket size={16} aria-hidden="true" />
            <span className="learner-nav-text">{t('panel.nav.tickets')}</span>
          </Link>
          <Link
            href="/dashboard/messages"
            className={`top-nav-link learner-nav-link${pathActive(pathname, '/dashboard/messages') ? ' is-active' : ''}`}
            title={t('panel.nav.messages')}
            aria-current={pathActive(pathname, '/dashboard/messages') ? 'page' : undefined}
            onClick={onNavigate}
          >
            <MessageSquare size={16} aria-hidden="true" />
            <span className="learner-nav-text">{t('panel.nav.messages')}</span>
          </Link>
        </>
      ) : null}

      <div className="learner-nav__sep" role="separator" />
      <div className="learner-nav__switcher" aria-label={t('panel.departments.switcher')}>
        <span className="learner-nav__switcher-label learner-nav-text">
          {t('panel.departments.switcher')}
        </span>
        {DEPARTMENT_LEARNER_PANELS.map((deptPanel) => {
          const Icon = SCOPE_ICONS[deptPanel.scope as Exclude<LearnerPanelScope, 'platform'>];
          const active = scope === deptPanel.scope;
          return (
            <Link
              key={deptPanel.scope}
              href={deptPanel.href}
              className={`top-nav-link learner-nav-link learner-nav-link--dept${active ? ' is-active' : ''}`}
              title={t(deptPanel.titleKey)}
              aria-current={active ? 'page' : undefined}
              onClick={onNavigate}
            >
              <Icon size={16} aria-hidden="true" />
              <span className="learner-nav-text">{t(deptPanel.titleKey)}</span>
            </Link>
          );
        })}
        <Link
          href="/home"
          className="top-nav-link learner-nav-link"
          title={t('nav.departments')}
          onClick={onNavigate}
        >
          <LayoutGrid size={16} aria-hidden="true" />
          <span className="learner-nav-text">{t('nav.departments')}</span>
        </Link>
      </div>
    </div>
  );
}
