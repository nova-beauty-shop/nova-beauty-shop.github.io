import { useEffect, useState } from 'react';
import { Check, Heart, ShoppingBag } from 'lucide-react';
import Link from '@/components/common/Link';
import Stars from '@/components/common/Stars';
import CompareToggleButton from '@/components/product/CompareToggleButton';
import OfferCountdown from '@/components/product/OfferCountdown';
import ProductCardMedia from '@/components/product/ProductCardMedia';
import { useCountdown } from '@/hooks/useCountdown';
import { useShop } from '@/hooks/useShop';
import { discountPercent, formatToman } from '@/lib/format';
import type { Product } from '@/types/catalog';

function stockLabel(stock: number) {
  if (stock === 0) return { text: 'ناموجود', className: 'text-error-600' };
  if (stock <= 5) return { text: `تنها ${stock.toLocaleString('fa-IR')} عدد باقی مانده`, className: 'text-warning-600' };
  return { text: 'موجود در انبار', className: 'text-success-600' };
}

export default function ProductCard({ product }: { product: Product }) {
  const { addToCart, isWishlisted, toggleWishlist } = useShop();
  const [added, setAdded] = useState(false);
  const discount = discountPercent(product.priceToman, product.compareAtToman);
  const stock = stockLabel(product.stock);
  const wishlisted = isWishlisted(product.id);
  const productPath = `/product/${product.slug}`;
  const cover = product.images[0];
  const hoverImage = product.images[1] ?? cover;
  const countdown = useCountdown(product.offerEndsAt, product.isAmazingOffer);
  const offerLive = product.isAmazingOffer && !countdown.expired;

  useEffect(() => {
    if (!added) return;
    const timer = window.setTimeout(() => setAdded(false), 1600);
    return () => window.clearTimeout(timer);
  }, [added]);

  function handleQuickAdd() {
    addToCart({ productId: product.id, variantId: product.variants[0]?.id ?? 'default', quantity: 1 }, product.stock);
    setAdded(true);
  }

  return (
    <article className="group relative flex flex-col">
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-ivory-200 shadow-soft">
        <ProductCardMedia cover={cover} hoverImage={hoverImage} alt={product.name} style={product} />
        <Link to={productPath} className="absolute inset-0 block" aria-label={product.name} />

        <div className="pointer-events-none absolute start-3 top-3 flex flex-col items-start gap-1.5">
          {discount > 0 && (
            <span className="rounded-full bg-burgundy-700 px-2.5 py-1 text-xs font-medium text-ivory-50">
              {`${discount.toLocaleString('fa-IR')}٪ تخفیف`}
            </span>
          )}
          {offerLive && (
            <span className="rounded-full bg-gold-400 px-2.5 py-1 text-xs font-medium text-ink-900">شگفت‌انگیز</span>
          )}
          {product.isNew && (
            <span className="rounded-full bg-ivory-50/95 px-2.5 py-1 text-xs font-medium text-burgundy-700">جدید</span>
          )}
        </div>

        <button
          type="button"
          onClick={() => toggleWishlist(product.id)}
          aria-pressed={wishlisted}
          aria-label={wishlisted ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}
          className="absolute end-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-ivory-50/95 text-burgundy-700 shadow-soft transition duration-300 hover:scale-110"
        >
          <Heart className="h-4 w-4" fill={wishlisted ? 'currentColor' : 'none'} />
        </button>

        <CompareToggleButton productId={product.id} productName={product.name} className="end-3 top-16" />

        <button
          type="button"
          onClick={handleQuickAdd}
          disabled={product.stock === 0}
          className="absolute inset-x-3 bottom-3 flex h-11 translate-y-0 items-center justify-center gap-2 rounded-full bg-ivory-50/95 text-sm font-medium text-burgundy-800 shadow-soft transition duration-300 hover:bg-burgundy-700 hover:text-ivory-50 disabled:bg-ivory-200 disabled:text-ink-500 md:translate-y-16 md:group-hover:translate-y-0"
        >
          {added ? (
            <>
              <Check className="h-4 w-4" /> به سبد خرید اضافه شد
            </>
          ) : (
            <>
              <ShoppingBag className="h-4 w-4" /> {product.stock === 0 ? 'ناموجود' : 'افزودن سریع'}
            </>
          )}
        </button>
      </div>

      {offerLive && (
        <div className="mt-3">
          <OfferCountdown countdown={countdown} compact />
        </div>
      )}

      <div className="mt-4 flex flex-1 flex-col gap-1.5">
        <p className="text-xs text-ink-500">{product.brand}</p>
        <h3 className="text-base font-medium leading-snug">
          <Link to={productPath} className="transition hover:text-burgundy-700">
            {product.name}
          </Link>
        </h3>
        <Stars value={product.rating} showValue />
        <div className="mt-auto flex flex-wrap items-baseline gap-2 pt-2">
          <span className="font-bold text-ink-900">{formatToman(product.priceToman)}</span>
          {discount > 0 && product.compareAtToman && (
            <span className="text-sm text-ink-400 line-through">{formatToman(product.compareAtToman)}</span>
          )}
        </div>
        <p className={`text-xs font-medium ${stock.className}`}>{stock.text}</p>
      </div>
    </article>
  );
}
