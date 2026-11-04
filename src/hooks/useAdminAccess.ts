import { useContext } from 'react';
import { AdminAccessContext, type AdminAccessValue } from '@/context/AdminAccessContext';

export function useAdminAccess(): AdminAccessValue {
  return useContext(AdminAccessContext);
}
