'use client';

import type { LeaderboardEntry } from '@kia./shared';
import { useLanguage } from '@/context/LanguageProvider';

const DEFAULT_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, name: 'Priya M.', score: 890 },
  { rank: 2, name: 'Diego F.', score: 845 },
  { rank: 3, name: 'Sam K.', score: 810 },
  { rank: 4, name: 'Yuki T.', score: 610 },
  { rank: 12, name: 'You', score: 340, isMe: true },
];

export function Leaderboard({ entries = DEFAULT_LEADERBOARD }: { entries?: LeaderboardEntry[] }) {
  const { t, format } = useLanguage();

  return (
    <>
      <div className="leaderboard">
        {entries.map((entry) => (
          <div key={entry.rank} className={`lb-row${entry.isMe ? ' me' : ''}`}>
            <span
              className={`lb-rank${
                entry.rank === 1
                  ? ' top1'
                  : entry.rank === 2
                    ? ' top2'
                    : entry.rank === 3
                      ? ' top3'
                      : ''
              }`}
            >
              {entry.rank}
            </span>
            <span className="lb-name">{entry.isMe ? t('bootcamp.you') : entry.name}</span>
            <span className="lb-score">{format.points(entry.score)}</span>
          </div>
        ))}
      </div>
      <div className="lb-reset">{t('bootcamp.lbReset')}</div>
    </>
  );
}
