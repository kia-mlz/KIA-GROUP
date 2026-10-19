import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'KIA.',
};

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
