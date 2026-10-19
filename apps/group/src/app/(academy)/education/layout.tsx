import type { Metadata } from 'next';
import { publicPageMetadata } from '@/lib/seo';

export const metadata: Metadata = publicPageMetadata({
  title: 'شروع یادگیری',
  description:
    'ثبت‌نام با شماره موبایل ایرانی در kia. و شروع مسیر ارزیابی و یادگیری شخصی‌سازی‌شده.',
  path: '/education',
});

export default function EducationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
