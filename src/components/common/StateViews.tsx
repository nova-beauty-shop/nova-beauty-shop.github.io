import { AlertCircle, PackageOpen } from 'lucide-react';
import type { ReactNode } from 'react';

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="space-y-4">
          <div className="skeleton aspect-[3/4] w-full" />
          <div className="skeleton h-4 w-3/4" />
          <div className="skeleton h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-4 py-16 text-center">
      <AlertCircle className="h-10 w-10 text-error-600" aria-hidden="true" />
      <p className="text-ink-700">دریافت اطلاعات با مشکل مواجه شد. لطفاً دوباره تلاش کنید.</p>
      <button type="button" onClick={onRetry} className="btn-outline">
        تلاش مجدد
      </button>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl border border-ivory-300 bg-ivory-50 px-6 py-16 text-center">
      <PackageOpen className="h-10 w-10 text-rose-500" aria-hidden="true" />
      <h2 className="text-xl">{title}</h2>
      <p className="max-w-md text-ink-500">{description}</p>
      {action}
    </div>
  );
}
