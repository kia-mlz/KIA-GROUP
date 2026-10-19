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
  const course = courseCatalog.find((c) => c.slug === slug);
  const title = course?.title ?? 'دوره';
  const description =
    course?.description?.trim() ||
    `جزئیات دوره ${title} در kia. — پیش‌نمایش سرفصل‌ها و مسیر یادگیری.`;

  return publicPageMetadata({
    title,
    description,
    path: `/courses/${slug}`,
  });
}

export default function CourseDetailLayout({ children }: Props) {
  return children;
}
