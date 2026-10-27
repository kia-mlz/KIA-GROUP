'use client';

import Link from 'next/link';
import { MessageSquare, UsersRound } from 'lucide-react';
import { useLanguage } from '@/context/LanguageProvider';

/**
 * Kia Community — the fifth department of kia.: users, specialists,
 * students, mentors and employers in one place.
 *
 * Nothing to browse yet, so the page states its scope and offers the contact
 * form instead of linking to an empty feed. It reuses the events-page grid so a
 * department with nothing to show still looks like the rest of the group.
 */
export default function CommunityPage() {
  const { t } = useLanguage();

  return (
    <div className="page-content community-page">
      <div className="container hub">
        <div className="landing-doors landing-doors--depts community-page__grid">
          <div className="door door--soon dept--community">
            <span className="door-icon" aria-hidden="true">
              <UsersRound size={20} />
            </span>
            <h2 className="door-title">{t('community.title')}</h2>
            <p className="door-desc">{t('community.soon')}</p>
          </div>
        </div>

        <div className="hub-actions community-page__actions">
          <Link href="/community/panel" className="btn btn--primary btn--lg">
            {t('panel.departments.community')}
          </Link>
          <Link href="/contact" className="btn btn--ghost btn--lg">
            <MessageSquare size={16} aria-hidden="true" />
            {t('community.tellUs')}
          </Link>
        </div>
      </div>
    </div>
  );
}