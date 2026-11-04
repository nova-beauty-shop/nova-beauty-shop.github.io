import { useMemo } from 'react';
import { useAsync } from '@/hooks/useAsync';
import { defaultSiteTexts, fetchSiteTextOverrides, type SiteTexts } from '@/lib/siteTexts';

export function useSiteTexts(): SiteTexts {
  const overrides = useAsync(fetchSiteTextOverrides, []);
  return useMemo(() => ({ ...defaultSiteTexts(), ...overrides.data }), [overrides.data]);
}
