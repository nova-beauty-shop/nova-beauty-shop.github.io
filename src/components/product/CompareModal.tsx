import { useEffect, useRef, type ReactNode } from 'react';
import { ShoppingBag, X } from 'lucide-react';
import Link from '@/components/common/Link';
import Stars from '@/components/common/Stars';
import { ErrorState, SkeletonGrid } from '@/components/common/StateViews';
import { useCompare } from '@/hooks/useCompare';
import { useShop } from '@/hooks/useShop';
import { discountPercent, formatRating, formatToman } from '@/lib/format';
import { groupVariants } from '@/lib/productStyle';
import type { Product } from '@/types/catalog';

function stockText(stock: number): { text: string; className: string } {
  if (stock === 0) return { text: 'ناموجود', className: 'text-error-600' };
  if (stock <= 5) return { text: `تنها ${stock.toLocaleString('fa-IR')} عدد باقی مانده`, className: 'text-warning-600' };
  return { text: 'موجود در انبار', className: 'text-success-600' };
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="ms-2 rounded-full bg-gold-400/25 px-2 py-0.5 text-[11px] font-medium text-gold-600">{children}</span>;
}

export default function CompareModal({
  products,
  loading,
  error,
  onRetry,
  onClose,
}: {
  products: Product[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onClose: () => void;
}) {
  const { addToCart } = useShop();
  const compare = useCompare();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previous?.focus?.();
    };
  }, [onClose]);

  // A product removed while comparing can leave fewer than two columns.
  useEffect(() => {
    if (!loading && !error && products.length < 2) onClose();
  }, [loading, error, products.length, onClose]);

  const prices = products.map((product) => product.priceToman);
  const lowestPrice = Math.min(...prices);
  const bestRating = Math.max(...products.map((product) => product.rating));
  const pricesDiffer = new Set(prices).size > 1;
  const ratingsDiffer = new Set(products.map((product) => product.rating)).size > 1;

  const rows: { label: string; render: (product: Product) => ReactNode }[] = [
    {
      label: 'قیمت',
      render: (product) => (
        <div>
          <span className="font-bold text-ink-900">{formatToman(product.priceToman)}</span>
          {pricesDiffer && product.priceToman === lowestPrice && <Badge>کمترین قیمت</Badge>}
          {product.compareAtToman && product.compareAtToman > product.priceToman && (
            <p className="text-xs text-ink-400 line-through">{formatToman(product.compareAtToman)}</p>
          )}
        </div>
      ),
    },
    {
      label: 'درصد تخفیف',
      render: (product) => {
        const discount = discountPercent(product.priceToman, product.compareAtToman);
        return discount > 0 ? (
          <span className="rounded-full bg-burgundy-700 px-2.5 py-1 text-xs font-medium text-ivory-50">{`${discount.toLocaleString('fa-IR')}٪`}</span>
        ) : (
          <span className="text-ink-400">—</span>
        );
      },
    },
    {
      label: 'امتیاز',
      render: (product) => (
        <div className="space-y-1">
          <Stars value={product.rating} showValue />
          <p className="text-xs text-ink-500">
            {`${formatRating(product.rating)} از ${product.reviewCount.toLocaleString('fa-IR')} نظر`}
            {ratingsDiffer && product.rating === bestRating && <Badge>بیشترین امتیاز</Badge>}
          </p>
        </div>
      ),
    },
    {
      label: 'موجودی',
      render: (product) => {
        const stock = stockText(product.stock);
        return <span className={`text-sm font-medium ${stock.className}`}>{stock.text}</span>;
      },
    },
    {
      label: 'رنگ',
      render: (product) => {
        const { colors } = groupVariants(product.variants);
        if (colors.length === 0) return <span className="text-ink-400">—</span>;
        return (
          <ul className="flex flex-wrap gap-2">
            {colors.map((color) => (
              <li key={color.id} className="flex items-center gap-1.5 text-xs text-ink-700">
                <span className="h-4 w-4 rounded-full border border-ink-300" style={{ backgroundColor: color.colorHex ?? '#E6DFDC' }} aria-hidden="true" />
                {color.label}
              </li>
            ))}
          </ul>
        );
      },
    },
    {
      label: 'حجم / سایز',
      render: (product) => {
        const { sizes } = groupVariants(product.variants);
        if (sizes.length === 0) return <span className="text-ink-400">—</span>;
        return (
          <ul className="flex flex-wrap gap-1.5">
            {sizes.map((size) => (
              <li key={size.id} className="rounded-full border border-ink-300 px-2.5 py-0.5 text-xs text-ink-700">
                {size.label}
                {size.priceDelta > 0 && <span className="text-ink-500">{` (+${formatToman(size.priceDelta)})`}</span>}
              </li>
            ))}
          </ul>
        );
      },
    },
    { label: 'برند', render: (product) => <span className="text-sm">{product.brand}</span> },
    { label: 'دسته‌بندی', render: (product) => <span className="text-sm">{product.categoryName}</span> },
    { label: 'معرفی کوتاه', render: (product) => <p className="text-sm leading-[1.8] text-ink-700">{product.shortDescription || '—'}</p> },
    { label: 'ترکیبات', render: (product) => <p className="whitespace-pre-line text-sm leading-[1.8] text-ink-700">{product.ingredients || '—'}</p> },
    { label: 'نحوه استفاده', render: (product) => <p className="whitespace-pre-line text-sm leading-[1.8] text-ink-700">{product.usageInstructions || '—'}</p> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button type="button" aria-label="بستن مقایسه" onClick={onClose} className="absolute inset-0 bg-ink-900/50 backdrop-blur-[2px]" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="مقایسه محصولات"
        className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-3xl bg-ivory-50 shadow-lift sm:rounded-3xl"
      >
        <header className="flex items-center justify-between border-b border-ivory-300 px-6 py-4">
          <h2 className="text-lg">مقایسه محصولات</h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="بستن" className="rounded-full p-2 hover:bg-ivory-200">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="overflow-auto">
          {loading && (
            <div className="p-6">
              <SkeletonGrid count={compare.ids.length} />
            </div>
          )}
          {error && <ErrorState onRetry={onRetry} />}
          {!loading && !error && products.length >= 2 && (
            <table className="w-full min-w-[640px] border-collapse text-start">
              <caption className="sr-only">جدول مقایسه مشخصات محصولات انتخاب‌شده</caption>
              <thead>
                <tr className="align-top">
                  <th scope="col" className="sticky start-0 z-10 w-28 bg-ivory-50 p-4 text-start text-sm font-medium text-ink-500">
                    محصول
                  </th>
                  {products.map((product) => (
                    <th key={product.id} scope="col" className="min-w-[200px] p-4 text-start font-normal">
                      <div className="relative space-y-3">
                        <button
                          type="button"
                          onClick={() => compare.remove(product.id)}
                          aria-label={`حذف ${product.name} از مقایسه`}
                          className="absolute end-0 top-0 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-ivory-50/95 text-ink-500 shadow-soft transition hover:text-error-600"
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <Link to={`/product/${product.slug}`} onClick={onClose} className="block overflow-hidden rounded-2xl bg-ivory-200">
                          <img src={product.images[0]} alt={product.name} className="aspect-[3/4] w-full object-cover" />
                        </Link>
                        <Link to={`/product/${product.slug}`} onClick={onClose} className="block text-sm font-medium leading-snug hover:text-burgundy-700">
                          {product.name}
                        </Link>
                        <button
                          type="button"
                          disabled={product.stock === 0}
                          onClick={() =>
                            addToCart({ productId: product.id, variantId: product.variants[0]?.id ?? 'default', quantity: 1 }, product.stock)
                          }
                          className="btn-outline h-10 w-full px-4 text-xs"
                        >
                          <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                          {product.stock === 0 ? 'ناموجود' : 'افزودن به سبد'}
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label} className="border-t border-ivory-300 align-top">
                    <th scope="row" className="sticky start-0 z-10 bg-ivory-50 p-4 text-start text-sm font-medium text-ink-500">
                      {row.label}
                    </th>
                    {products.map((product) => (
                      <td key={product.id} className="p-4">
                        {row.render(product)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
