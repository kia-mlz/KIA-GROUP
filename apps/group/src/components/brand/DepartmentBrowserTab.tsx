'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useLanguage } from '@/context/LanguageProvider';
import { departmentForPathname } from './departments';
import { departmentFaviconDataUri, departmentTabTitle } from './departmentTab';

/**
 * Wears the current department in the browser tab (UX-28): inside a department
 * the tab title ends with that department's name and the favicon is the kia.
 * emblem in its colour; anywhere else both fall back to the parent identity.
 *
 * The swap happens on the client because the site builds as a static export —
 * the root layout cannot read the route — and Next rewrites document.title
 * during hydration and on every navigation commit, so a plain effect would
 * lose the race. A MutationObserver on <head> re-applies the suffix whenever
 * Next rewrites the title, which is idempotent (departmentTabTitle strips the
 * marker before re-appending), so re-application can never stack suffixes.
 */
export function DepartmentBrowserTab() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const dept = departmentForPathname(pathname);
  const wordmark = dept ? t(dept.titleKey) : null;

  useEffect(() => {
    const svgLink = document.querySelector<HTMLLinkElement>(
      'link[rel~="icon"][type="image/svg+xml"]',
    );
    const icoLink = document.querySelector<HTMLLinkElement>(
      'link[rel~="icon"][type="image/x-icon"]',
    );

    const apply = () => {
      // Write only on a real change: reassigning document.title with the same
      // value still replaces the <title> text node, which would re-trigger the
      // observer below in an endless loop.
      const nextTitle = departmentTabTitle(document.title, wordmark);
      if (nextTitle !== document.title) document.title = nextTitle;

      if (!dept) {
        // Platform page: restore the icons Next shipped.
        if (svgLink?.dataset.deptIcon) {
          svgLink.setAttribute('href', svgLink.dataset.deptIcon);
          delete svgLink.dataset.deptIcon;
        }
        if (icoLink) icoLink.hidden = false;
      } else {
        if (svgLink) {
          if (!svgLink.dataset.deptIcon) {
            svgLink.dataset.deptIcon = svgLink.getAttribute('href') ?? '';
          }
          svgLink.setAttribute('href', departmentFaviconDataUri(dept.slug));
        }
        // The .ico cannot be recoloured; hide it so the department svg wins.
        if (icoLink) icoLink.hidden = true;
      }
    };

    apply();
    // Next updates <title> (and can re-add icon links) after hydration and on
    // every client navigation; watching <head> re-applies our swap whenever
    // that happens. Text and element changes both count.
    const head = document.head;
    const observer = new MutationObserver(apply);
    observer.observe(head, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [pathname, dept, wordmark]);

  return null;
}
