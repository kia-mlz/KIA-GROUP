import type { Metadata } from 'next';
import { courseCatalog } from '@/lib/courseCatalog';
import { publicPageMetadata } from '@/lib/seo';
import { STATIC_COURSE_SLUGS } from '@/lib/staticPaths';

type Props = {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
};

export function generateStaticParams() {
  return STATIC_COURSE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  // db.json is the demo catalog for the Pages export. Live builds must not
  // stamp those titles onto slugs the API may not have. Per-course titles are
  // filled by the client catalog; this metadata stays generic so a down API
  // cannot fail the build or invent a course.
  const course =
    process.env.GITHUB_PAGES === 'true'
      ? courseCatalog.find((c) => c.slug === slug)
      : undefined;
  const title = course?.title ?? 'دوره';
  const description =
    course?.description?.trim() ||
    (course
      ? `جزئیات دوره ${title} در Kia — پیش‌نمایش سرفصل‌ها و مسیر یادگیری.`
      : 'جزئیات دوره از کاتالوگ زنده بارگذاری می‌شود.');

  return publicPageMetadata({
    title,
    description,
    path: `/courses/${slug}`,
  });
}

export default function CourseDetailLayout({ children }: Props) {
  return children;
}
