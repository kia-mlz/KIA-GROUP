'use client';

import Link from 'next/link';
import { BookOpen, ClipboardCheck } from 'lucide-react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { useLanguage } from '@/context/LanguageProvider';

/**
 * «تکنولوژی» sub-hub — the technology door splits into exactly two choices:
 * browse the domains map, or take the assessment that builds a learning path.
 * Each door is icon + title only — the copy lives on the page it opens.
 */
export default function TechnologyTracksPage() {
  return (
    <RequireAuth nextPath="/tracks/technology" learnerFlow>
      <TechnologyGate />
    </RequireAuth>
  );
}

function TechnologyGate() {
  const { t } = useLanguage();

  return (
    <div className="page-content tracks-page">
      <div className="container hub">
        <header className="page-head tracks-page__head">
          <div>
            <h1>{t('tracks.technology.title')}</h1>
            <p>{t('tracks.technology.sub')}</p>
          </div>
        </header>

        <div className="landing-doors landing-doors--two tracks-page__doors">
          <Link href="/courses" className="door tint--brand">
            <span className="door-icon" aria-hidden="true">
              <BookOpen size={20} />
            </span>
            <h2 className="door-title">{t('tracks.technology.courses.title')}</h2>
          </Link>

          <Link href="/assessment" className="door tint--mint">
            <span className="door-icon" aria-hidden="true">
              <ClipboardCheck size={20} />
            </span>
            <h2 className="door-title">{t('tracks.technology.assessment.title')}</h2>
          </Link>
        </div>
      </div>
    </div>
  );
}