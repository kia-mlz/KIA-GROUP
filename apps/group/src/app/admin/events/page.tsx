'use client';

import { Flag, Trophy, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { AdminChallenge, AdminCompetition } from '@kia./shared';
import { DepartmentWorkspaceHome } from '@/components/admin/DepartmentWorkspaceHome';
import { AdminErrorState, AdminLoading } from '@/components/admin/AdminStates';
import { useAdminAccess } from '@/components/admin/useAdminAccess';
import { useLanguage } from '@/context/LanguageProvider';
import { api } from '@/lib/api';
import { departmentEntryPoints } from '@/lib/adminDepartments';

/** Events Ops workspace — competitions/challenges from live admin APIs. */
export default function AdminEventsDashboardPage() {
  const { t, format } = useLanguage();
  const { can } = useAdminAccess();
  const [competitions, setCompetitions] = useState<AdminCompetition[] | null>(null);
  const [challenges, setChallenges] = useState<AdminChallenge[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempted, setAttempted] = useState(0);
  const [failed, setFailed] = useState(0);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    const calls: Promise<unknown>[] = [];
    let attempts = 0;
    let failures = 0;

    const track = <T,>(promise: Promise<T>, assign: (value: T | null) => void) => {
      attempts += 1;
      calls.push(
        promise
          .then((value) => assign(value))
          .catch(() => {
            failures += 1;
            assign(null);
          }),
      );
    };

    if (can('competitions')) {
      track(api.adminListCompetitions(), (value) => setCompetitions(value));
    }
    if (can('challenges')) {
      track(api.adminListChallenges(), (value) => setChallenges(value));
    }

    setLoading(true);
    void Promise.all(calls).then(() => {
      if (cancelled) return;
      setAttempted(attempts);
      setFailed(failures);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [can, nonce]);

  const entryPoints = departmentEntryPoints('events', can);

  if (loading) return <AdminLoading label={t('admin.departments.loading')} />;
  if (attempted > 0 && failed === attempted) {
    return (
      <div className="admin-content">
        <div className="admin-card">
          <AdminErrorState message={t('admin.departments.loadError')} onRetry={reload} />
        </div>
      </div>
    );
  }

  const activeCompetitions = competitions?.filter((item) => item.active).length ?? null;
  const registrations =
    competitions?.reduce((total, item) => total + item.registrationCount, 0) ?? null;

  const metrics = [
    competitions != null
      ? {
          id: 'competitions',
          label: t('admin.departments.metric.competitions'),
          value: format.number(competitions.length),
          href: '/admin/events/competitions',
          icon: Flag,
        }
      : null,
    activeCompetitions != null
      ? {
          id: 'active',
          label: t('admin.departments.metric.activeCompetitions'),
          value: format.number(activeCompetitions),
          href: '/admin/events/competitions',
          icon: Flag,
        }
      : null,
    registrations != null
      ? {
          id: 'regs',
          label: t('admin.departments.metric.registrations'),
          value: format.number(registrations),
          href: '/admin/events/competitions',
          icon: Users,
        }
      : null,
    challenges != null
      ? {
          id: 'challenges',
          label: t('admin.stats.challenges'),
          value: format.number(challenges.length),
          href: '/admin/events/challenges',
          icon: Trophy,
        }
      : null,
  ].filter(Boolean) as {
    id: string;
    label: string;
    value: string;
    href: string;
    icon: typeof Flag;
  }[];

  const modules = entryPoints.map((entry) => ({
    href: entry.href,
    label: t(entry.labelKey),
  }));

  const tools = [
    can('competitions', 'manage') || can('competitions', 'edit')
      ? {
          href: '/admin/events/competitions',
          label: t('admin.nav.competitions'),
          icon: Flag,
        }
      : null,
    can('challenges', 'manage') || can('challenges', 'edit')
      ? {
          href: '/admin/events/challenges',
          label: t('admin.nav.challenges'),
          icon: Trophy,
        }
      : null,
  ].filter(Boolean) as { href: string; label: string; icon: typeof Flag }[];

  return (
    <DepartmentWorkspaceHome
      slug="events"
      description={t('admin.departments.events.desc')}
      metrics={metrics}
      modules={modules}
      tools={tools}
    />
  );
}
