import { useState } from 'react';
import RequireAuth from '@/components/account/RequireAuth';
import AddressPicker from '@/components/checkout/AddressPicker';
import DeliverySlotPicker from '@/components/checkout/DeliverySlotPicker';
import Link from '@/components/common/Link';
import { EmptyState, ErrorState, SkeletonGrid } from '@/components/common/StateViews';
import { useAsync } from '@/hooks/useAsync';
import { useCartDetails } from '@/hooks/useCartDetails';
import { usePromotionPreview } from '@/hooks/usePromotionPreview';
import { useShop } from '@/hooks/useShop';
import { fetchAddresses } from '@/lib/addresses';
import { formatToman } from '@/lib/format';
import { navigate } from '@/lib/navigation';
import { OrderError, placeOrder, type DeliveryMethod } from '@/lib/orders';
import { DELIVERY_LABELS, orderErrorMessage } from '@/lib/orderLabels';
import { fetchPaymentGateways } from '@/lib/paymentGateways';
import { fetchPaymentSettings, startOnlinePayment } from '@/lib/payments';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { estimateDeliveryFee } from '@/lib/storeSettings';

const DELIVERY_OPTIONS: { value: DeliveryMethod; description: string }[] = [
  { value: 'courier', description: 'تحویل با پیک در تهران و کلان‌شهرها، ۱ تا ۲ روز کاری' },
  { value: 'post', description: 'ارسال با پست پیشتاز به سراسر کشور، ۳ تا ۶ روز کاری' },
];

const ONLINE_PROVIDER_DETAILS: Record<string, string> = {
  zarinpal: 'پرداخت امن با تمام کارت‌های عضو شتاب',
  sep: 'پرداخت مستقیم از طریق بانک سامان',
  mellat: 'پرداخت مستقیم از طریق بانک ملت',
  snapppay: 'خرید اقساطی؛ تسویه در ۴ قسط ماهانه',
};

type PaymentMethod = 'card' | 'online';
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
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('courier');
  const [deliverySlot, setDeliverySlot] = useState<string | null>(null);
  const [paymentChoice, setPaymentChoice] = useState<PaymentMethod | null>(null);
  const [providerChoice, setProviderChoice] = useState<string | null>(null);
  const [installmentChoice, setInstallmentChoice] = useState<Installments>(1);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (cart.length === 0) {
    return (
      <div className="container-nova py-12">
        <EmptyState
          title="سبد خرید شما خالی است"
          description="پیش از تسویه حساب، محصولی به سبد خرید اضافه کنید."
          action={
            <Link to="/shop" className="btn-primary">
              مشاهده فروشگاه
            </Link>
          }
        />
      </div>
    );
  }

  if (details.error || store.error || paymentOptions.error) {
    const retry = store.error ? store.retry : details.error ? details.retry : paymentOptions.retry;
    return (
      <div className="container-nova py-12">
        <ErrorState onRetry={retry} />
      </div>
    );
  }

  if (details.loading || !store.data || !paymentOptions.data) {
    return (
      <div className="container-nova py-12">
        <SkeletonGrid count={2} />
      </div>
    );
  }

  const options = paymentOptions.data;
  const paymentMethod: PaymentMethod = paymentChoice ?? (options.cardEnabled ? 'card' : 'online');
  const selectedProvider = providerChoice ?? options.online[0]?.provider ?? null;
  const installments = selectedProvider === 'snapppay' ? installmentChoice : 1;

  const addressId = selectedAddressId ?? addresses.data?.[0]?.id ?? null;
  const subtotal = details.subtotal;
  const deliveryFee = estimateDeliveryFee(deliveryMethod, subtotal, store.data);
  const discount = promo.discount;
  const total = Math.max(0, subtotal - discount + deliveryFee);
  const paymentReady = paymentMethod === 'card' ? options.cardEnabled : selectedProvider !== null;
  const slotReady = deliveryMethod === 'post' || deliverySlot !== null;
  const canSubmit =
    !submitting &&
    addressId !== null &&
    details.unavailableCount === 0 &&
    details.lines.length > 0 &&
    paymentReady &&
    slotReady &&
    !promo.couponErrorMessage;

  async function handleSubmit() {
    if (!addressId || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    let orderId: string;
    try {
      orderId = await placeOrder({
        addressId,
        deliveryMethod,
        items: details.lines.map(({ line, quantity }) => ({
          productId: line.productId,
          variantId: line.variantId,
          quantity,
        })),
        deliverySlot: deliveryMethod === 'courier' ? deliverySlot : null,
        couponCode: promo.appliedCoupon?.code ?? null,
        freeSampleId: promo.selectedSample?.id ?? null,
        idempotencyKey,
      });
    } catch (error) {
      setSubmitError(orderErrorMessage(error instanceof OrderError ? error.code : ''));
      setSubmitting(false);
      return;
    }
    if (paymentMethod === 'online' && selectedProvider) {
      try {
        await startOnlinePayment(orderId, selectedProvider, installments);
      } catch {
        setSubmitError('سفارش ثبت شد، اما اتصال به درگاه انجام نشد. لطفاً دوباره روی ثبت سفارش بزنید.');
        setSubmitting(false);
        return;
      }
    }
    clearCart();
    navigate(`/account/orders/${orderId}`, { replace: true });
  }

  return (
    <div className="container-nova py-12 md:py-16">
      <h1 className="mb-10 text-3xl md:text-4xl">تسویه حساب</h1>

      <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="space-y-10">
          <section className="space-y-6 rounded-3xl border border-ivory-300 bg-ivory-50 p-6 shadow-soft md:p-8">
            <h2 className="text-xl">نشانی ارسال</h2>
            <AddressPicker
              addresses={addresses.data}
              loading={addresses.loading}
              error={addresses.error}
              selectedId={addressId}
              onSelect={setSelectedAddressId}
              onRetry={addresses.retry}
            />
          </section>

          <section className="space-y-6 rounded-3xl border border-ivory-300 bg-ivory-50 p-6 shadow-soft md:p-8">
            <h2 className="text-xl">روش ارسال</h2>
            <fieldset className="grid gap-4 md:grid-cols-2">
              <legend className="sr-only">روش ارسال</legend>
              {DELIVERY_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`cursor-pointer rounded-2xl border p-5 transition ${
                    deliveryMethod === option.value
                      ? 'border-burgundy-700 bg-ivory-200/60 shadow-soft'
                      : 'border-ivory-300 hover:border-gold-500'
                  }`}
                >
                  <span className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="delivery-method"
                      value={option.value}
                      checked={deliveryMethod === option.value}
                      onChange={() => setDeliveryMethod(option.value)}
                      className="mt-1.5 h-4 w-4 accent-burgundy-700"
                    />
                    <span className="space-y-1">
                      <span className="block font-medium text-ink-900">{DELIVERY_LABELS[option.value]}</span>
                      <span className="block text-sm leading-[1.8] text-ink-500">{option.description}</span>
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
            {deliveryMethod === 'courier' && subtotal < store.data.courierFreeThresholdToman && (
              <p className="text-sm text-ink-500">
                برای سفارش‌های بالای {formatToman(store.data.courierFreeThresholdToman)} ارسال با پیک رایگان است.
              </p>
            )}
            {deliveryMethod === 'courier' && (
              <DeliverySlotPicker value={deliverySlot} onChange={setDeliverySlot} />
            )}
          </section>

          <section className="space-y-6 rounded-3xl border border-ivory-300 bg-ivory-50 p-6 shadow-soft md:p-8">
            <h2 className="text-xl">روش پرداخت</h2>
            <fieldset className="grid gap-4 md:grid-cols-2">
              <legend className="sr-only">روش پرداخت</legend>
              <PaymentOptionCard
                name="payment-method"
                value="card"
                checked={paymentMethod === 'card'}
                disabled={!options.cardEnabled}
                onSelect={() => setPaymentChoice('card')}
                title="کارت به کارت"
                description={
                  options.cardEnabled
                    ? 'واریز مستقیم به حساب فروشگاه و ارسال تصویر فیش برای تأیید'
                    : 'این روش در حال حاضر فعال نیست'
                }
              />
              <PaymentOptionCard
                name="payment-method"
                value="online"
                checked={paymentMethod === 'online'}
                disabled={options.online.length === 0}
                onSelect={() => setPaymentChoice('online')}
                title="پرداخت آنلاین"
                description={
                  options.online.length === 0 ? 'درگاه پرداخت آنلاین در حال حاضر فعال نیست' : 'پرداخت لحظه‌ای با کارت بانکی یا خرید اقساطی'
                }
              />
            </fieldset>

            {paymentMethod === 'online' && options.online.length > 0 && (
              <div className="space-y-4">
                <p className="text-sm font-medium text-ink-900">انتخاب درگاه</p>
                <fieldset className="grid gap-3 sm:grid-cols-2">
                  <legend className="sr-only">انتخاب درگاه</legend>
                  {options.online.map((gateway) => (
                    <label
                      key={gateway.provider}
                      className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                        selectedProvider === gateway.provider
                          ? 'border-burgundy-700 bg-ivory-200/60'
                          : 'border-ivory-300 hover:border-gold-500'
                      }`}
                    >
                      <input
                        type="radio"
                        name="online-provider"
                        value={gateway.provider}
                        checked={selectedProvider === gateway.provider}
                        onChange={() => setProviderChoice(gateway.provider)}
                        className="mt-1 h-4 w-4 accent-burgundy-700"
                      />
                      <span className="space-y-1">
                        <span className="block font-medium text-ink-900">{gateway.label}</span>
                        <span className="block text-xs leading-[1.8] text-ink-500">
                          {ONLINE_PROVIDER_DETAILS[gateway.provider]}
                        </span>
                      </span>
                    </label>
                  ))}
                </fieldset>

                {selectedProvider === 'snapppay' && (
                  <fieldset className="grid gap-3 sm:grid-cols-2">
                    <legend className="sr-only">تعداد اقساط</legend>
                    <InstallmentOption
                      checked={installments === 1}
                      onSelect={() => setInstallmentChoice(1)}
                      title="پرداخت یک‌جا"
                      detail={formatToman(total)}
                    />
                    <InstallmentOption
                      checked={installments === 4}
                      onSelect={() => setInstallmentChoice(4)}
                      title="۴ قسط ماهانه"
                      detail={`هر قسط ${formatToman(Math.ceil(total / 4))}`}
                    />
                  </fieldset>
                )}
              </div>
            )}
          </section>
        </div>

        <aside className="h-fit space-y-6 rounded-3xl border border-ivory-300 bg-ivory-50 p-6 shadow-soft lg:sticky lg:top-28 md:p-8">
          <h2 className="text-xl">خلاصه سفارش</h2>

          <ul className="max-h-64 space-y-3 overflow-y-auto text-sm">
            {details.lines.map(({ line, product, variantLabel, quantity, lineTotal }) => (
              <li key={`${line.productId}-${line.variantId}`} className="flex justify-between gap-4">
                <span className="text-ink-700">
                  {product.name}
                  {variantLabel ? ` (${variantLabel})` : ''} × {quantity.toLocaleString('fa-IR')}
                </span>
                <span className="shrink-0 font-medium">{formatToman(lineTotal)}</span>
              </li>
            ))}
          </ul>

          <dl className="space-y-3 border-t border-ivory-300 pt-5 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-700">جمع اقلام</dt>
              <dd>{formatToman(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-700">هزینه ارسال</dt>
              <dd>{deliveryFee === 0 ? 'رایگان' : formatToman(deliveryFee)}</dd>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-success-600">
                <dt>تخفیف کد {promo.appliedCoupon?.code}</dt>
                <dd>-{formatToman(discount)}</dd>
              </div>
            )}
            {promo.selectedSample && (
              <div className="flex justify-between text-success-600">
                <dt>نمونه هدیه</dt>
                <dd>{promo.selectedSample.title}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-ivory-300 pt-4 text-base">
              <dt className="font-medium">مبلغ قابل پرداخت</dt>
              <dd className="font-bold">{formatToman(total)}</dd>
            </div>
          </dl>

          {details.unavailableCount > 0 && (
            <p role="alert" className="rounded-xl bg-warning-100 px-4 py-3 text-sm text-warning-600">
              برخی محصولات سبد شما دیگر در دسترس نیستند. لطفاً <Link to="/cart" className="font-medium underline">سبد خرید</Link> را بررسی کنید.
            </p>
          )}

          {promo.couponErrorMessage && (
            <p role="alert" className="rounded-xl bg-warning-100 px-4 py-3 text-sm text-warning-600">
              {promo.couponErrorMessage} کد تخفیف را از <Link to="/cart" className="font-medium underline">سبد خرید</Link> حذف کنید.
            </p>
          )}

          {submitError && (
            <p role="alert" className="rounded-xl bg-error-100 px-4 py-3 text-sm text-error-600">
              {submitError}
            </p>
          )}

          <button type="button" onClick={() => void handleSubmit()} disabled={!canSubmit} className="btn-primary w-full">
            {submitting ? 'در حال ثبت سفارش...' : paymentMethod === 'online' ? 'ثبت سفارش و پرداخت آنلاین' : 'ثبت سفارش'}
          </button>
          <p className="text-xs leading-[1.8] text-ink-500">
            مبلغ نهایی بر اساس قیمت‌های لحظه ثبت سفارش محاسبه می‌شود.
          </p>
        </aside>
      </div>
    </div>
  );
}

function PaymentOptionCard({
  name,
  value,
  checked,
  disabled,
  onSelect,
  title,
  description,
}: {
  name: string;
  value: PaymentMethod;
  checked: boolean;
  disabled: boolean;
  onSelect: () => void;
  title: string;
  description: string;
}) {
  return (
    <label
      className={`rounded-2xl border p-5 transition ${
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
      } ${checked ? 'border-burgundy-700 bg-ivory-200/60 shadow-soft' : 'border-ivory-300 hover:border-gold-500'}`}
    >
      <span className="flex items-start gap-3">
        <input
          type="radio"
          name={name}
          value={value}
          checked={checked}
          disabled={disabled}
          onChange={onSelect}
          className="mt-1.5 h-4 w-4 accent-burgundy-700"
        />
        <span className="space-y-1">
          <span className="block font-medium text-ink-900">{title}</span>
          <span className="block text-sm leading-[1.8] text-ink-500">{description}</span>
        </span>
      </span>
    </label>
  );
}

function InstallmentOption({
  checked,
  onSelect,
  title,
  detail,
}: {
  checked: boolean;
  onSelect: () => void;
  title: string;
  detail: string;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
        checked ? 'border-burgundy-700 bg-ivory-200/60' : 'border-ivory-300 hover:border-gold-500'
      }`}
    >
      <input
        type="radio"
        name="snapppay-installments"
        checked={checked}
        onChange={onSelect}
        className="mt-1 h-4 w-4 accent-burgundy-700"
      />
      <span className="space-y-1">
        <span className="block font-medium text-ink-900">{title}</span>
        <span className="block text-xs text-ink-500">{detail}</span>
      </span>
    </label>
  );
}
