'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { departmentForPathname } from '@/components/brand/departments';
import { useLanguage } from '@/context/LanguageProvider';

export function TitleUpdater() {
  const pathname = usePathname();
  const { t } = useLanguage();

  useEffect(() => {
    if (!pathname) return;

    // For /home, just the locale brand (Kia / کیا)
    if (pathname === '/' || pathname === '/home') {
      document.title = t('common.brand');
      return;
    }

    const dept = departmentForPathname(pathname);
    if (dept) {
      const deptName = t(dept.titleKey);
      // Use exact department name as title (no extra suffix)
      document.title = deptName;
      return;
    }

    // Default fallback - use the brand name
    document.title = t('common.brand');
  }, [pathname, t]);

  return null;
}
