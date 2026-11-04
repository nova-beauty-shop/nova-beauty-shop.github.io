import { useState } from 'react';
import { Star } from 'lucide-react';
import { ErrorState, SkeletonGrid } from '@/components/common/StateViews';
import { useAsync } from '@/hooks/useAsync';
import { catalogErrorMessage, fetchAdminReviews, setReviewPublished } from '@/lib/adminCatalog';
import { formatDate } from '@/lib/format';

export default function ReviewsManager({ canEdit }: { canEdit: boolean }) {
  const reviews = useAsync(fetchAdminReviews, []);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function togglePublished(id: string, isPublished: boolean) {
    setBusyId(id);
    setError(null);
    try {
      await setReviewPublished(id, !isPublished);
      reviews.retry();
    } catch (cause) {
      setError(catalogErrorMessage(cause));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="space-y-6 rounded-3xl border border-ivory-300 bg-ivory-50 p-6 shadow-soft md:p-8">
      <div className="space-y-2">
        <h2 className="text-xl">نظرات مشتریان</h2>
        <p className="text-sm text-ink-500">نظراتی که منتشر نشده‌اند در فروشگاه نمایش داده نمی‌شوند.</p>
      </div>

      {error && <p role="alert" className="rounded-xl bg-error-100 px-4 py-3 text-sm text-error-600">{error}</p>}
      {reviews.loading && <SkeletonGrid count={2} />}
      {reviews.error && <ErrorState onRetry={reviews.retry} />}
      {reviews.data && reviews.data.length === 0 && (
        <p className="rounded-2xl bg-ivory-200/60 p-8 text-center text-sm text-ink-500">هنوز نظری ثبت نشده است.</p>
      )}
      {reviews.data && reviews.data.length > 0 && (
        <ul className="divide-y divide-ivory-300 rounded-2xl border border-ivory-300">
          {reviews.data.map((item) => (
            <li key={item.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="font-medium text-ink-900">{item.authorName}</span>
                  <span className="flex items-center gap-1 text-gold-600" aria-label={`امتیاز ${item.rating} از ۵`}>
                    {Array.from({ length: item.rating }).map((_, index) => (
                      <Star key={index} className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                    ))}
                  </span>
                  <span className="text-xs text-ink-500">{formatDate(item.createdAt)}</span>
                </div>
                <p className="text-sm leading-[1.8] text-ink-700">{item.body}</p>
                <p className="text-xs text-ink-500">محصول: {item.productName}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className={`rounded-full px-2.5 py-0.5 text-xs ${item.isPublished ? 'bg-success-100 text-success-600' : 'bg-ivory-200 text-ink-500'}`}>
                  {item.isPublished ? 'منتشر شده' : 'در انتظار'}
                </span>
                {canEdit && (
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => void togglePublished(item.id, item.isPublished)}
                    className="btn-outline h-10 px-4 text-sm"
                  >
                    {item.isPublished ? 'لغو انتشار' : 'انتشار'}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
