import { useState } from "react";
import { CheckCircle2, MapPin, Truck } from "lucide-react";
import RequireAuth from "@/components/account/RequireAuth";
import AddressPicker from "@/components/checkout/AddressPicker";
import Link from "@/components/common/Link";
import { EmptyState, ErrorState, SkeletonGrid } from "@/components/common/StateViews";
import { useAsync } from "@/hooks/useAsync";
import { useCartDetails } from "@/hooks/useCartDetails";
import { usePromotionPreview } from "@/hooks/usePromotionPreview";
import { useShop } from "@/hooks/useShop";
import { fetchAddresses } from "@/lib/addresses";
import { formatToman } from "@/lib/format";
import { navigate } from "@/lib/navigation";
import { OrderError, placeOrder } from "@/lib/orders";
import { orderErrorMessage } from "@/lib/orderLabels";
import { fetchPaymentGateways } from "@/lib/paymentGateways";
import { fetchPaymentSettings, startOnlinePayment } from "@/lib/payments";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { calculateDynamicShipping } from "@/lib/storeSettings";

const ONLINE_PROVIDER_DETAILS: Record<string, string> = {
  zarinpal: "پرداخت امن با تمام کارت‌های عضو شتاب",
  sep: "پرداخت مستقیم از طریق بانک سامان",
  mellat: "پرداخت مستقیم از طریق بانک ملت",
  snapppay: "خرید اقساطی؛ تسویه در ۴ قسط ماهانه",
};

type PaymentMethod = "card" | "online";
type Installments = 1 | 4;

async function loadPaymentOptions() {
  const [settings, gateways] = await Promise.all([fetchPaymentSettings(), fetchPaymentGateways()]);
  return {
    cardEnabled: settings?.cardPaymentEnabled === true && settings.cardNumber.length > 0,
    online: gateways.filter((gateway) => Object.keys(ONLINE_PROVIDER_DETAILS).includes(gateway.provider)),
  };
}

export default function CheckoutPage() {
  return <RequireAuth>{() => <CheckoutContent />}</RequireAuth>;
}

function CheckoutContent() {
  const { cart, clearCart } = useShop();
  const details = useCartDetails(cart);
  const promo = usePromotionPreview(details.subtotal);
  const addresses = useAsync(fetchAddresses, []);
  const store = useStoreSettings();
  const paymentOptions = useAsync(loadPaymentOptions, []);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [paymentChoice, setPaymentChoice] = useState<PaymentMethod | null>(null);
  const [providerChoice, setProviderChoice] = useState<string | null>(null);
  const [installmentChoice, setInstallmentChoice] = useState<Installments>(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (cart.length === 0) {
    return (
      <div className="container-nova py-12">
        <EmptyState title="سبد خرید شما خالی است" description="پیش از تسویه حساب، محصولی به سبد خرید اضافه کنید." action={<Link to="/shop" className="btn-primary">مشاهده فروشگاه</Link>} />
      </div>
    );
  }

  if (details.error || store.error || paymentOptions.error) {
    const retry = store.error ? store.retry : details.error ? details.retry : paymentOptions.retry;
    return <div className="container-nova py-12"><ErrorState onRetry={retry} /></div>;
  }

  if (details.loading || !store.data || !paymentOptions.data) {
    return <div className="container-nova py-12"><SkeletonGrid count={2} /></div>;
  }

  const options = paymentOptions.data;
  const paymentMethod: PaymentMethod = paymentChoice ?? (options.cardEnabled ? "card" : "online");
  const selectedProvider = providerChoice ?? options.online[0]?.provider ?? null;
  const installments = selectedProvider === "snapppay" ? installmentChoice : 1;
  const addressId = selectedAddressId ?? addresses.data?.[0]?.id ?? null;
  const selectedAddress = addresses.data?.find((a) => a.id === addressId) ?? null;
  const subtotal = details.subtotal;
  const totalItemCount = details.lines.reduce((acc, item) => acc + item.quantity, 0);

  const shippingQuote = calculateDynamicShipping({
    province: selectedAddress?.province,
    city: selectedAddress?.city,
    subtotalToman: subtotal,
    itemCount: totalItemCount,
    settings: store.data,
  });

  const deliveryFee = selectedAddress ? shippingQuote.feeToman : 0;
  const discount = promo.discount;
  const total = Math.max(0, subtotal - discount + deliveryFee);
  const paymentReady = paymentMethod === "card" ? options.cardEnabled : selectedProvider !== null;
  const canSubmit = !submitting && addressId !== null && details.unavailableCount === 0 && details.lines.length > 0 && paymentReady && !promo.couponErrorMessage;
  const freeProgressPercent = Math.min(100, Math.round((subtotal / Math.max(1, shippingQuote.freeThresholdToman)) * 100));

  async function handleSubmit() {
    if (!addressId || submitting) return;
    setSubmitting(true); setSubmitError(null);
    let orderId: string;
    try {
      orderId = await placeOrder({
        addressId,
        deliveryMethod: "post",
        deliverySlot: null,
        items: details.lines.map(({ line, quantity }) => ({ productId: line.productId, variantId: line.variantId, quantity })),
        couponCode: promo.appliedCoupon?.code ?? null,
        freeSampleId: promo.selectedSample?.id ?? null,
        idempotencyKey: crypto.randomUUID(),
      });
    } catch (error) {
      setSubmitError(orderErrorMessage(error instanceof OrderError ? error.code : ""));
      setSubmitting(false);
      return;
    }
    if (paymentMethod === "online" && selectedProvider) {
      try {
        await startOnlinePayment(orderId, selectedProvider, installments);
      } catch {
        setSubmitError("سفارش ثبت شد، اما اتصال به درگاه انجام نشد.");
        setSubmitting(false);
        return;
      }
    }
    clearCart();
    navigate("/account/orders/" + orderId, { replace: true });
  }

  return (
    <div className="container-nova overflow-x-hidden py-6 sm:py-10 md:py-16">
      <h1 className="mb-5 text-2xl sm:mb-8 sm:text-3xl md:text-4xl">تسویه حساب</h1>
      <div className="grid min-w-0 gap-5 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-5 sm:space-y-8">
          <section className="min-w-0 space-y-4 rounded-2xl border border-ivory-300 bg-ivory-50 p-4 shadow-soft sm:space-y-6 sm:rounded-3xl sm:p-6 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base sm:text-xl">نشانی گیرنده و محاسبه هوشمند کرایه پستی (از مبدأ مشهد)</h2>
              {selectedAddress && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-ivory-200 px-3 py-1 text-xs font-medium text-burgundy-800">
                  <MapPin className="h-3.5 w-3.5" />
                  {selectedAddress.province}، {selectedAddress.city}
                </span>
              )}
            </div>
            <AddressPicker addresses={addresses.data} loading={addresses.loading} error={addresses.error} selectedId={addressId} onSelect={setSelectedAddressId} onRetry={addresses.retry} />
            {selectedAddress && (
              <div className="rounded-2xl border border-gold-500/50 bg-ivory-100/90 p-4 text-xs sm:text-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-burgundy-700/10 text-burgundy-700"><Truck className="h-4 w-4" /></span>
                    <div>
                      <p className="font-bold text-ink-900">{shippingQuote.zoneLabel}</p>
                      <p className="mt-0.5 text-xs text-ink-500">تحویل تخمینی: <span className="font-medium text-ink-800">{shippingQuote.etaLabel}</span> · {shippingQuote.breakdownLabel}</p>
                    </div>
                  </div>
                  <div className="text-end">
                    {shippingQuote.freeThresholdToman === 0 ? null : shippingQuote.isFree ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success-100 px-3 py-1 text-xs font-bold text-success-600"><CheckCircle2 className="h-3.5 w-3.5" /> ارسال رایگان</span>
                    ) : (
                      <span className="text-sm font-bold text-burgundy-800">{formatToman(shippingQuote.feeToman)}</span>
                    )}
                  </div>
                </div>
                <div className="mt-3.5 border-t border-ivory-300 pt-3">
                  {shippingQuote.freeThresholdToman === 0 ? null : shippingQuote.isFree ? (
                    <p className="flex items-center gap-1.5 text-xs font-bold text-success-600"><CheckCircle2 className="h-4 w-4 shrink-0" /> خرید شما بالای {formatToman(shippingQuote.freeThresholdToman)} است و ارسال به {selectedAddress.city} رایگان شد!</p>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-ink-700">فقط <b className="text-burgundy-700">{formatToman(shippingQuote.remainingForFreeToman)}</b> دیگر تا <b>ارسال رایگان</b> به {selectedAddress.city}</span>
                        <span className="font-mono text-[11px] text-ink-500">{freeProgressPercent.toLocaleString("fa-IR")}٪</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-ivory-300">
                        <div className="h-full rounded-full bg-burgundy-700 transition-all duration-500" style={{ width: freeProgressPercent + "%" }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
          <section className="min-w-0 space-y-4 rounded-2xl border border-ivory-300 bg-ivory-50 p-4 shadow-soft sm:space-y-6 sm:rounded-3xl sm:p-6 md:p-8">
            <h2 className="text-base sm:text-xl">روش پرداخت</h2>
            <div role="radiogroup" className="grid min-w-0 gap-3 sm:gap-4 md:grid-cols-2">
              <PaymentOptionCard name="payment-method" value="card" checked={paymentMethod === "card"} disabled={!options.cardEnabled} onSelect={() => setPaymentChoice("card")} title="کارت به کارت" description={options.cardEnabled ? "واریز مستقیم به حساب فروشگاه و ارسال تصویر فیش برای تأیید" : "کارت به کارت غیرفعال است"} />
              <PaymentOptionCard name="payment-method" value="online" checked={paymentMethod === "online"} disabled={options.online.length === 0} onSelect={() => setPaymentChoice("online")} title="پرداخت آنلاین" description={options.online.length > 0 ? "پرداخت آنی از طریق درگاه بانکی یا خرید اقساطی" : "درگاه آنلاین غیرفعال است"} />
            </div>
          </section>
        </div>
        <aside className="h-fit min-w-0 space-y-4 rounded-2xl border border-ivory-300 bg-ivory-50 p-4 shadow-soft sm:space-y-6 sm:rounded-3xl sm:p-6 md:p-8 lg:sticky lg:top-28">
          <h2 className="text-base sm:text-xl">خلاصه سفارش</h2>
          <ul className="max-h-60 divide-y divide-ivory-300 overflow-y-auto text-sm">
            {details.lines.map(({ key, product, variant, quantity, lineTotal }) => (
              <li key={key} className="flex justify-between gap-3 py-3">
                <span className="text-ink-700">{product.name}{variant ? " (" + variant.label + ")" : ""} × {quantity.toLocaleString("fa-IR")}</span>
                <span className="shrink-0 font-medium">{formatToman(lineTotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="space-y-3 border-t border-ivory-300 pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-ink-700">جمع اقلام ({totalItemCount.toLocaleString("fa-IR")} کالا)</dt><dd>{formatToman(subtotal)}</dd></div>
            {discount > 0 && <div className="flex justify-between text-success-600"><dt>تخفیف ({promo.appliedCoupon?.code})</dt><dd>-{formatToman(discount)}</dd></div>}
            <div className="flex items-start justify-between gap-2">
              <dt className="text-ink-700"><span>هزینه ارسال (از مبدأ مشهد)</span>{selectedAddress && <span className="block text-[11px] text-ink-500">به {selectedAddress.city} ({selectedAddress.province})</span>}</dt>
              <dd className="text-end font-medium">{!selectedAddress ? <span className="text-xs text-ink-500">پس از انتخاب نشانی</span> : shippingQuote.isFree ? <span className="font-bold text-success-600">رایگان</span> : formatToman(deliveryFee)}</dd>
            </div>
            <div className="flex justify-between border-t border-ivory-300 pt-4 text-base"><dt className="font-bold">مبلغ قابل پرداخت</dt><dd className="font-bold text-burgundy-800">{formatToman(total)}</dd></div>
          </dl>
          {submitError && <p role="alert" className="rounded-xl bg-error-100 px-4 py-3 text-sm text-error-600">{submitError}</p>}
          <button type="button" onClick={() => void handleSubmit()} disabled={!canSubmit} className="btn-primary w-full">{submitting ? "در حال ثبت سفارش..." : "ثبت سفارش"}</button>
        </aside>
      </div>
    </div>
  );
}

function PaymentOptionCard({ name, value, checked, disabled, onSelect, title, description }: { name: string; value: PaymentMethod; checked: boolean; disabled: boolean; onSelect: () => void; title: string; description: string }) {
  return (
    <label className={"rounded-xl border p-3.5 transition sm:rounded-2xl sm:p-5 " + (disabled ? "cursor-not-allowed opacity-60 " : "cursor-pointer ") + (checked ? "border-burgundy-700 bg-ivory-200/60 shadow-soft" : "border-ivory-300 hover:border-gold-500")}>
      <span className="flex items-start gap-3">
        <input type="radio" name={name} value={value} checked={checked} disabled={disabled} onChange={onSelect} className="mt-1.5 h-4 w-4 accent-burgundy-700" />
        <span className="space-y-1"><span className="block font-medium text-ink-900">{title}</span><span className="block text-sm leading-[1.8] text-ink-500">{description}</span></span>
      </span>
    </label>
  );
}
