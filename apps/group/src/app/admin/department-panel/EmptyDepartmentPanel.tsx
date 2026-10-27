'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { useLanguage } from '@/context/LanguageProvider';
import type { DepartmentSlug } from '@/components/brand/departments';
import { DEPARTMENT_WORKSPACES } from '@/lib/adminNav';

/**
 * Honest empty workspace for departments without live admin modules yet.
 * Never invents zeros that look like empty data.
 */
export function EmptyDepartmentPanel({ slug }: { slug: DepartmentSlug }) {
  const { t } = useLanguage();
  if (slug !== 'work' && slug !== 'material' && slug !== 'community' && slug !== 'labs') {
    return null;
  }

  const publicHrefs: Record<
    Extract<DepartmentSlug, 'work' | 'material' | 'community' | 'labs'>,
    string
  > = {
    work: '/freelance',
    material: '/material',
    community: '/community',
    labs: '/labs',
  };
  const publicHref = publicHrefs[slug];
  const workspace = DEPARTMENT_WORKSPACES[slug];

  return (
    <div className="ops-empty-workspace">
      <section className="ops-empty-workspace__card" aria-labelledby={`empty-ws-${slug}`}>
        <span className="admin-badge">{t('admin.departments.noModule')}</span>
        <h2 id={`empty-ws-${slug}`}>
          {t('admin.departments.workspaceTitle', { name: workspace.label })}
        </h2>
        <p>{t(`admin.departments.${slug}.desc`)}</p>
        <p>{t('admin.departments.noModuleHint')}</p>
        {publicHref ? (
          <Link href={publicHref} className="admin-link">
            <ExternalLink size={14} aria-hidden /> {t('admin.departments.publicLabel')}
          </Link>
        ) : null}
      </section>
    </div>
  );
}
