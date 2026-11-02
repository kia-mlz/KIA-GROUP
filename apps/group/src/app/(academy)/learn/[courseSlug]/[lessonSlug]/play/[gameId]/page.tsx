import PlayGame from './PlayGame';
import { demoPlayGameStaticParams } from '@/lib/demoGames';

/**
 * Pre-render published demo games for `output: 'export'` (GitHub Pages).
 * The lesson layout only supplies courseSlug and lessonSlug. Next calls this
 * once per parent lesson and rejects an empty array, so every call returns
 * the full set. Each object includes courseSlug, lessonSlug, and gameId.
 * Do not set `dynamicParams`: `false` 404s other games on `next start`, and
 * `true` is illegal with `output: 'export'`.
 */
export function generateStaticParams() {
  return demoPlayGameStaticParams();
}

export default function Page() {
  return <PlayGame />;
}
