import EditGamePage from './EditGame';
import { demoAdminGameStaticParams } from '@/lib/demoGames';

/** Pre-render the published demo game so GitHub Pages can export this route. */
export function generateStaticParams() {
  return demoAdminGameStaticParams();
}

// Do not export `dynamicParams`. Next 16 only accepts a boolean literal here.
// Explicit `false` 404s real game ids on `next start` and Docker standalone.
// Explicit `true` breaks `output: 'export'`.
export default function Page() {
  return <EditGamePage />;
}
