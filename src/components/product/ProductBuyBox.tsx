import { useMemo, useState } from 'react';
import { Check, Heart, ShieldCheck, ShoppingBag, Truck } from 'lucide-react';
import Link from '@/components/common/Link';
import QuantityStepper from '@/components/common/QuantityStepper';
import Stars from '@/components/common/Stars';
import { useShop } from '@/hooks/useShop';
import { discountPercent, formatToman } from '@/lib/format';
import { contrastingInk, groupVariants } from '@/lib/productStyle';
import type { Product } from '@/types/catalog';

export default function ProductBuyBox({ product }: { product: Product }) {
  const { addToCart, isWishlisted, toggleWishlist } = useShop();
  const [variantId, setVariantId] = useState(product.variants[0]?.id ?? 'default');
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const variant = product.variants.find((item) => item.id === variantId);
  const { colors, sizes } = useMemo(() => groupVariants(product.variants), [product.variants]);
  const delta = variant?.priceDelta ?? 0;
  const unitPrice = product.priceToman + delta;
  const compareAt = product.compareAtToman ? product.compareAtToman + delta : null;
  const discount = discountPercent(unitPrice, compareAt);
  const outOfStock = product.stock === 0;
  const maxQuantity = Math.max(1, product.stock);
  const wishlisted = isWishlisted(product.id);

  function handleAdd() {
    addToCart({ productId: product.id, variantId, quantity: Math.min(quantity, maxQuantity) }, product.stock);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="flex flex-col gap-7">
      <div className="space-y-3">
        <p className="text-sm tracking-wide text-ink-500">{product.brand}</p>
        <h1 className="text-3xl md:text-4xl">{product.name}</h1>
        <div className="flex flex-wrap items-center gap-4 text-sm text-ink-500">
          <Stars value={product.rating} showValue />
          <span>{product.reviewCount.toLocaleString('fa-IR')} نظر</span>
        </div>
      </div>

      <p className="leading-[1.8] text-ink-700">{product.shortDescription}</p>

      <div className="flex flex-wrap items-baseline gap-3 border-y border-ivory-300 py-6">
        <span className="text-2xl font-bold">{formatToman(unitPrice)}</span>
        {compareAt && <span className="text-base text-ink-400 line-through">{formatToman(compareAt)}</span>}
        {discount > 0 && (
          <span className="rounded-full bg-burgundy-700 px-3 py-1 text-xs font-medium text-ivory-50">
            {`${discount.toLocaleString('fa-IR')}٪ تخفیف`}
          </span>
        )}
      </div>

      {product.variants.length > 1 && (
        <div className="space-y-6">
          {colors.length > 0 && (
            <fieldset className="space-y-3">
              <legend className="mb-3 text-sm font-medium">
                رنگ
                {variant?.kind === 'color' && <span className="ms-2 font-normal text-ink-500">{variant.label}</span>}
              </legend>
              <div role="radiogroup" aria-label="انتخاب رنگ" className="flex flex-wrap gap-3">
                {colors.map((item) => {
                  const selected = item.id === variantId;
                  const hex = item.colorHex ?? '#E6DFDC';
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-label={item.priceDelta > 0 ? `${item.label}، ${formatToman(item.priceDelta)} بیشتر` : item.label}
                      title={item.label}
                      onClick={() => setVariantId(item.id)}
                      className={`relative flex h-11 w-11 items-center justify-center rounded-full border-2 p-0.5 transition duration-300 hover:scale-110 ${
                        selected ? 'border-burgundy-700 shadow-soft' : 'border-transparent hover:border-ink-300'
                      }`}
                    >
                      <span
                        className="flex h-full w-full items-center justify-center rounded-full border border-ink-900/10"
                        style={{ backgroundColor: hex }}
                      >
                        {selected && <Check className="h-4 w-4" style={{ color: contrastingInk(hex) }} aria-hidden="true" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          {sizes.length > 0 && (
            <fieldset className="space-y-3">
              <legend className="mb-3 text-sm font-medium">
                حجم / اندازه
                {variant && variant.kind !== 'color' && <span className="ms-2 font-normal text-ink-500">{variant.label}</span>}
              </legend>
              <div role="radiogroup" aria-label="انتخاب حجم یا اندازه" className="flex flex-wrap gap-2">
                {sizes.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={item.id === variantId}
                    onClick={() => setVariantId(item.id)}
                    className={`rounded-full border px-4 py-2 text-sm transition ${
                      item.id === variantId
                        ? 'border-burgundy-700 bg-burgundy-700 text-ivory-50'
                        : 'border-ink-300 text-ink-700 hover:border-burgundy-700'
                    }`}
                  >
                    {item.label}
                    {item.priceDelta > 0 && (
                      <span className="ms-2 text-xs opacity-80">{`+${formatToman(item.priceDelta)}`}</span>
                    )}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {colors.length > 0 && sizes.length > 0 && (
            <p className="text-xs leading-[1.7] text-ink-500">هر سفارش با یک گزینه (رنگ یا حجم) ثبت می‌شود.</p>
          )}
        </div>
      )}

      <p className={`text-sm font-medium ${outOfStock ? 'text-error-600' : product.stock <= 5 ? 'text-warning-600' : 'text-success-600'}`}>
        {outOfStock
          ? 'این محصول در حال حاضر ناموجود است'
          : product.stock <= 5
            ? `تنها ${product.stock.toLocaleString('fa-IR')} عدد باقی مانده است`
            : 'موجود در انبار'}
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {!outOfStock && (
          <QuantityStepper
            label="تعداد"
            value={Math.min(quantity, maxQuantity)}
            max={maxQuantity}
            onChange={setQuantity}
          />
        )}
        <button type="button" onClick={handleAdd} disabled={outOfStock} className="btn-primary h-12 flex-1">
          {added ? (
            <>
              <Check className="h-4 w-4" /> به سبد خرید اضافه شد
            </>
          ) : (
            <>
              <ShoppingBag className="h-4 w-4" /> {outOfStock ? 'ناموجود' : 'افزودن به سبد خرید'}
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => toggleWishlist(product.id)}
          aria-pressed={wishlisted}
          aria-label={wishlisted ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}
          className="flex h-12 w-12 flex-none items-center justify-center self-center rounded-full border border-ink-300 text-burgundy-700 transition hover:border-burgundy-700"
        >
          <Heart className="h-5 w-5" fill={wishlisted ? 'currentColor' : 'none'} />
        </button>
      </div>

      {added && (
        <Link to="/cart" className="text-sm font-medium text-burgundy-700 underline-offset-4 hover:underline">
          مشاهده سبد خرید
        </Link>
      )}

      <ul className="grid gap-4 rounded-2xl bg-ivory-200/60 p-5 text-sm text-ink-700 sm:grid-cols-2">
        <li className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-rose-600" aria-hidden="true" /> محصول اصل با گواهی اصالت
        </li>
        <li className="flex items-center gap-3">
          <Truck className="h-5 w-5 text-rose-600" aria-hidden="true" /> ارسال با پیک و بسته‌بندی ایمن
        </li>
      </ul>
    </div>
  );
}
