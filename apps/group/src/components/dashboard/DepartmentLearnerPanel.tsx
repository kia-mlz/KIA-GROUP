'use client';

import Link from 'next/link';
import { ExternalLink, LayoutDashboard } from 'lucide-react';
import type { DepartmentSlug } from '@/components/brand/departments';
import { DashboardGate, PanelPage } from '@/components/dashboard/DashboardShell';
import { LEARNER_PANELS } from '@/lib/learnerPanels';
import { useLanguage } from '@/context/LanguageProvider';

/** Departments whose learner panel is more than a coming-soon shell. */
const LIVE_PANEL_BADGE = new Set<DepartmentSlug>(['material']);

/**
 * Honest empty / early learner panel for departments whose student tools are
 * still mostly the public hub. Material is "live" via the studio link in nav;
 * Work / Community / Labs stay coming-soon copy.
 */
export function DepartmentLearnerPanel({ slug }: { slug: DepartmentSlug }) {
  const { t } = useLanguage();
  const panel = LEARNER_PANELS[slug];

  return (
    <DashboardGate nextPath={panel.href}>
      <PanelPage
        eyebrow={t(panel.titleKey)}
        title={t(`panel.departmentPanel.${slug}.title`)}
        sub={t(`panel.departmentPanel.${slug}.sub`)}
      >
        <div className={`dept-learner-panel dept--${slug}`}>
          <article className="dept-learner-panel__card">
            <span className="dept-learner-panel__icon" aria-hidden="true">
              <LayoutDashboard size={22} />
            </span>
            <div>
              <b>{t(`panel.departmentPanel.${slug}.statusTitle`)}</b>
              <p>{t(`panel.departmentPanel.${slug}.statusBody`)}</p>
            </div>
            <span className="dept-learner-panel__badge">
              {LIVE_PANEL_BADGE.has(slug)
                ? t('panel.departmentPanel.liveBadge')
                : t('panel.departmentPanel.soonBadge')}
            </span>
          </article>

          <div className="dept-learner-panel__actions">
            <Link href={panel.hubHref} className="btn btn--primary">
              <ExternalLink size={16} aria-hidden="true" />
              {t(`panel.departmentPanel.${slug}.hubCta`)}
            </Link>
            <Link href="/home" className="btn btn--ghost">
              {t('panel.departmentPanel.backHome')}
            </Link>
          </div>
        </div>
      </PanelPage>
    </DashboardGate>
  );
}
