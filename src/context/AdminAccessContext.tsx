import { createContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { fetchAdminAccess, type AdminAccess } from '@/lib/adminSettings';

export interface AdminAccessValue {
  /** The signed-in person's admin access, or null for visitors and customers. */
  access: AdminAccess | null;
  /** True for owners and managers, the roles that may change store content. */
  canQuickEdit: boolean;
}

export const AdminAccessContext = createContext<AdminAccessValue>({ access: null, canQuickEdit: false });

/**
 * Looks up the admin role once per signed-in account so every storefront page can show the on-page edit
 * buttons without repeating the request. The database still enforces permissions; this only controls what is shown.
 */
export function AdminAccessProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const userId = user?.id ?? null;
  const [state, setState] = useState<{ userId: string | null; access: AdminAccess | null }>({ userId: null, access: null });

  useEffect(() => {
    if (loading) return;
    if (!userId) {
      setState({ userId: null, access: null });
      return;
    }
    let active = true;
    fetchAdminAccess()
      .then((access) => {
        if (active) setState({ userId, access });
      })
      .catch(() => {
        if (active) setState({ userId, access: null });
      });
    return () => {
      active = false;
    };
  }, [userId, loading]);

  const value = useMemo<AdminAccessValue>(() => {
    const access = userId && state.userId === userId ? state.access : null;
    return { access, canQuickEdit: access?.role === 'owner' || access?.role === 'manager' };
  }, [userId, state]);

  return <AdminAccessContext.Provider value={value}>{children}</AdminAccessContext.Provider>;
}
