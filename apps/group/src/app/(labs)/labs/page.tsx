'use client';

import Link from 'next/link';
import { FlaskConical, MessageSquare } from 'lucide-react';
import { useLanguage } from '@/context/LanguageProvider';

/**
 * Kia Lab — the sixth department of kia.: technology, innovation,
 * research, product development and published articles.
 *
 * Nothing to read yet, so the page states its scope and offers the contact form
 * instead of linking to an empty archive. Same shell as Kia Community so both
 * new departments read as one pair.
 */
export default function LabsPage() {
  const { t } = useLanguage();

  return (
    <div className="page-content labs-page">
      <div className="container hub">
        <div className="landing-doors landing-doors--depts labs-page__grid">
          <div className="door door--soon dept--labs">
            <span className="door-icon" aria-hidden="true">
              <FlaskConical size={20} />
            </span>
            <h2 className="door-title">{t('labs.title')}</h2>
            <p className="door-desc">{t('labs.soon')}</p>
          </div>
        </div>

        <div className="hub-actions labs-page__actions">
          <Link href="/contact" className="btn btn--primary btn--lg">
            <MessageSquare size={16} aria-hidden="true" />
            {t('labs.tellUs')}
          </Link>
        </div>
      </div>
    </div>
  );
}