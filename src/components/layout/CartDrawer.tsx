import { Bookmark, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import CartTabs, { type CartTabKey } from '@/components/cart/CartTabs';
import ComplementaryProducts from '@/components/cart/ComplementaryProducts';
import SavedForLaterPanel from '@/components/cart/SavedForLaterPanel';
import CartPromotions from '@/components/cart/CartPromotions';
import Link from '@/components/common/Link';
import { EmptyState, SkeletonGrid, ErrorState } from '@/components/common/StateViews';
import QuantityStepper from '@/components/common/QuantityStepper';
import { useCartDetails } from '@/hooks/useCartDetails';
import { usePromotionPreview } from '@/hooks/usePromotionPreview';
import { useShop } from '@/hooks/useShop';
import { formatToman } from '@/lib/format';

export default function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { cart, setCartQuantity, removeFromCart, saveForLater, savedForLater } = useShop();
  const [tab, setTab] = useState<CartTabKey>('cart');
  const details = useCartDetails(open ? cart : []);
  const promo = usePromotionPreview(details.subtotal);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button type="button" aria-label="بستن سبد خرید" onClick={onClose} className="absolute inset-0 bg-ink-900/40 backdrop-blur-[2px]" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="سبد خرید"
        className="absolute inset-y-0 left-0 flex w-full max-w-md animate-slide-in-left flex-col bg-ivory-50 shadow-lift"
      >
        <header className="flex items-center justify-between border-b border-ivory-300 px-6 py-5">
          <h2 className="text-lg">سبد خرید</h2>
          <button type="button" onClick={onClose} aria-label="بستن" className="rounded-full p-2 hover:bg-ivory-200">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="px-6 pt-4">
          <CartTabs active={tab} onChange={setTab} cartCount={cart.length} savedCount={savedForLater.length} />
        </div>

        {tab === 'saved' && (
          <div role="tabpanel" id="cart-panel-saved" aria-labelledby="cart-tab-saved" className="flex-1 overflow-y-auto px-6 py-5">
            <SavedForLaterPanel onNavigate={onClose} />
          </div>
        )}

        {tab === 'cart' && (
        <div role="tabpanel" id="cart-panel-cart" aria-labelledby="cart-tab-cart" className="flex-1 overflow-y-auto px-6 py-5">
          {details.loading && <SkeletonGrid count={2} />}
          {details.error && <ErrorState onRetry={details.retry} />}
          {!details.loading && !details.error && details.lines.length === 0 && (
            <EmptyState title="سبد خرید شما خالی است" description="محصولات مورد علاقه‌تان را به سبد خرید اضافه کنید." />
          )}
          <ul className="space-y-5">
            {details.lines.map(({ line, product, variantLabel, unitPrice, quantity }) => (
              <li key={`${line.productId}-${line.variantId}`} className="flex gap-4">
                <img src={product.images[0]} alt="" className="h-24 w-20 flex-none rounded-xl object-cover" />
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium leading-snug">{product.name}</p>
                      {variantLabel && <p className="text-xs text-ink-500">{variantLabel}</p>}
                    </div>
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() => saveForLater(line.productId, line.variantId)}
                        aria-label={`ذخیره ${product.name} برای خرید بعدی`}
                        title="ذخیره برای بعد"
                        className="rounded-full p-1.5 text-ink-500 hover:text-burgundy-700"
                      >
                        <Bookmark className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromCart(line.productId, line.variantId)}
                        aria-label={`حذف ${product.name}`}
                        className="rounded-full p-1.5 text-ink-500 hover:text-error-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-auto flex items-center justify-between">
                    <QuantityStepper
                      label={`تعداد ${product.name}`}
                      value={quantity}
                      max={product.stock}
                      onChange={(value) => setCartQuantity(line.productId, line.variantId, value, product.stock)}
                    />
                    <span className="text-sm font-medium">{formatToman(unitPrice * quantity)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {details.unavailableCount > 0 && (
            <p className="mt-6 rounded-xl bg-warning-100 px-4 py-3 text-sm text-warning-600">
              برخی محصولات دیگر در دسترس نیستند و از سبد خرید حذف شده‌اند.
            </p>
          )}
          {details.lines.length > 0 && (
            <div className="mt-8 border-t border-ivory-300 pt-6">
              <CartPromotions subtotal={details.subtotal} />
            </div>
          )}
          {details.lines.length > 0 && (
            <div className="mt-8 border-t border-ivory-300 pt-6">
              <ComplementaryProducts
                categoryIds={details.lines.map(({ product }) => product.categoryId)}
                excludeIds={details.lines.map(({ product }) => product.id)}
                limit={2}
                compact
                onNavigate={onClose}
              />
            </div>
          )}
        </div>
        )}

        {tab === 'saved' && (
          <footer className="border-t border-ivory-300 px-6 py-5">
            <button type="button" onClick={onClose} className="btn-outline w-full">
              ادامه خرید
            </button>
          </footer>
        )}

        {tab === 'cart' && (
        <footer className="space-y-4 border-t border-ivory-300 px-6 py-5">
          {promo.discount > 0 && (
            <div className="flex items-center justify-between text-sm text-success-600">
              <span>تخفیف کد {promo.couponCode}</span>
              <span>-{formatToman(promo.discount)}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-ink-700">جمع کل</span>
            <span className="text-lg font-bold">{formatToman(Math.max(0, details.subtotal - promo.discount))}</span>
          </div>
          <p className="text-xs text-ink-500">هزینه ارسال و مالیات در مرحله پرداخت محاسبه می‌شود.</p>
          <Link
            to="/checkout"
            onClick={onClose}
            aria-disabled={details.lines.length === 0 || details.unavailableCount > 0}
            className={`btn-primary w-full ${details.lines.length === 0 || details.unavailableCount > 0 ? 'pointer-events-none opacity-50' : ''}`}
          >
            ادامه و تسویه حساب
          </Link>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={onClose} className="btn-outline">
              ادامه خرید
            </button>
            <Link to="/cart" onClick={onClose} className="btn-outline">
              مشاهده سبد
            </Link>
          </div>
        </footer>
        )}
      </aside>
    </div>
  );
}
