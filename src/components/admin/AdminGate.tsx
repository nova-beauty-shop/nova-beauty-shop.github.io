import type { ReactNode } from 'react';
import ClaimOwnerCard from '@/components/admin/ClaimOwnerCard';
import RequireAuth from '@/components/account/RequireAuth';
import { EmptyState, ErrorState, SkeletonGrid } from '@/components/common/StateViews';
import { useAsync } from '@/hooks/useAsync';
import { fetchAdminAccess, fetchBootstrapOpen, type AdminAccess } from '@/lib/adminSettings';

export default function AdminGate({ children }: { children: (access: AdminAccess) => ReactNode }) {
  return <RequireAuth>{() => <AdminAccessCheck>{children}</AdminAccessCheck>}</RequireAuth>;
}

function AdminAccessCheck({ children }: { children: (access: AdminAccess) => ReactNode }) {
  const access = useAsync(fetchAdminAccess, []);

  if (access.loading) {
    return (
      <div className="container-nova py-12">
        <SkeletonGrid count={2} />
      </div>
    );
  }

  if (access.error) {
    return (
      <div className="container-nova py-12">
        <ErrorState onRetry={access.retry} />
      </div>
    );
  }

  if (!access.data) return <NoAdminAccess onClaimed={access.retry} />;

  return <>{children(access.data)}</>;
}

function NoAdminAccess({ onClaimed }: { onClaimed: () => void }) {
  const bootstrap = useAsync(fetchBootstrapOpen, []);

  if (bootstrap.loading) {
    return (
      <div className="container-nova py-12">
        <SkeletonGrid count={1} />
      </div>
    );
  }

  if (bootstrap.error) {
    return (
      <div className="container-nova py-12">
        <ErrorState onRetry={bootstrap.retry} />
      </div>
    );
  }

  return (
    <div className="container-nova py-12 md:py-16">
      {bootstrap.data ? (
        <ClaimOwnerCard onClaimed={onClaimed} />
      ) : (
        <EmptyState title="دسترسی محدود" description="این بخش فقط برای مدیران فروشگاه در دسترس است." />
      )}
    </div>
  );
}
