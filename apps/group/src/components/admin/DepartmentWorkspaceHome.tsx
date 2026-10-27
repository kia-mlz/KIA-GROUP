'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { DepartmentSlug } from '@/components/brand/departments';
import { useLanguage } from '@/context/LanguageProvider';
import { DEPARTMENT_WORKSPACES } from '@/lib/adminNav';

export type WorkspaceMetric = {
  id: string;
  label: string;
  value: string;
  href?: string;
  icon: LucideIcon;
};

export type WorkspaceLink = {
  href: string;
  label: string;
  icon?: LucideIcon;
};

/**
 * Shared Ops Center department workspace home — metrics + modules + tools.
 * Shell already owns breadcrumbs/title; this is page body only.
 */
export function DepartmentWorkspaceHome({
  slug,
  description,
  metrics,
  modules,
  tools,
  emptyModules,
}: {
  slug: DepartmentSlug;
  description: string;
  metrics: WorkspaceMetric[];
  modules: WorkspaceLink[];
  tools: WorkspaceLink[];
  emptyModules?: ReactNode;
}) {
  const { t } = useLanguage();
  const workspace = DEPARTMENT_WORKSPACES[slug];

  return (
    <div className={`ops-dept-home ops-dept-home--${slug}`}>
      <section className="ops-dept-hub__intro" aria-labelledby={`ws-${slug}-title`}>
        <div>
          <span className="ops-dept-hub__kicker">{t('admin.departments.workspaceKicker')}</span>
          <h2 id={`ws-${slug}-title`}>{workspace.label}</h2>
          <p>{description}</p>
        </div>
        <Link href="/admin/departments" className="ops-dept-card__ghost">
          {t('admin.nav.departments')}
        </Link>
      </section>

      {metrics.length ? (
        <div className="admin-kpi-grid" style={{ marginTop: '1rem' }}>
          {metrics.map((metric) => {
            const Icon = metric.icon;
            const body = (
              <div className="admin-stat-row">
                <div>
                  <span className="admin-stat-label">{metric.label}</span>
                  <div className="admin-stat-value">{metric.value}</div>
                </div>
                <span className="admin-stat-icon">
                  <Icon size={18} aria-hidden />
                </span>
              </div>
            );
            return metric.href ? (
              <Link key={metric.id} href={metric.href} className="admin-stat-card">
                {body}
              </Link>
            ) : (
              <div key={metric.id} className="admin-stat-card">
                {body}
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="admin-grid admin-grid-2" style={{ marginTop: '1rem', gap: '1rem' }}>
        <article className="admin-card">
          <div className="admin-section-head">
            <h2>{t('admin.departmentPanel.modules')}</h2>
          </div>
          {modules.length ? (
            <div className="ops-dept-card__actions">
              {modules.map((item) => (
                <Link key={item.href} href={item.href} className="ops-dept-card__cta">
                  {item.label}
                </Link>
              ))}
            </div>
          ) : (
            emptyModules ?? <p className="admin-sub">{t('admin.departments.noAccess')}</p>
          )}
        </article>

        <article className="admin-card">
          <div className="admin-section-head">
            <h2>{t('admin.departmentPanel.tools')}</h2>
          </div>
          {tools.length ? (
            <div className="admin-quick-tiles">
              {tools.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} className="admin-quick-tile">
                    {Icon ? <Icon size={18} aria-hidden /> : null}
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="admin-sub">{t('admin.departments.noAccess')}</p>
          )}
        </article>
      </div>
    </div>
  );
}
