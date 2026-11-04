import { useShop } from '@/hooks/useShop';
import { useAsync } from '@/hooks/useAsync';
import { orderErrorMessage } from '@/lib/orderLabels';
import { fetchActiveFreeSamples, PromotionError, validateCoupon, type CouponPreview, type FreeSample } from '@/lib/promotions';

interface CouponLookup {
  preview: CouponPreview | null;
  errorMessage: string | null;
}

export function usePromotionPreview(subtotal: number) {
  const { promotion, setCouponCode, setFreeSampleId } = useShop();
  const samples = useAsync(fetchActiveFreeSamples, []);
  const coupon = useAsync<CouponLookup | null>(async () => {
    if (!promotion.couponCode) return null;
    try {
      return { preview: await validateCoupon(promotion.couponCode, subtotal), errorMessage: null };
    } catch (error) {
      return {
        preview: null,
        errorMessage:
          error instanceof PromotionError
            ? orderErrorMessage(error.code)
            : 'بررسی کد تخفیف انجام نشد. لطفاً دوباره تلاش کنید.',
      };
    }
  }, [promotion.couponCode, subtotal]);

  const selectedSample: FreeSample | null =
    samples.data?.find((sample) => sample.id === promotion.freeSampleId && subtotal >= sample.minSubtotalToman) ?? null;
  const appliedCoupon: CouponPreview | null = coupon.data?.preview ?? null;
  const couponErrorMessage = coupon.error ? 'بررسی کد تخفیف انجام نشد. لطفاً دوباره تلاش کنید.' : coupon.data?.errorMessage ?? null;

  async function applyCoupon(code: string): Promise<void> {
    const preview = await validateCoupon(code, subtotal);
    setCouponCode(preview.code);
  }

  return {
    samples,
    selectedSample,
    couponCode: promotion.couponCode,
    appliedCoupon,
    couponLoading: coupon.loading,
    couponErrorMessage,
    retryCoupon: coupon.retry,
    discount: appliedCoupon?.discountToman ?? 0,
    applyCoupon,
    removeCoupon: () => setCouponCode(null),
    chooseSample: (id: string | null) => setFreeSampleId(id),
  };
}
