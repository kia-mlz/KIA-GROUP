'use client';

import { hasRoadmapEntitlement } from '@kia./shared';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { buildRoadmapFromAnswers } from '@kia./shared';
import { PurchaseSection } from '@/components/roadmap/PurchaseSection';
import { RoadmapTree } from '@/components/roadmap/RoadmapTree';
import { useApp } from '@/context/AppProvider';
import { useAuth } from '@/context/AuthProvider';
import { useLanguage } from '@/context/LanguageProvider';
import { goalMessageKey, levelMessageKey, styleMessageKey, trackMessageKey } from '@/i18n/domain';

export default function RoadmapPage() {
  const router = useRouter();
  const { answers, roadmap, enrollBundle, hydrated } = useApp();
  const { isAuthenticated, learnerState, loading: authLoading } = useAuth();
  const { t, format } = useLanguage();

  const data = roadmap ?? buildRoadmapFromAnswers(answers);
  const trackName = t(trackMessageKey(data.trackKey));
  const roadmapId = data.id ?? roadmap?.id;

  useEffect(() => {
    if (!hydrated || authLoading) return;
    if (!answers.goal && !roadmap?.id && !learnerState?.hasRoadmap) {
      router.replace('/assessment');
    }
  }, [hydrated, authLoading, answers.goal, roadmap?.id, learnerState?.hasRoadmap, router]);

  const handleEnroll = () => {
    if (!isAuthenticated) {
      router.push('/education?next=/roadmap');
      return;
    }
    if (!learnerState?.roadmapEnrolled) {
      const hasBundle = hasRoadmapEntitlement(learnerState?.entitlements ?? [], roadmapId);
      if (!hasBundle) {
        if (!roadmapId) {
          // Ensure assessment produced a persisted roadmap before checkout.
          router.push('/assessment');
          return;
        }
        router.push(`/checkout?product=ROADMAP_BUNDLE&roadmapId=${encodeURIComponent(roadmapId)}`);
        return;
      }
    }
    void enrollBundle(() => router.push('/dashboard'));
  };

  return (
    <div className="page-content">
      <div className="container result-shell">
        <div className="aha">{t('roadmap.aha')}</div>
        <h2>{t('roadmap.title', { trackName })}</h2>
        <div className="profile-strip">
          <div className="profile-chip">
            {t('roadmap.chip.goal')} <b>{t(goalMessageKey(data.profile.goal))}</b>
          </div>
          <div className="profile-chip">
            {t('roadmap.chip.level')} <b>{t(levelMessageKey(data.profile.level))}</b>
          </div>
          <div className="profile-chip">
            {t('roadmap.chip.style')} <b>{t(styleMessageKey(data.profile.style))}</b>
          </div>
          <div className="profile-chip">
            {t('roadmap.chip.pace')}{' '}
            <b>{t('roadmap.chip.hours', { hours: format.number(data.profile.hours) })}</b>
          </div>
        </div>

        <RoadmapTree modules={data.modules} />

        <PurchaseSection roadmap={data} onEnrollBundle={handleEnroll} />
      </div>
    </div>
  );
}
