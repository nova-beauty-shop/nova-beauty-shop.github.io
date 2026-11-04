import { useMemo } from 'react';
import { GitCompareArrows, X } from 'lucide-react';
import CompareModal from '@/components/product/CompareModal';
import { useAsync } from '@/hooks/useAsync';
import { useCompare } from '@/hooks/useCompare';
import { fetchProducts } from '@/lib/catalog';
import type { Product } from '@/types/catalog';

/** Loads the compared products and keeps them in the order they were added. */
export function useCompareProducts(ids: string[]) {
  const key = ids.join(',');
  const request = useAsync(
    async () => {
      if (ids.length === 0) return [] as Product[];
      const { items } = await fetchProducts({ ids, pageSize: 20 });
      return items;
    },
    [key],
  );
  const products = useMemo(() => {
    const byId = new Map((request.data ?? []).map((product) => [product.id, product]));
    return ids.flatMap((id) => {
      const product = byId.get(id);
      return product ? [product] : [];
    });
  }, [ids, request.data]);
  return { ...request, products };
}

/** Floating bar at the bottom of the page, visible while at least one product is in the comparison list. */
export default function CompareBar() {
  const compare = useCompare();
  const { products, loading, error, retry } = useCompareProducts(compare.ids);

  if (compare.ids.length === 0) return null;

  const slots = Array.from({ length: compare.max }, (_, index) => compare.ids[index] ?? null);
  const canCompare = compare.ids.length >= 2;

  return (
    <>
      <div aria-hidden="true" className="h-24" />
      <div
        role="region"
        aria-label="نوار مقایسه محصولات"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-ivory-300 bg-ivory-50/95 shadow-lift backdrop-blur"
      >
        <div className="container-nova flex flex-wrap items-center gap-x-6 gap-y-3 py-3">
          <p className="text-sm font-medium text-ink-900">
            مقایسه محصولات
            <span className="ms-2 text-xs font-normal text-ink-500">
              {`${compare.ids.length.toLocaleString('fa-IR')} از ${compare.max.toLocaleString('fa-IR')}`}
            </span>
          </p>

          <ul className="flex flex-1 items-center gap-3">
            {slots.map((id, index) => {
              const product = id ? products.find((item) => item.id === id) : undefined;
              if (!id) {
                return (
                  <li
                    key={`empty-${index}`}
                    className="flex h-14 w-12 items-center justify-center rounded-xl border border-dashed border-ink-300 text-xs text-ink-400"
                    aria-hidden="true"
                  >
                    +
                  </li>
                );
              }
              return (
                <li key={id} className="relative">
                  {product ? (
                    <img src={product.images[0]} alt={product.name} title={product.name} className="h-14 w-12 rounded-xl bg-ivory-200 object-cover" />
                  ) : (
                    <div className={`h-14 w-12 rounded-xl bg-ivory-200 ${loading ? 'skeleton' : ''}`} />
                  )}
                  <button
                    type="button"
                    onClick={() => compare.remove(id)}
                    aria-label={`حذف ${product?.name ?? 'محصول'} از مقایسه`}
                    className="absolute -end-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink-900 text-ivory-50 transition hover:bg-error-600"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>

          {error && (
            <button type="button" onClick={retry} className="text-xs text-error-600 underline">
              تلاش مجدد برای بارگذاری
            </button>
          )}

          <div className="flex items-center gap-2">
            <button type="button" onClick={compare.clear} className="h-10 rounded-full px-4 text-sm text-ink-500 transition hover:text-error-600">
              پاک کردن
            </button>
            <button
              type="button"
              onClick={compare.openModal}
              disabled={!canCompare}
              title={canCompare ? undefined : 'حداقل دو محصول انتخاب کنید'}
              className="btn-primary h-10 px-6"
            >
              <GitCompareArrows className="h-4 w-4" aria-hidden="true" />
              مقایسه
            </button>
          </div>
        </div>
      </div>

      {compare.modalOpen && canCompare && (
        <CompareModal products={products} loading={loading} error={error} onRetry={retry} onClose={compare.closeModal} />
      )}
    </>
  );
}
