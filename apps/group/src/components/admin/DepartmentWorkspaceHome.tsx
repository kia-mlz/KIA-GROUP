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
 * Shared department workspace home — metrics + modules + tools.
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
    <div className="am-hub">
      <section className="am-hub__head" aria-labelledby={`ws-${slug}-title`}>
        <span className="am-dash__kicker">{t('admin.departments.workspaceKicker')}</span>
        <h2 id={`ws-${slug}-title`}>{workspace.label}</h2>
        <p>{description}</p>
        <div className="am-hub__foot" style={{ marginTop: '0.75rem' }}>
          <Link href="/admin/departments" className="am-hub__ghost">
            {t('admin.nav.departments')}
          </Link>
        </div>
      </section>

      {metrics.length ? (
        <div className="am-kpi">
          {metrics.map((metric) => {
            const body = (
              <>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </>
            );
            return metric.href ? (
              <Link key={metric.id} href={metric.href}>
                {body}
              </Link>
            ) : (
              <div key={metric.id} className="am-panel" style={{ padding: '0.95rem 1rem' }}>
                {body}
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="am-panels">
        <article className="am-panel">
          <div className="am-panel__head">
            <h3>{t('admin.departmentPanel.modules')}</h3>
          </div>
          {modules.length ? (
            <div className="am-hub__foot">
              {modules.map((item) => (
                <Link key={item.href} href={item.href} className="am-hub__cta">
                  {item.label}
                </Link>
              ))}
            </div>
          ) : (
            emptyModules ?? <p className="admin-sub">{t('admin.departments.noAccess')}</p>
          )}
        </article>

        <article className="am-panel">
          <div className="am-panel__head">
            <h3>{t('admin.departmentPanel.tools')}</h3>
          </div>
          {tools.length ? (
            <div className="am-hub__foot">
              {tools.map((item) => (
                <Link key={item.href} href={item.href} className="am-hub__ghost">
                  {item.label}
                </Link>
              ))}
            </div>
          ) : (
            <p className="admin-sub">{t('admin.departments.noAccess')}</p>
          )}
        </article>
      </div>
    </div>
  );
}
