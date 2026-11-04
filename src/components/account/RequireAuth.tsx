import { useEffect, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { SkeletonGrid } from '@/components/common/StateViews';
import { useAuth } from '@/hooks/useAuth';
import { navigate, useLocation } from '@/lib/navigation';

export default function RequireAuth({ children }: { children: (user: User) => ReactNode }) {
  const { user, loading } = useAuth();
  const { pathname, searchParams } = useLocation();
  const currentPath = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;

  useEffect(() => {
    if (!loading && !user) {
      navigate(`/login?redirect=${encodeURIComponent(currentPath)}`, { replace: true });
    }
  }, [loading, user, currentPath]);

  if (loading || !user) {
    return (
      <div className="container-nova py-16">
        <SkeletonGrid count={1} />
      </div>
    );
  }

  return <>{children(user)}</>;
}
