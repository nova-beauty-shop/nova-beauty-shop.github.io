import { useState } from "react";
import { CreditCard, Copy, Truck, UploadCloud, FileCheck } from "lucide-react";
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
import { supabase } from "@/lib/supabase";
import { normalizeDigits } from "@/lib/digits";

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
    cardEnabled: settings?.cardPaymentEnabled === true && (settings.cardNumber?.length > 0 || settings.card_number?.length > 0),
    settings,
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
  
  // New unified address form states
  const [recipientName, setRecipientName] = useState("");
  const [phone, setPhone] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [street, setStreet] = useState("");
  const [postalCode, setPostalCode] = useState("");

  const [paymentChoice, setPaymentChoice] = useState<PaymentMethod | null>(null);
  const [providerChoice, setProviderChoice] = useState<string | null>(null);
  const [installmentChoice, setInstallmentChoice] = useState<Installments>(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [receiptBase64, setReceiptBase64] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [payerName, setPayerName] = useState("");
  const [cardLast4, setCardLast4] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [copied, setCopied] = useState(false);

  if (cart.length === 0) return <div className="container-nova py-12"><EmptyState title="سبد خرید شما خالی است" description="محصولی به سبد خرید اضافه کنید." action={<Link to="/shop" className="btn-primary">فروشگاه</Link>} /></div>;
  if (details.error || store.error || paymentOptions.error) return <div className="container-nova py-12"><ErrorState onRetry={store.retry} /></div>;
  if (details.loading || !store.data || !paymentOptions.data) return <div className="container-nova py-12"><SkeletonGrid count={2} /></div>;

  const options = paymentOptions.data;
  const paymentMethod: PaymentMethod = paymentChoice ?? (options.cardEnabled ? "card" : "online");
  const selectedProvider = providerChoice ?? options.online[0]?.provider ?? null;
  
  const addressId = selectedAddressId ?? addresses.data?.[0]?.id ?? null;
  const selectedAddress = addresses.data?.find((a) => a.id === addressId) ?? null;
  const subtotal = details.subtotal;
  const totalItemCount = details.lines.reduce((acc, item) => acc + item.quantity, 0);
  
  const shippingQuote = calculateDynamicShipping({ province: selectedAddress?.province || province, city: selectedAddress?.city || city, subtotalToman: subtotal, itemCount: totalItemCount, settings: store.data });
  const deliveryFee = (selectedAddress || (province && city)) ? shippingQuote.feeToman : 0;
  const discount = promo.discount;
  const total = Math.max(0, subtotal - discount + deliveryFee);
  
  const paymentReady = paymentMethod === "card" ? options.cardEnabled : selectedProvider !== null;
  const isNewAddressValid = recipientName.trim().length > 2 && phone.trim().length === 11 && province.trim().length > 1 && city.trim().length > 1 && street.trim().length > 5;
  const addressReady = addressId !== null || isNewAddressValid;
  const cardFormValid = receiptFile !== null;
  const canSubmit = !submitting && addressReady && details.unavailableCount === 0 && details.lines.length > 0 && paymentReady && !promo.couponErrorMessage && (paymentMethod === "online" || cardFormValid);

  function handleFile(e: any) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.includes("image/")) {
      setSubmitError("لطفاً فقط فایل عکس انتخاب کنید.");
      return;
    }
    setSubmitError(null);
    setReceiptFile(file);
    const reader = new FileReader();
    reader.onload = ev => setReceiptBase64(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true); setSubmitError(null);
    try {
      let finalAddressId = addressId;
      if (!finalAddressId) {
        const { data: userData } = await supabase.auth.getUser();
        const { data: newAddr, error: addrErr } = await supabase.from("addresses").insert({ recipient_name: recipientName.trim(), phone: normalizeDigits(phone.trim()), province: province.trim(), city: city.trim(), street: street.trim(), postal_code: normalizeDigits(postalCode.trim()), user_id: userData.user?.id }).select("id").single();
        if (addrErr || !newAddr) throw new Error("خطا در ثبت آدرس");
        finalAddressId = newAddr.id;
      }

      const orderId = await placeOrder({ addressId: finalAddressId, deliveryMethod: "post", deliverySlot: null, items: details.lines.map(({ line, quantity }) => ({ productId: line.productId, variantId: line.variantId, quantity })), couponCode: promo.appliedCoupon?.code ?? null, freeSampleId: promo.selectedSample?.id ?? null, idempotencyKey: crypto.randomUUID() });

      if (paymentMethod === "card" && receiptFile) {
        const ext = receiptFile.name.split(".").pop() || "jpg";
        const fileName = orderId + "-" + Date.now() + "." + ext;
        const { error: uploadError } = await supabase.storage.from("payment-receipts").upload(fileName, receiptFile, { contentType: receiptFile.type, upsert: true });
        if (uploadError) throw new Error("آپلود فیش در سرور رد شد (" + uploadError.message + ")");
        await supabase.from("payment_receipts").insert({ order_id: orderId, amount_toman: total, payer_name: payerName, card_last4: cardLast4, tracking_code: trackingCode, storage_path: fileName, status: "pending" });
      } else if (selectedProvider) {
        await startOnlinePayment(orderId, selectedProvider, 1); return;
      }
      clearCart(); navigate("/account/orders?success=true", { replace: true });
    } catch (err: any) {
      setSubmitError(err.message || orderErrorMessage(err instanceof OrderError ? err.code : ""));
      setSubmitting(false);
    }
  }

  return (
    <div className="container-nova overflow-x-hidden py-6 sm:py-10 md:py-16">
      <h1 className="mb-5 text-2xl sm:mb-8 sm:text-3xl md:text-4xl">تکمیل و ثبت نهایی سفارش</h1>
      <div className="grid min-w-0 gap-5 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-5 sm:space-y-8">
          <section className="min-w-0 space-y-4 rounded-2xl border border-ivory-300 bg-ivory-50 p-4 shadow-soft sm:space-y-6 sm:rounded-3xl sm:p-6 md:p-8">
            <h2 className="text-base sm:text-xl">۱. نشانی گیرنده</h2>
            {!addresses.data?.length ? (
              <div className="space-y-4">
                <input type="text" placeholder="نام گیرنده" value={recipientName} onChange={e => setRecipientName(e.target.value)} className="input-nova w-full" />
                <input type="tel" placeholder="شماره تماس" value={phone} onChange={e => setPhone(e.target.value)} className="input-nova w-full" />
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="استان" value={province} onChange={e => setProvince(e.target.value)} className="input-nova w-full" />
                  <input type="text" placeholder="شهر" value={city} onChange={e => setCity(e.target.value)} className="input-nova w-full" />
                </div>
                <textarea placeholder="آدرس دقیق پستی" value={street} onChange={e => setStreet(e.target.value)} rows={3} className="input-nova w-full resize-none" />
                <input type="text" placeholder="کد پستی (اختیاری)" value={postalCode} onChange={e => setPostalCode(e.target.value)} className="input-nova w-full" />
              </div>
            ) : (
              <AddressPicker addresses={addresses.data} loading={addresses.loading} error={addresses.error} selectedId={addressId} onSelect={setSelectedAddressId} onRetry={addresses.retry} />
            )}
          </section>

          <section className="min-w-0 space-y-4 rounded-2xl border border-ivory-300 bg-ivory-50 p-4 shadow-soft sm:space-y-6 sm:rounded-3xl sm:p-6 md:p-8">
            <h2 className="text-base sm:text-xl">۲. روش پرداخت</h2>
            <div className="space-y-3 sm:space-y-4">
              {options.cardEnabled && <PaymentOptionCard name="payment-method" value="card" checked={paymentMethod === "card"} disabled={false} onSelect={() => setPaymentChoice("card")} title="کارت به کارت" description="واریز به حساب فروشگاه و آپلود فیش" />}
            </div>
            {paymentMethod === "card" && (
              <div className="mt-6 rounded-2xl border border-ivory-300 bg-white p-4 sm:p-6 shadow-sm">
                <div className="mb-6 flex items-center gap-2 border-b border-ivory-300 pb-4"><CreditCard className="h-5 w-5 text-burgundy-700" /><h3 className="font-bold text-ink-900">اطلاعات کارت بانکی فروشگاه</h3></div>
                
                <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-black p-5 sm:p-6 text-white shadow-xl">
                  {(() => {
                    const s = options.settings || {};
                    const st = store.data || {};
                    const bankName = s.bankName || s.bank_name || st.bankName || st.bank_name || "نام بانک";
                    const cardNumber = s.cardNumber || s.card_number || st.cardNumber || st.card_number || "";
                    const formattedCard = cardNumber.replace(/D/g, "").replace(/(.{4})(?!$)/g, "$1 ") || "---- ---- ---- ----";
                    const accountOwner = s.accountOwner || s.account_owner || st.accountOwner || st.account_owner || "ثبت نشده";
                    const shabaNumber = s.shabaNumber || s.shaba_number || st.shabaNumber || st.shaba_number || "IR...";

                    return (
                      <>
                        <div className="flex justify-between items-center mb-6">
                          <span className="text-sm sm:text-base font-bold opacity-90 drop-shadow-md">{bankName}</span>
                          <CreditCard className="h-6 w-6 opacity-50" />
                        </div>
                        <div className="mb-6 flex flex-row items-center justify-between gap-2">
                          <span dir="ltr" className="font-mono text-[16px] sm:text-[22px] font-bold tracking-widest drop-shadow-md break-words">{formattedCard}</span>
                          <button type="button" onClick={() => copyToClipboard(cardNumber)} className="shrink-0 flex items-center justify-center rounded-lg bg-white/15 p-2 hover:bg-white/25 transition"><Copy className="h-4 w-4 sm:h-5 sm:w-5" /></button>
                        </div>
                        <div className="flex flex-col gap-4 border-t border-white/15 pt-4 text-[13px] sm:text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="opacity-75 shrink-0">صاحب حساب:</span>
                            <span className="font-bold text-end break-words">{accountOwner}</span>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <span className="opacity-75 shrink-0">شماره شبا:</span>
                            <div className="flex items-center justify-between sm:justify-end gap-2 bg-white/10 rounded-lg p-2 sm:p-0 sm:bg-transparent">
                              <span dir="ltr" className="font-mono text-[12px] sm:text-[14px] opacity-90 break-all">{shabaNumber}</span>
                              <button type="button" onClick={() => copyToClipboard(shabaNumber)} className="shrink-0 rounded bg-white/15 p-1.5 sm:p-2 hover:bg-white/25 transition"><Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></button>
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm font-bold text-ink-700">نام صاحب حسابی که از آن واریز کردید<input type="text" value={payerName} onChange={e => setPayerName(e.target.value)} className="input-nova mt-1.5 w-full" placeholder="مثلاً مریم حسینی" /></label>
                    <label className="block text-sm font-bold text-ink-700">۴ رقم آخر کارت شما<input type="text" dir="ltr" maxLength={4} value={cardLast4} onChange={e => setCardLast4(e.target.value.replace(/D/g, ""))} className="input-nova mt-1.5 w-full text-right" placeholder="1234" /></label>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-ink-700 mb-2">تصویر فیش واریزی (الزامی برای باز شدن ثبت نهایی)</label>
                    <div className="flex items-center gap-4">
                      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ivory-300 bg-ivory-50 px-6 py-8 transition hover:border-gold-500 hover:bg-ivory-100 flex-1">
                        {receiptBase64 ? <FileCheck className="h-8 w-8 text-success-600" /> : <UploadCloud className="h-8 w-8 text-ink-400" />}
                        <span className="text-sm font-bold text-ink-700">{receiptBase64 ? "فیش انتخاب شد" : "انتخاب عکس فیش"}</span>
                        <input type="file" accept="image/jpeg, image/png, image/webp" onChange={handleFile} className="hidden" />
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
          <h2 className="text-base sm:text-xl">۳. فاکتور نهایی</h2>
          <ul className="max-h-60 divide-y divide-ivory-300 overflow-y-auto text-sm">
            {details.lines.map(({ key, product, quantity, lineTotal }) => (
              <li key={key} className="flex justify-between gap-3 py-3"><span className="text-ink-700">{product.name} × {quantity}</span><span className="shrink-0 font-medium">{formatToman(lineTotal)}</span></li>
            ))}
          </ul>
          <dl className="space-y-3 border-t border-ivory-300 pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-ink-700">جمع کالاها</dt><dd>{formatToman(subtotal)}</dd></div>
            <div className="flex items-start justify-between gap-2"><dt className="text-ink-700">کرایه پستی (از مشهد)</dt><dd className="text-end font-medium">{!(selectedAddress || (province && city)) ? <span className="text-xs text-ink-500">پس از انتخاب نشانی</span> : shippingQuote.isFree ? <span className="font-bold text-success-600">رایگان</span> : formatToman(deliveryFee)}</dd></div>
            <div className="flex justify-between border-t border-ivory-300 pt-4 text-base"><dt className="font-bold">قابل واریز</dt><dd className="font-bold text-burgundy-800">{formatToman(total)}</dd></div>
          </dl>
          {submitError && <p className="rounded-xl bg-error-100 px-4 py-3 text-sm font-bold text-error-600">{submitError}</p>}
          <button type="button" onClick={() => void handleSubmit()} disabled={!canSubmit} className="btn-primary w-full">{submitting ? "در حال ثبت نهایی..." : "تأیید و ثبت نهایی سفارش"}</button>
        </aside>
      </div>
    </div>
  );
}

function PaymentOptionCard({ name, value, checked, disabled, onSelect, title, description }: { name: string; value: PaymentMethod; checked: boolean; disabled: boolean; onSelect: () => void; title: string; description: string }) {
  return (
    <label className={`rounded-xl border p-3.5 transition sm:rounded-2xl sm:p-5 ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"} ${checked ? "border-burgundy-700 bg-ivory-200/60 shadow-soft" : "border-ivory-300 hover:border-gold-500"}`}>
      <span className="flex items-start gap-3"><input type="radio" name={name} value={value} checked={checked} disabled={disabled} onChange={onSelect} className="mt-1.5 h-4 w-4 accent-burgundy-700" /><span className="space-y-1"><span className="block font-bold text-ink-900">{title}</span><span className="block text-xs leading-relaxed text-ink-500">{description}</span></span></span>
    </label>
  );
}
