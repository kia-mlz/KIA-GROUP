import type { Metadata } from 'next';
import { privatePageMetadata } from '@/lib/seo';

/** Authenticated academy sub-hub — keep out of search indexes. */
export const metadata: Metadata = privatePageMetadata('مسیرهای یادگیری');

export default function TracksLayout({ children }: { children: React.ReactNode }) {
  return children;
}
