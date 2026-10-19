import type { Metadata } from 'next';
import { publicPageMetadata } from '@/lib/seo';

export const metadata: Metadata = publicPageMetadata({
  title: 'استودیوی متریال',
  description:
    'استودیوی متریال kia. — پالت رنگ، آیکون و انیمیشن برای یادگیری طراحی رابط، بدون نیاز به ثبت‌نام.',
  path: '/material',
});

export default function MaterialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="material-page-shell">{children}</div>;
}
