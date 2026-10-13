import { STATIC_COURSE_SLUGS } from '@/lib/staticPaths';

export function generateStaticParams() {
  return STATIC_COURSE_SLUGS.map((slug) => ({ slug }));
}

export default function AdminEditCourseLayout({ children }: { children: React.ReactNode }) {
  return children;
}
