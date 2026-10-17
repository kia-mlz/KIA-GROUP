'use client';

import {
  createDefaultSiteSettings,
  mergeSiteSettings,
  type SiteSettings,
} from '@kia./shared';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings>(createDefaultSiteSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .getSettings()
      .then((next) => {
        if (!cancelled) setSettings(mergeSiteSettings(createDefaultSiteSettings(), next));
      })
      .catch(() => {
        /* keep defaults */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { settings, loading };
}
