'use client';

import Link from 'next/link';
import { Briefcase, Rocket } from 'lucide-react';
import { useLanguage } from '@/context/LanguageProvider';

/**
 * Employer & freelancer hub — one of the three post-login doors.
 * Both cards lead to working destinations: the contact form for employers
 * and the learning path for freelancers.
 */
export default function FreelancePage() {
  const { t } = useLanguage();

  return (
    <div className="page-content freelance-page">
      <div className="container hub">
        <div className="bento">
          <Link href="/contact" className="tile tile--half tile--feature">
            <span className="t-icon t-icon--brand" aria-hidden="true">
              <Briefcase size={22} />
            </span>
            <b>{t('freelance.employer.title')}</b>
            <span>{t('freelance.employer.body')}</span>
            <span className="t-status t-status--brand">{t('freelance.employer.cta')}</span>
          </Link>

          <Link href="/education" className="tile tile--half">
            <span className="t-icon" aria-hidden="true">
              <Rocket size={22} />
            </span>
            <b>{t('freelance.freelancer.title')}</b>
            <span>{t('freelance.freelancer.body')}</span>
            <span className="t-status">{t('freelance.freelancer.cta')}</span>
          </Link>
        </div>

        <div className="hub-actions">
          <Link href="/work/panel" className="btn btn--primary btn--lg">
            {t('panel.departments.work')}
          </Link>
        </div>

        <p className="freelance-note">{t('freelance.note')}</p>
      </div>
    </div>
  );
}
