'use client';

import Link from 'next/link';
import { Flag, Radio, Trophy } from 'lucide-react';
import { BootcampCard } from '@/components/dashboard/BootcampCard';
import { DashboardGate } from '@/components/dashboard/DashboardShell';
import { ToastProvider } from '@/components/dashboard/ToastProvider';
import { useLanguage } from '@/context/LanguageProvider';

/** Kia Event learner panel — bootcamps, competitions, and arena entry. */
export default function EventsLearnerPanelPage() {
  const { t } = useLanguage();

  return (
    <DashboardGate nextPath="/events/panel">
      <ToastProvider>
        <div className="page-content dash-panel dept--events">
          <div className="dash-panel__inner">
            <header className="dept-learner-panel__head">
              <span className="eyebrow">{t('panel.departments.events')}</span>
              <h1>{t('panel.departmentPanel.events.title')}</h1>
              <p>{t('panel.departmentPanel.events.sub')}</p>
            </header>

            <div className="dash-grid dash-grid--events">
              <BootcampCard />

              <Link href="/dashboard/bootcamps" className="dept-learner-panel__tile">
                <span className="dept-learner-panel__icon" aria-hidden="true">
                  <Radio size={20} />
                </span>
                <b>{t('panel.nav.enrolledBootcamps')}</b>
                <span>{t('panel.departmentPanel.events.bootcampsHint')}</span>
              </Link>

              <Link href="/dashboard/competitions" className="dept-learner-panel__tile">
                <span className="dept-learner-panel__icon" aria-hidden="true">
                  <Flag size={20} />
                </span>
                <b>{t('panel.nav.registeredCompetitions')}</b>
                <span>{t('panel.departmentPanel.events.competitionsHint')}</span>
              </Link>

              <Link href="/rewards" className="dept-learner-panel__tile">
                <span className="dept-learner-panel__icon" aria-hidden="true">
                  <Trophy size={20} />
                </span>
                <b>{t('nav.rewards')}</b>
                <span>{t('panel.departmentPanel.events.rewardsHint')}</span>
              </Link>
            </div>
          </div>
        </div>
      </ToastProvider>
    </DashboardGate>
  );
}
