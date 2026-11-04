import CartPromotions from '@/components/cart/CartPromotions';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { usePromotionPreview } from '@/hooks/usePromotionPreview';
import { formatToman } from '@/lib/format';

export default function CartSummary({ subtotal, itemCount }: { subtotal: number; itemCount: number }) {
  const store = useStoreSettings();
  const promo = usePromotionPreview(subtotal);
  const threshold = store.data?.courierFreeThresholdToman ?? 0;
  const remaining = Math.max(0, threshold - subtotal);
  const progress = threshold > 0 ? Math.min(100, Math.round((subtotal / threshold) * 100)) : 100;
  const payable = Math.max(0, subtotal - promo.discount);

  return (
    <div className="space-y-6">
      {threshold > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-ink-700">
            {remaining > 0
              ? `${formatToman(remaining)} تا ارسال رایگان با پیک`
              : 'ارسال با پیک برای سفارش شما رایگان است'}
          </p>
          <div
            role="progressbar"
            aria-label="پیشرفت ارسال رایگان"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            className="h-2 overflow-hidden rounded-full bg-ivory-200"
          >
            <div
              className="h-full rounded-full bg-burgundy-700 transition-[width] duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <dl className="space-y-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-ink-700">تعداد اقلام</dt>
          <dd>{itemCount.toLocaleString('fa-IR')}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-700">جمع اقلام</dt>
          <dd>{formatToman(subtotal)}</dd>
        </div>
        {promo.discount > 0 && (
          <div className="flex justify-between text-success-600">
            <dt>تخفیف کد {promo.couponCode}</dt>
            <dd>-{formatToman(promo.discount)}</dd>
          </div>
        )}
        {promo.selectedSample && (
          <div className="flex justify-between text-success-600">
            <dt>نمونه رایگان</dt>
            <dd className="max-w-[60%] truncate">{promo.selectedSample.title}</dd>
          </div>
        )}
        <div className="flex justify-between border-t border-ivory-300 pt-4 text-base">
          <dt className="font-medium">جمع کل</dt>
          <dd className="font-bold">{formatToman(payable)}</dd>
        </div>
        {promo.discount > 0 && (
          <p className="rounded-xl bg-success-100 px-4 py-3 text-center text-sm text-success-600">
            سود شما از این خرید: {formatToman(promo.discount)}
          </p>
        )}
      </dl>

      <CartPromotions subtotal={subtotal} />
      <p className="text-xs leading-relaxed text-ink-500">
        هزینه ارسال در مرحله پرداخت محاسبه و به مبلغ نهایی اضافه می‌شود.
      </p>
    </div>
  );
}
