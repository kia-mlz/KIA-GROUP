import { courseCatalog } from '@/lib/courseCatalog';
import LessonPlayer from './LessonPlayer';

export function generateStaticParams() {
  const params: Array<{ courseSlug: string; lessonSlug: string }> = [];
  for (const course of courseCatalog) {
    for (const lesson of course.lessons) {
      params.push({ courseSlug: course.slug, lessonSlug: lesson.slug });
    }
  }
  return params;
}

// db.json lessons are the Pages/demo paths. Do not set `dynamicParams` to a
// literal: `false` 404s other lessons on `next start` and Docker standalone,
// and `true` is illegal with `output: 'export'`. Next 16 rejects `process.env`
// in this segment config. The default is on-demand.
export default function Page() {
  return <LessonPlayer />;
}