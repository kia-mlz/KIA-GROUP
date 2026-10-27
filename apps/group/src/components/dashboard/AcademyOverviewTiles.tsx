'use client';

import Link from 'next/link';
import {
  BookOpen,
  ClipboardList,
  Compass,
  Route,
  type LucideIcon,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageProvider';
import { LEARNER_PANELS, type LearnerNavItemId } from '@/lib/learnerPanels';

const TILE_ICONS: Partial<Record<LearnerNavItemId, LucideIcon>> = {
  'my-courses': BookOpen,
  progress: ClipboardList,
  results: ClipboardList,
  roadmap: Route,
  tracks: Compass,
};

const TILE_HINTS: Partial<Record<LearnerNavItemId, string>> = {
  'my-courses': 'panel.departmentPanel.academy.myCoursesHint',
  progress: 'panel.departmentPanel.academy.progressHint',
  results: 'panel.departmentPanel.academy.resultsHint',
  roadmap: 'panel.departmentPanel.academy.roadmapHint',
  tracks: 'panel.departmentPanel.academy.tracksHint',
};

/** Side-by-side destination boxes for Academy overview (tools moved out of top-nav). */
export function AcademyOverviewTiles() {
  const { t } = useLanguage();
  const tiles = LEARNER_PANELS.academy.overviewTiles ?? [];

  if (!tiles.length) return null;

  return (
    <div className="dept-learner-panel__tiles" aria-label={t('panel.nav.academyOverview')}>
      {tiles.map((tile) => {
        const Icon = TILE_ICONS[tile.id] ?? BookOpen;
        const hintKey = TILE_HINTS[tile.id];
        return (
          <Link key={tile.id} href={tile.href} className="dept-learner-panel__tile">
            <span className="dept-learner-panel__icon" aria-hidden="true">
              <Icon size={20} />
            </span>
            <b>{t(tile.labelKey)}</b>
            {hintKey ? <span>{t(hintKey)}</span> : null}
          </Link>
        );
      })}
    </div>
  );
}
