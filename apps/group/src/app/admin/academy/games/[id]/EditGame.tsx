'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { AdminGameResults } from '@kia./shared';
import { GameBuilder } from '@/components/admin/games/GameStudio';
import { api } from '@/lib/api';

export default function EditGamePage() {
  const params = useParams<{ id: string }>();
  const [results, setResults] = useState<AdminGameResults | null>(null);
  useEffect(() => {
    api.adminGameResults(params.id).then(setResults).catch(() => setResults(null));
  }, [params.id]);
  return (
    <>
      <GameBuilder gameId={params.id} />
      {results ? (
        <section className="admin-content eg-admin">
          <h2>نتایج</h2>
          <dl className="eg-metrics">
            <div><dt>شرکت‌کننده</dt><dd>{results.participants}</dd></div>
            <div><dt>تکمیل</dt><dd>{results.completed}</dd></div>
            <div><dt>در حال انجام</dt><dd>{results.inProgress}</dd></div>
            <div><dt>تلاش</dt><dd>{results.attempts}</dd></div>
            <div><dt>میانگین امتیاز</dt><dd>{results.averageScore}</dd></div>
            <div><dt>میانگین زمان</dt><dd>{results.averageTimeSec}</dd></div>
          </dl>
          <h3>مرحله‌های سخت</h3>
          <ul>{results.hardStages.map((stage) => <li key={stage.stageId}>{stage.title} — {stage.failRate}%</li>)}</ul>
        </section>
      ) : null}
    </>
  );
}
