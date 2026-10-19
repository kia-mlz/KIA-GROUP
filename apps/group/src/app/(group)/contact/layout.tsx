import type { Metadata } from 'next';
import { publicPageMetadata } from '@/lib/seo';

export const metadata: Metadata = publicPageMetadata({
  title: 'تماس با ما',
  description: 'ارتباط با پشتیبانی kia. برای سوالات دوره، همکاری یا مشکلات فنی.',
  path: '/contact',
});

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
