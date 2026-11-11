import { useState, useEffect } from "react";
import { CheckCircle2, Truck, UploadCloud, CreditCard, Copy, FileCheck } from "lucide-react";
import RequireAuth from "@/components/account/RequireAuth";
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
import { calculateDynamicShipping, IRAN_PROVINCES } from "@/lib/storeSettings";
import { supabase } from "@/lib/supabase";
import { normalizeDigits } from "@/lib/digits";

const ONLINE_PROVIDER_DETAILS: Record<string, string> = { zarinpal: "پرداخت امن شتاب", sep: "درگاه سامان", mellat: "درگاه ملت", snapppay: "اقساط اسنپ‌پی" };
type PaymentMethod = "card" | "online";

async function loadPaymentOptions() {
  const [settings, gateways] = await Promise.all([fetchPaymentSettings(), fetchPaymentGateways()]);
  return { cardEnabled: settings?.cardPaymentEnabled === true && settings.cardNumber.length > 0, settings, online: gateways.filter(g => Object.keys(ONLINE_PROVIDER_DETAILS).includes(g.provider)) };
}

export default function CheckoutPage() { return <RequireAuth>{() => <CheckoutContent />}</RequireAuth>; }

function CheckoutContent() {
  const { cart, clearCart } = useShop();
  const details = useCartDetails(cart);
  const promo = usePromotionPreview(details.subtotal);
  const addresses = useAsync(fetchAddresses, []);
  const store = useStoreSettings();
  const paymentOptions = useAsync(loadPaymentOptions, []);

  const [recipientName, setRecipientName] = useState("");
  const [phone, setPhone] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [street, setStreet] = useState("");
  const [postalCode, setPostalCode] = useState("");

  useEffect(() => {
    if (addresses.data && addresses.data.length > 0 && !province) {
      const a = addresses.data[0];
      setRecipientName(a.recipientName); setPhone(a.phone); setProvince(a.province);
      setCity(a.city); setStreet(a.street); setPostalCode(a.postalCode);
    }
  }, [addresses.data]);

  const [paymentChoice, setPaymentChoice] = useState<PaymentMethod | null>(null);
  const [providerChoice, setProviderChoice] = useState<string | null>(null);
  const [receiptBase64, setReceiptBase64] = useState<string | null>(null);
  const [payerName, setPayerName] = useState("");
  const [cardLast4, setCardLast4] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (cart.length === 0) return <div className="container-nova py-12"><EmptyState title="سبد خرید شما خالی است" description="محصولی به سبد خرید اضافه کنید." action={<Link to="/shop" className="btn-primary">فروشگاه</Link>} /></div>;
  if (details.error || store.error || paymentOptions.error) return <div className="container-nova py-12"><ErrorState onRetry={store.retry} /></div>;
  if (details.loading || !store.data || !paymentOptions.data) return <div className="container-nova py-12"><SkeletonGrid count={2} /></div>;

  const options = paymentOptions.data;
  const paymentMethod = paymentChoice ?? (options.cardEnabled ? "card" : "online");
  const selectedProvider = providerChoice ?? options.online[0]?.provider ?? null;
  const subtotal = details.subtotal;
  const totalItemCount = details.lines.reduce((acc, item) => acc + item.quantity, 0);

  const shippingQuote = calculateDynamicShipping({ province, city, subtotalToman: subtotal, itemCount: totalItemCount, settings: store.data });
  const deliveryFee = province ? shippingQuote.feeToman : 0;
  const total = Math.max(0, subtotal - promo.discount + deliveryFee);

  const addrValid = recipientName.trim().length >= 2 && phone.trim().length >= 10 && province && city.trim().length >= 2 && street.trim().length >= 5 && postalCode.trim().length >= 5;
  const cardFormValid = receiptBase64 && payerName.trim().length >= 2 && cardLast4.trim().length === 4;
  const paymentReady = paymentMethod === "card" ? cardFormValid : selectedProvider !== null;
  const canSubmit = !submitting && details.lines.length > 0 && addrValid && paymentReady && !promo.couponErrorMessage;

  function handleFile(e: any) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setReceiptBase64(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function copyToClipboard(text: string) { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true); setSubmitError(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data: newAddr, error: addrErr } = await supabase.from("addresses").insert({ recipient_name: recipientName.trim(), phone: normalizeDigits(phone.trim()), province: province.trim(), city: city.trim(), street: street.trim(), postal_code: normalizeDigits(postalCode.trim()), user_id: userData.user?.id }).select("id").single();
      if (addrErr || !newAddr) throw new Error("خطا در ثبت آدرس");

      const orderId = await placeOrder({ addressId: newAddr.id, deliveryMethod: "post", deliverySlot: null, items: details.lines.map(({ line, quantity }) => ({ productId: line.productId, variantId: line.variantId, quantity })), couponCode: promo.appliedCoupon?.code ?? null, freeSampleId: promo.selectedSample?.id ?? null, idempotencyKey: crypto.randomUUID() });

      if (paymentMethod === "card" && receiptBase64) {
        const fetchRes = await fetch(receiptBase64);
        const blob = await fetchRes.blob();
        const ext = blob.type.split("/")[1] || "png";
        const path = "receipts/" + orderId + "-" + Date.now() + "." + ext;
        await supabase.storage.from("receipts").upload(path, blob);
        await supabase.from("payment_receipts").insert({ order_id: orderId, amount_toman: total, payer_name: payerName, card_last4: cardLast4, tracking_code: trackingCode, storage_path: path, status: "pending" });
      } else if (selectedProvider) {
        await startOnlinePayment(orderId, selectedProvider, 1); return;
      }
      clearCart(); navigate("/account/orders/" + orderId, { replace: true });
    } catch (err: any) {
      setSubmitError(orderErrorMessage(err instanceof OrderError ? err.code : "") || err.message || "خطایی رخ داد.");
      setSubmitting(false);
    }
  }

  return (
    <div className="container-nova overflow-x-hidden py-6 sm:py-10 md:py-16">
      <h1 className="mb-5 text-2xl sm:mb-8 sm:text-3xl md:text-4xl">تکمیل و ثبت نهایی سفارش</h1>
      <div className="grid min-w-0 gap-5 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-5 sm:space-y-8">
          <section className="min-w-0 space-y-4 rounded-2xl border border-ivory-300 bg-ivory-50 p-4 shadow-soft sm:space-y-6 sm:rounded-3xl sm:p-6 md:p-8">
            <h2 className="text-base sm:text-xl font-bold text-burgundy-900">۱. اطلاعات گیرنده و محاسبه هوشمند پستی</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div><label className="block text-xs font-bold text-ink-700 mb-1">نام و نام‌خانوادگی گیرنده</label><input type="text" value={recipientName} onChange={e=>setRecipientName(e.target.value)} className="field" /></div>
              <div><label className="block text-xs font-bold text-ink-700 mb-1">شماره موبایل</label><input type="tel" dir="ltr" maxLength={11} value={phone} onChange={e=>setPhone(e.target.value)} className="field text-start" placeholder="09..." /></div>
              <div><label className="block text-xs font-bold text-ink-700 mb-1">استان (مبدأ فروشگاه: مشهد)</label><select value={province} onChange={e=>{ setProvince(e.target.value); const f = IRAN_PROVINCES.find(p=>p.province===e.target.value); if(f) setCity(f.capital); }} className="field"><option value="">انتخاب استان...</option>{IRAN_PROVINCES.map(p => <option key={p.province} value={p.province}>{p.province}</option>)}</select></div>
              <div><label className="block text-xs font-bold text-ink-700 mb-1">شهر</label><input type="text" value={city} onChange={e=>setCity(e.target.value)} className="field" /></div>
              <div className="sm:col-span-2"><label className="block text-xs font-bold text-ink-700 mb-1">نشانی دقیق پستی</label><textarea rows={2} value={street} onChange={e=>setStreet(e.target.value)} className="field !h-auto py-2" placeholder="خیابان، کوچه، پلاک، واحد..." /></div>
              <div className="sm:col-span-2"><label className="block text-xs font-bold text-ink-700 mb-1">کد پستی (۱۰ رقمی)</label><input type="tel" dir="ltr" maxLength={10} value={postalCode} onChange={e=>setPostalCode(e.target.value)} className="field text-start sm:max-w-xs" /></div>
            </div>
            {province ? (
              <div className="mt-4 rounded-2xl border border-gold-500/50 bg-ivory-100/90 p-4 text-xs sm:text-sm">
                <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2.5"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-burgundy-700/10 text-burgundy-700"><Truck className="h-4 w-4" /></span><div><p className="font-bold text-ink-900">{shippingQuote.zoneLabel}</p><p className="mt-0.5 text-[11px] text-ink-500">{shippingQuote.breakdownLabel}</p></div></div><div className="text-end">{shippingQuote.freeThresholdToman > 0 && shippingQuote.isFree ? <span className="inline-flex items-center gap-1 rounded-full bg-success-100 px-3 py-1 text-xs font-bold text-success-600"><CheckCircle2 className="h-3.5 w-3.5" /> ارسال رایگان شد</span> : <span className="text-sm font-bold text-burgundy-800">{formatToman(shippingQuote.feeToman)}</span>}</div></div>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl bg-ivory-200/50 p-4 text-sm text-ink-500 text-center border border-dashed border-ivory-300">لطفاً استان خود را انتخاب کنید تا هزینه ارسال محاسبه شود.</div>
            )}
          </section>

          <section className="min-w-0 space-y-4 rounded-2xl border border-ivory-300 bg-ivory-50 p-4 shadow-soft sm:space-y-6 sm:rounded-3xl sm:p-6 md:p-8">
            <h2 className="text-base sm:text-xl font-bold text-burgundy-900">۲. واریز وجه و ارسال فیش</h2>
            <div className="grid min-w-0 gap-3 md:grid-cols-2">
              <PaymentOptionCard name="payment-method" value="card" checked={paymentMethod === "card"} disabled={!options.cardEnabled} onSelect={() => setPaymentChoice("card")} title="کارت به کارت" description={options.cardEnabled ? "واریز به حساب و آپلود عکس فیش" : "غیرفعال است"} />
              <PaymentOptionCard name="payment-method" value="online" checked={paymentMethod === "online"} disabled={options.online.length === 0} onSelect={() => setPaymentChoice("online")} title="پرداخت آنلاین" description={options.online.length > 0 ? "پرداخت از طریق درگاه بانکی" : "غیرفعال است"} />
            </div>
            {paymentMethod === "card" && (
              <div className="mt-6 rounded-2xl border border-ivory-300 bg-white p-5 shadow-soft">
                <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-burgundy-800"><CreditCard className="h-5 w-5" /> اطلاعات کارت بانکی فروشگاه</h3>
                <p className="mb-4 text-sm leading-relaxed text-ink-700">مبلغ نهایی <b className="text-burgundy-800">{formatToman(total)}</b> را به حساب زیر واریز نمایید و سپس عکس فیش را آپلود کنید.</p>
                <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-ink-800 to-ink-900 p-6 text-white shadow-lg">
                  <div className="flex justify-between items-start mb-6"><span className="text-sm font-bold opacity-80">{options.settings?.bankName || "بانک"}</span><CreditCard className="h-6 w-6 opacity-50" /></div>
                  <div className="mb-2 flex items-center justify-between">
                    <span dir="ltr" className="font-mono text-xl tracking-widest sm:text-2xl">{options.settings?.cardNumber}</span>
                    <button type="button" onClick={() => copyToClipboard(options.settings?.cardNumber || "")} className="rounded-lg bg-white/10 p-2 hover:bg-white/20 transition"><Copy className="h-4 w-4" /></button>
                  </div>
                  <div className="flex justify-between items-end text-xs opacity-80">
                    <span>صاحب حساب: {options.settings?.accountOwner}</span>
                    <div className="flex items-center gap-2">
                      <span dir="ltr" className="font-mono">{options.settings?.shabaNumber}</span>
                      <button type="button" onClick={() => copyToClipboard(options.settings?.shabaNumber || "")}><Copy className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                </div>
                {copied && <p className="mb-4 text-xs font-bold text-success-600 text-center">با موفقیت کپی شد!</p>}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><label className="block text-xs font-bold text-ink-700 mb-1">نام صاحب حسابی که از آن واریز کردید</label><input type="text" value={payerName} onChange={e=>setPayerName(e.target.value)} className="field" placeholder="مثلاً مریم حسینی" /></div>
                  <div><label className="block text-xs font-bold text-ink-700 mb-1">۴ رقم آخر کارت شما</label><input type="text" dir="ltr" maxLength={4} value={cardLast4} onChange={e=>setCardLast4(e.target.value)} className="field text-start" placeholder="1234" /></div>
                  <div className="sm:col-span-2 mt-2">
                    <label className="block text-[13px] font-bold text-burgundy-900 mb-2">آپلود تصویر فیش واریزی (الزامی برای باز شدن ثبت نهایی)</label>
                    <div className="flex items-center gap-4">
                      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ivory-300 bg-ivory-50 px-6 py-8 transition hover:border-gold-500 hover:bg-ivory-100 flex-1">
                        {receiptBase64 ? <FileCheck className="h-8 w-8 text-success-600" /> : <UploadCloud className="h-8 w-8 text-ink-400" />}
                        <span className="text-sm font-bold text-ink-700">{receiptBase64 ? "فیش انتخاب شد" : "اینجا کلیک کنید و عکس فیش را انتخاب کنید"}</span>
                        <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
                      </label>
                      {receiptBase64 && <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-ivory-300 shadow-sm"><img src={receiptBase64} alt="فیش" className="h-full w-full object-cover" /></div>}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
        <aside className="h-fit min-w-0 space-y-4 rounded-2xl border border-ivory-300 bg-ivory-50 p-4 shadow-soft sm:space-y-6 sm:rounded-3xl sm:p-6 md:p-8 lg:sticky lg:top-28">
          <h2 className="text-base sm:text-xl font-bold text-burgundy-900">۳. فاکتور نهایی</h2>
          <ul className="max-h-60 divide-y divide-ivory-300 overflow-y-auto text-sm">
            {details.lines.map(({ key, product, quantity, lineTotal }) => (
              <li key={key} className="flex justify-between gap-3 py-3"><span className="text-ink-700">{product.name} × {quantity}</span><span className="shrink-0 font-medium">{formatToman(lineTotal)}</span></li>
            ))}
          </ul>
          <dl className="space-y-3 border-t border-ivory-300 pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-ink-700">جمع کالاها</dt><dd>{formatToman(subtotal)}</dd></div>
            <div className="flex items-start justify-between gap-2"><dt className="text-ink-700">کرایه پستی (از مشهد)</dt><dd className="text-end font-medium">{!province ? <span className="text-[11px] text-ink-500">محاسبه پس از انتخاب استان</span> : shippingQuote.freeThresholdToman > 0 && shippingQuote.isFree ? <span className="font-bold text-success-600">رایگان</span> : formatToman(deliveryFee)}</dd></div>
            <div className="flex justify-between border-t border-ivory-300 pt-4 text-base"><dt className="font-bold">قابل واریز</dt><dd className="font-bold text-burgundy-800">{formatToman(total)}</dd></div>
          </dl>
          {submitError && <p className="rounded-xl bg-error-100 px-4 py-3 text-[13px] font-bold text-error-600">{submitError}</p>}
          <button type="button" onClick={() => void handleSubmit()} disabled={!canSubmit} className="btn-primary w-full h-12 text-sm mt-4">{submitting ? "در حال ثبت سفارش و فیش..." : !province ? "ابتدا استان را انتخاب کنید" : !addrValid ? "ابتدا فرم آدرس را کامل کنید" : !paymentReady ? "ابتدا عکس فیش را آپلود کنید" : "تأیید و ثبت نهایی سفارش"}</button>
        </aside>
      </div>
    </div>
  );
}

function PaymentOptionCard({ name, value, checked, disabled, onSelect, title, description }: { name: string; value: PaymentMethod; checked: boolean; disabled: boolean; onSelect: () => void; title: string; description: string }) {
  return (
    <label className={"rounded-xl border p-3.5 transition sm:rounded-2xl sm:p-5 " + (disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer") + (checked ? " border-burgundy-700 bg-ivory-200/60 shadow-soft" : " border-ivory-300 hover:border-gold-500")}>
      <span className="flex items-start gap-3"><input type="radio" name={name} value={value} checked={checked} disabled={disabled} onChange={onSelect} className="mt-1.5 h-4 w-4 accent-burgundy-700" /><span className="space-y-1"><span className="block font-bold text-ink-900">{title}</span><span className="block text-xs leading-relaxed text-ink-500">{description}</span></span></span>
    </label>
  );
}