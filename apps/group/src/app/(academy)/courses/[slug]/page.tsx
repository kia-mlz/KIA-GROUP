import { courseCatalog } from '@/lib/courseCatalog';
import CourseDetail from './CourseDetail';

export function generateStaticParams() {
  return courseCatalog.map((course) => ({ slug: course.slug }));
}

// db.json slugs are the Pages/demo paths. Do not set `dynamicParams` to a
// literal: `false` 404s live catalog slugs on `next start` and Docker
// standalone, and `true` is illegal with `output: 'export'`. Next 16 also
// rejects `process.env` in this segment config. The default is on-demand.
export default function Page() {
  return <CourseDetail />;
}