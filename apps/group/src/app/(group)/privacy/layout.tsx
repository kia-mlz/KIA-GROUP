import type { Metadata } from 'next';
import { publicPageMetadata } from '@/lib/seo';

export const metadata: Metadata = publicPageMetadata({
  title: 'حریم خصوصی',
  description: 'سیاست حریم خصوصی KIA. — نحوه جمع‌آوری و استفاده از اطلاعات کاربران.',
  path: '/privacy',
});

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
