'use client';

import Link from 'next/link';
import { MessageSquare, Radio, Trophy, Video } from 'lucide-react';
import { useLanguage } from '@/context/LanguageProvider';

/**
 * Events hub — competitions, bootcamp, webinars and meetups in one place.
 *
 * Only the two live formats (challenges/bootcamp and the leaderboard) have
 * real destinations today. Webinars and meetups are marked coming-soon with a
 * way to register interest, rather than linked to a page that would be empty.
 */
export default function EventsPage() {
  const { t } = useLanguage();

  return (
    <div className="page-content events-page">
      <div className="container hub">
        <header className="page-head events-page__head">
          <h1>{t('events.title')}</h1>
        </header>

        <div className="landing-doors landing-doors--depts events-page__grid">
          <Link href="/bootcamp" className="door tint--brand">
            <span className="door-icon" aria-hidden="true">
              <Radio size={20} />
            </span>
            <h2 className="door-title">{t('events.bootcamp.title')}</h2>
            <p className="door-desc">{t('events.bootcamp.desc')}</p>
            <span className="door-cta">{t('events.bootcamp.cta')}</span>
          </Link>

          <Link href="/bootcamp" className="door tint--mint">
            <span className="door-icon" aria-hidden="true">
              <Trophy size={20} />
            </span>
            <h2 className="door-title">{t('events.challenges.title')}</h2>
            <p className="door-desc">{t('events.challenges.desc')}</p>
            <span className="door-cta">{t('events.challenges.cta')}</span>
          </Link>

          <Link href="/rewards" className="door tint--amber">
            <span className="door-icon" aria-hidden="true">
              <Trophy size={20} />
            </span>
            <h2 className="door-title">{t('events.leaderboard.title')}</h2>
            <p className="door-desc">{t('events.leaderboard.desc')}</p>
            <span className="door-cta">{t('events.leaderboard.cta')}</span>
          </Link>

          <div className="door door--soon tint--sky">
            <span className="door-icon" aria-hidden="true">
              <Video size={20} />
            </span>
            <h2 className="door-title">{t('events.webinars.title')}</h2>
            <p className="door-desc">{t('events.webinars.desc')}</p>
            <span className="door-cta">{t('events.webinars.cta')}</span>
          </div>
        </div>

        <div className="hub-actions events-page__actions">
          <Link href="/events/panel" className="btn btn--primary btn--lg">
            {t('panel.departments.events')}
          </Link>
          <Link href="/contact" className="btn btn--ghost btn--lg">
            <MessageSquare size={16} aria-hidden="true" />
            {t('events.tellUs')}
          </Link>
          <Link href="/bootcamp" className="btn btn--ghost btn--lg">
            {t('events.webinars.alternative')}
          </Link>
        </div>
      </div>
    </div>
  );
}