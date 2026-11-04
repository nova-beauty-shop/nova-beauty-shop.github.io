import { ShoppingBag, Trash2 } from 'lucide-react';
import Link from '@/components/common/Link';
import { EmptyState, ErrorState, SkeletonGrid } from '@/components/common/StateViews';
import { useCartDetails } from '@/hooks/useCartDetails';
import { useShop } from '@/hooks/useShop';
import { formatToman } from '@/lib/format';

/** The "save for later" list. Each item can go back to the cart or be removed. */
export default function SavedForLaterPanel({ onNavigate }: { onNavigate?: () => void }) {
  const { savedForLater, moveSavedToCart, removeSaved } = useShop();
  const details = useCartDetails(savedForLater);

  if (savedForLater.length === 0) {
    return (
      <EmptyState
        title="لیست خرید بعدی خالی است"
        description="در سبد خرید، روی «ذخیره برای بعد» بزنید تا کالا بدون حذف شدن کنار گذاشته شود."
      />
    );
  }
  if (details.loading) return <SkeletonGrid count={2} />;
  if (details.error) return <ErrorState onRetry={details.retry} />;

  const resolved = new Set(details.lines.map(({ line }) => `${line.productId}:${line.variantId}`));

  function clearUnavailable() {
    for (const line of savedForLater) {
      if (!resolved.has(`${line.productId}:${line.variantId}`)) removeSaved(line.productId, line.variantId);
    }
  }

  return (
    <div className="space-y-5">
      <ul className="space-y-5">
        {details.lines.map(({ line, product, variantLabel, unitPrice, quantity }) => {
          const soldOut = product.stock === 0;
          return (
            <li key={`${line.productId}-${line.variantId}`} className="flex gap-4">
              <Link to={`/product/${product.slug}`} onClick={onNavigate} className="block h-24 w-20 flex-none overflow-hidden rounded-xl bg-ivory-200">
                <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
              </Link>
              <div className="flex flex-1 flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link to={`/product/${product.slug}`} onClick={onNavigate} className="text-sm font-medium leading-snug hover:text-burgundy-700">
                      {product.name}
                    </Link>
                    {variantLabel && <p className="text-xs text-ink-500">{variantLabel}</p>}
                    <p className="mt-1 text-sm text-ink-700">{`${formatToman(unitPrice)} · ${quantity.toLocaleString('fa-IR')} عدد`}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSaved(line.productId, line.variantId)}
                    aria-label={`حذف ${product.name} از لیست خرید بعدی`}
                    className="rounded-full p-1.5 text-ink-500 hover:text-error-600"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <div className="mt-auto flex items-center gap-3">
                  <button
                    type="button"
                    disabled={soldOut}
                    onClick={() => moveSavedToCart(line.productId, line.variantId, product.stock)}
                    className="btn-outline h-9 px-4 text-xs"
                  >
                    <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                    انتقال به سبد خرید
                  </button>
                  {soldOut && <span className="text-xs font-medium text-error-600">ناموجود</span>}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {details.unavailableCount > 0 && (
        <p className="flex flex-wrap items-center gap-3 rounded-xl bg-warning-100 px-4 py-3 text-sm text-warning-600">
          برخی کالاهای این لیست دیگر در دسترس نیستند.
          <button type="button" onClick={clearUnavailable} className="underline">
            پاک کردن آن‌ها
          </button>
        </p>
      )}
    </div>
  );
}
