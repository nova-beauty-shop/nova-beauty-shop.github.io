import { useState } from 'react';
import { Bookmark, Trash2 } from 'lucide-react';
import CartSummary from '@/components/cart/CartSummary';
import CartTabs, { type CartTabKey } from '@/components/cart/CartTabs';
import ComplementaryProducts from '@/components/cart/ComplementaryProducts';
import SavedForLaterPanel from '@/components/cart/SavedForLaterPanel';
import Link from '@/components/common/Link';
import QuantityStepper from '@/components/common/QuantityStepper';
import { EmptyState, ErrorState, SkeletonGrid } from '@/components/common/StateViews';
import { useCartDetails } from '@/hooks/useCartDetails';
import { useShop } from '@/hooks/useShop';
import { formatToman } from '@/lib/format';

export default function CartPage() {
  const { cart, setCartQuantity, removeFromCart, saveForLater, savedForLater } = useShop();
  const details = useCartDetails(cart);
  const [tab, setTab] = useState<CartTabKey>('cart');

  if (details.loading && cart.length > 0) {
    return (
      <div className="container-nova py-12">
        <SkeletonGrid count={2} />
      </div>
    );
  }

  if (details.error) {
    return (
      <div className="container-nova py-12">
        <ErrorState onRetry={details.retry} />
      </div>
    );
  }

  if (details.lines.length === 0 && savedForLater.length === 0) {
    return (
      <div className="container-nova py-12">
        <EmptyState
          title="سبد خرید شما خالی است"
          description="برای دیدن محصولات منتخب نُوا به فروشگاه سر بزنید."
          action={
            <Link to="/shop" className="btn-primary">
              مشاهده فروشگاه
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="container-nova py-12">
      <h1 className="mb-8 text-3xl md:text-4xl">سبد خرید</h1>

      <div className="mb-10">
        <CartTabs active={tab} onChange={setTab} cartCount={cart.length} savedCount={savedForLater.length} />
      </div>

      {tab === 'saved' && (
        <div role="tabpanel" id="cart-panel-saved" aria-labelledby="cart-tab-saved" className="max-w-3xl">
          <SavedForLaterPanel />
        </div>
      )}

      {tab === 'cart' && details.lines.length === 0 && (
        <div role="tabpanel" id="cart-panel-cart" aria-labelledby="cart-tab-cart">
          <EmptyState
            title="سبد خرید شما خالی است"
            description="کالاهای ذخیره‌شده را از «لیست خرید بعدی» به سبد برگردانید یا به فروشگاه سر بزنید."
            action={
              <Link to="/shop" className="btn-primary">
                مشاهده فروشگاه
              </Link>
            }
          />
        </div>
      )}

      {tab === 'cart' && details.lines.length > 0 && (
        <div role="tabpanel" id="cart-panel-cart" aria-labelledby="cart-tab-cart" className="space-y-16">
          {details.unavailableCount > 0 && (
            <p className="rounded-xl bg-warning-100 px-5 py-4 text-sm text-warning-600">
              برخی محصولات دیگر در دسترس نیستند و از سبد خرید شما حذف شده‌اند.
            </p>
          )}

          <div className="grid gap-12 lg:grid-cols-[1fr_360px]">
            <ul className="divide-y divide-ivory-300">
              {details.lines.map(({ line, product, variantLabel, unitPrice, quantity, lineTotal }) => (
                <li key={`${line.productId}-${line.variantId}`} className="flex gap-5 py-6 first:pt-0">
                  <Link to={`/product/${product.slug}`} className="block w-24 flex-none overflow-hidden rounded-2xl bg-ivory-200 sm:w-32">
                    <img src={product.images[0]} alt={product.name} className="aspect-[3/4] h-full w-full object-cover" />
                  </Link>
                  <div className="flex flex-1 flex-col gap-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-xs text-ink-500">{product.brand}</p>
                        <Link to={`/product/${product.slug}`} className="font-medium hover:text-burgundy-700">
                          {product.name}
                        </Link>
                        {variantLabel && <p className="text-sm text-ink-500">{variantLabel}</p>}
                        <p className="text-sm text-ink-700">{formatToman(unitPrice)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(line.productId, line.variantId)}
                        aria-label={`حذف ${product.name}`}
                        className="rounded-full p-2 text-ink-500 transition hover:bg-error-100 hover:text-error-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-4">
                      <div className="flex flex-wrap items-center gap-4">
                        <QuantityStepper
                          label={`تعداد ${product.name}`}
                          value={quantity}
                          max={product.stock}
                          onChange={(value) => setCartQuantity(line.productId, line.variantId, value, product.stock)}
                        />
                        <button
                          type="button"
                          onClick={() => saveForLater(line.productId, line.variantId)}
                          className="inline-flex items-center gap-1.5 text-sm text-ink-500 transition hover:text-burgundy-700"
                        >
                          <Bookmark className="h-4 w-4" aria-hidden="true" />
                          ذخیره برای بعد
                        </button>
                      </div>
                      <span className="font-bold">{formatToman(lineTotal)}</span>
                    </div>
                    {quantity < line.quantity && (
                      <p className="text-xs text-warning-600">
                        به دلیل محدودیت موجودی، تعداد به {quantity.toLocaleString('fa-IR')} عدد تنظیم شد.
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <aside className="h-fit space-y-6 rounded-3xl border border-ivory-300 bg-ivory-50 p-8 shadow-soft lg:sticky lg:top-28">
              <h2 className="text-xl">خلاصه سفارش</h2>
              <CartSummary subtotal={details.subtotal} itemCount={details.lines.reduce((sum, item) => sum + item.quantity, 0)} />
              <Link
                to="/checkout"
                aria-disabled={details.unavailableCount > 0}
                className={`btn-primary w-full ${details.unavailableCount > 0 ? 'pointer-events-none opacity-50' : ''}`}
              >
                ادامه و تسویه حساب
              </Link>
              <Link to="/shop" className="btn-outline w-full">
                ادامه خرید
              </Link>
            </aside>
          </div>

          <ComplementaryProducts
            categoryIds={details.lines.map(({ product }) => product.categoryId)}
            excludeIds={details.lines.map(({ product }) => product.id)}
          />
        </div>
      )}
    </div>
  );
}
