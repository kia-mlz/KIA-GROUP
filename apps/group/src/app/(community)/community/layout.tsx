import type { Metadata } from 'next';
import { messages } from '@/i18n/messages';
import { DEFAULT_LOCALE } from '@/i18n/locales';
import { publicPageMetadata } from '@/lib/seo';

const fa = messages[DEFAULT_LOCALE];

export const metadata: Metadata = publicPageMetadata({
  title: fa.community.title,
  description: fa.meta.description,
  path: '/community',
});

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return children;
}
