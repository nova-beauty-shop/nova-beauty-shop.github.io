import { useAsync } from '@/hooks/useAsync';
import { fetchStoreSettings } from '@/lib/storeSettings';

export function useStoreSettings() {
  return useAsync(fetchStoreSettings, []);
}
