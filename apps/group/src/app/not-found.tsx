import type { Metadata } from 'next';
import { noIndexRobots } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'صفحه پیدا نشد',
  description: 'این مسیر در KIA. وجود ندارد.',
  robots: noIndexRobots,
};

export default function NotFound() {
  return (
    <div className="page-content">
      <div className="container">
        <h1>صفحه پیدا نشد</h1>
        <p className="auth-sub">این مسیر بخشی از KIA. نیست.</p>
        {/* The shell renders the one «بازگشت» control, so no CTA is needed here. */}
      </div>
    </div>
  );
}
