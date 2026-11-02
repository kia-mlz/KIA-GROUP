export function levelForXp(xp: number): number {
  return 1 + Math.floor(Math.max(0, xp) / 100);
}

/** Calendar date in Asia/Tehran, YYYY-MM-DD. */
export function tehranDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function previousDateKey(key: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return key;
  const dt = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}

export function nextStreak(lastActiveKey: string | null, streakDays: number, today = tehranDateKey()): number {
  if (lastActiveKey === today) return streakDays;
  if (lastActiveKey && lastActiveKey === previousDateKey(today)) return streakDays + 1;
  return 1;
}

export type StatsSnapshot = { xp: number; gamesCompleted: number; streakDays: number };

export function achievementMet(rule: unknown, stats: StatsSnapshot): boolean {
  if (!rule || typeof rule !== 'object') return false;
  const record = rule as { kind?: string; threshold?: number };
  const threshold = Number(record.threshold ?? 0);
  if (record.kind === 'GAMES_COMPLETED') return stats.gamesCompleted >= threshold;
  if (record.kind === 'XP_REACHED') return stats.xp >= threshold;
  if (record.kind === 'STREAK') return stats.streakDays >= threshold;
  return false;
}

export function isUniqueViolation(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && (error as { code?: string }).code === 'P2002');
}
