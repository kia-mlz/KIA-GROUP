import type { Metadata } from 'next';
import { privatePageMetadata } from '@/lib/seo';

export const metadata: Metadata = privatePageMetadata('دپارتمان‌های کیا');

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
