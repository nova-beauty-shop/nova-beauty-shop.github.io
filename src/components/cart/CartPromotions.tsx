import { useState, type FormEvent } from 'react';
import { Check, Gift, TicketPercent, X } from 'lucide-react';
import { usePromotionPreview } from '@/hooks/usePromotionPreview';
import { orderErrorMessage } from '@/lib/orderLabels';
import { PromotionError } from '@/lib/promotions';
import { formatToman } from '@/lib/format';

export default function CartPromotions({ subtotal }: { subtotal: number }) {
  const promo = usePromotionPreview(subtotal);
  const [codeInput, setCodeInput] = useState('');
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  async function handleApply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = codeInput.trim().toUpperCase();
    if (!code || applying) return;
    setApplying(true);
    setApplyError(null);
    try {
      await promo.applyCoupon(code);
      setCodeInput('');
    } catch (cause) {
      setApplyError(cause instanceof PromotionError ? orderErrorMessage(cause.code) : 'بررسی کد تخفیف انجام نشد.');
    } finally {
      setApplying(false);
    }
  }

  const samples = promo.samples.data ?? [];

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-medium text-ink-900">
          <Gift className="h-4 w-4 text-burgundy-700" aria-hidden="true" />
          نمونه رایگان
        </h3>
        {promo.samples.loading && <p className="text-xs text-ink-500">در حال بارگذاری...</p>}
        {promo.samples.error && <p className="text-xs text-error-600">نمونه‌های رایگان بارگذاری نشدند.</p>}
        {!promo.samples.loading && !promo.samples.error && samples.length === 0 && (
          <p className="text-xs text-ink-500">در حال حاضر نمونه رایگانی برای سفارش شما وجود ندارد.</p>
        )}
        <ul className="space-y-2">
          {samples.map((sample) => {
            const eligible = subtotal >= sample.minSubtotalToman;
            const selected = promo.selectedSample?.id === sample.id;
            return (
              <li
                key={sample.id}
                className={`flex items-center gap-3 rounded-2xl border p-3 transition ${
                  selected ? 'border-burgundy-700 bg-ivory-200/60' : 'border-ivory-300'
                } ${eligible ? '' : 'opacity-60'}`}
              >
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-ivory-200">
                  {sample.imageUrl && <img src={sample.imageUrl} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-900">{sample.title}</p>
                  <p className="text-xs text-ink-500">
                    {eligible
                      ? sample.description || 'رایگان'
                      : `برای دریافت، سبد خرید باید حداقل ${formatToman(sample.minSubtotalToman)} باشد`}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!eligible && !selected}
                  onClick={() => promo.chooseSample(selected ? null : sample.id)}
                  className="btn-outline h-9 shrink-0 px-3 text-xs disabled:cursor-not-allowed"
                >
                  {selected ? (
                    <>
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                      لغو
                    </>
                  ) : (
                    'انتخاب'
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-medium text-ink-900">
          <TicketPercent className="h-4 w-4 text-burgundy-700" aria-hidden="true" />
          کد تخفیف
        </h3>

        {promo.couponCode && (
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-success-100 px-4 py-3 text-sm text-success-600">
            <span className="flex items-center gap-2">
              <Check className="h-4 w-4" aria-hidden="true" />
              <span dir="ltr" className="font-mono font-semibold">{promo.couponCode}</span>
              {promo.appliedCoupon && <span>فعال است</span>}
            </span>
            <button type="button" onClick={promo.removeCoupon} className="text-xs underline underline-offset-4">
              حذف کد
            </button>
          </div>
        )}
        {promo.couponErrorMessage && (
          <p role="alert" className="flex items-center justify-between gap-3 rounded-xl bg-error-100 px-4 py-3 text-sm text-error-600">
            <span>{promo.couponErrorMessage}</span>
            <button type="button" onClick={promo.retryCoupon} className="shrink-0 text-xs underline underline-offset-4">
              تلاش دوباره
            </button>
          </p>
        )}

        {!promo.couponCode && (
          <form onSubmit={handleApply} className="flex gap-2">
            <label htmlFor="cart-coupon" className="sr-only">کد تخفیف</label>
            <input
              id="cart-coupon"
              dir="ltr"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder="کد تخفیف"
              className="field min-w-0 flex-1 font-mono tracking-wide text-start"
            />
            <button type="submit" disabled={applying || codeInput.trim() === ''} className="btn-outline h-12 shrink-0 px-4">
              {applying ? 'در حال بررسی...' : 'اعمال'}
            </button>
          </form>
        )}
        {applyError && (
          <p role="alert" className="text-xs text-error-600">{applyError}</p>
        )}
      </section>
    </div>
  );
}
