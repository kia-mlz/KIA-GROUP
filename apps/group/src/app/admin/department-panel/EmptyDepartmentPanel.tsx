'use client';

import Link from 'next/link';
import { ChevronRight, ExternalLink } from 'lucide-react';
import { useLanguage } from '@/context/LanguageProvider';
import type { DepartmentSlug } from '@/components/brand/departments';

/**
 * The honest empty panel: Work / Material / Community / Labs have no admin
 * module yet, so the panel says exactly that and offers the department's
 * public page — instead of inventing zeros that look like empty data.
 */
export function EmptyDepartmentPanel({ slug }: { slug: DepartmentSlug }) {
  const { t } = useLanguage();
  if (slug !== 'work' && slug !== 'material' && slug !== 'community' && slug !== 'labs') {
    return null;
  }
  /** Each department's own public route root. */
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

  return (
    <div className="admin-content">
      <div className="breadcrumbs" aria-label={t('admin.breadcrumb')}>
        <Link href="/admin">{t('admin.breadcrumbRoot')}</Link>
        <ChevronRight size={10} className="admin-breadcrumb-sep" aria-hidden />
        <Link href="/admin/departments">{t('admin.nav.departments')}</Link>
        <ChevronRight size={10} className="admin-breadcrumb-sep" aria-hidden />
        <strong>{t(`dashboard.doors.${slug}Title`)}</strong>
      </div>

      <section className="page-intro">
        <div>
          <span className="section-kicker">{t('admin.departments.what')}</span>
          <h1>{t(`dashboard.doors.${slug}Title`)}</h1>
          <p>{t(`admin.departments.${slug}.desc`)}</p>
        </div>
      </section>

      <article className="admin-card">
        <div className="admin-department-status">
          <span className="admin-badge">{t('admin.departments.noModule')}</span>
          <span>{t('admin.departments.noModuleHint')}</span>
        </div>
        {publicHref ? (
          <Link href={publicHref} className="admin-link" style={{ marginTop: 'var(--space-4)' }}>
            <ExternalLink size={14} aria-hidden /> {t('admin.departments.publicLabel')}
          </Link>
        ) : null}
      </article>
    </div>
  );
}
