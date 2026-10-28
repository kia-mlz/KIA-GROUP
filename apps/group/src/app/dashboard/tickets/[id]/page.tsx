import { primaryCourseSlug } from '@/lib/courseCatalog';
import TicketDetail from './TicketDetail';

// No seeded/demo ticket exists; export a single demo route so `output: export`
// produces a valid page. Content loads client-side (demo mode shows an empty state).
export function generateStaticParams() {
  return [{ id: primaryCourseSlug }];
}

// Do not export `dynamicParams`. Next 16 only accepts a boolean literal here,
// so `process.env.GITHUB_PAGES !== 'true'` fails the build. Explicit `true`
// is rejected by `output: 'export'`. Explicit `false` 404s unknown ticket ids
// on `next start` and in the Docker standalone server. The default is
// on-demand; the Pages export still only emits generateStaticParams paths.
export default function Page() {
  return <TicketDetail />;
}