import type { Metadata } from 'next';
import { publicPageMetadata } from '@/lib/seo';

export const metadata: Metadata = publicPageMetadata({
  title: 'دوره‌های موجود',
  description: 'کاتالوگ کامل دوره‌های KIA. — معرفی هر دوره را قبل از خرید ببینید.',
  path: '/courses',
});

export default function CoursesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
