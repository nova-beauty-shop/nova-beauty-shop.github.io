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
  const [settings, gateways, rawPayRes, rawStoreRes] = await Promise.all([
    fetchPaymentSettings(),
    fetchPaymentGateways(),
    supabase.from("payment_settings").select("*").maybeSingle(),
    supabase.from("store_settings").select("*").maybeSingle(),
  ]);
  const merged: Record<string, any> = { ...(rawStoreRes?.data || {}), ...(rawPayRes?.data || {}), ...(settings || {}) };
  return {
    cardEnabled: settings?.cardPaymentEnabled === true && String(settings?.cardNumber || merged.card_number || "").length > 0,
    settings: merged,
    online: gateways.filter(g => Object.keys(ONLINE_PROVIDER_DETAILS).includes(g.provider)),
  };
}

function extractBankDetails(s: Record<string, any>, st: Record<string, any>) {
  const all: Record<string, any> = { ...(st || {}), ...(s || {}) };
  const pick = (keys: string[], regex?: RegExp) => {
    for (const k of keys) {
      if (typeof all[k] === "string" && all[k].trim().length > 0) return all[k].trim();
    }
    if (regex) {
      for (const [k, v] of Object.entries(all)) {
        if (regex.test(k) && typeof v === "string" && v.trim().length > 0) return v.trim();
      }
    }
    return "";
  };
  const bankName = pick(["bankName", "bank_name", "cardBank", "card_bank", "bank"], /bank/i) || "بلو بانک";
  const rawCard = pick(["cardNumber", "card_number", "pan", "card"], /card.*num|pan/i);
  const digits = rawCard.split("").filter(c => c >= "0" && c <= "9").join("");
  const formattedCard = (digits.match(/.{1,4}/g) || []).join(" ") || rawCard || "---- ---- ---- ----";
  const accountOwner = pick([
    "cardHolder", "card_holder", "cardHolderName", "card_holder_name",
    "holderName", "holder_name", "accountOwner", "account_owner",
    "accountHolder", "account_holder", "ownerName", "owner_name",
    "cardOwner", "card_owner", "accountName", "account_name", "cardName", "card_name", "holder", "owner"
  ], /holder|owner/i);
  let shabaNumber = pick([
    "shebaNumber", "sheba_number", "shabaNumber", "shaba_number",
    "iban", "ibanNumber", "iban_number", "sheba", "shaba",
    "cardSheba", "card_sheba", "cardShaba", "card_shaba", "cardIban", "card_iban"
  ], /sh[ae]ba|iban/i);
  if (shabaNumber && !shabaNumber.toUpperCase().startsWith("IR")) {
    shabaNumber = "IR" + shabaNumber;
  }
  return { bankName, rawCard: digits || rawCard, formattedCard, accountOwner, shabaNumber };
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
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [payerName, setPayerName] = useState("");
  const [cardLast4, setCardLast4] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (cart.length === 0) return <div data-build="1794497213141" className="container-nova py-12"><EmptyState title="سبد خرید شما خالی است" description="محصولی به سبد خرید اضافه کنید." action={<Link to="/shop" className="btn-primary">فروشگاه</Link>} /></div>;
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

  const bankInfo = extractBankDetails(options.settings || {}, store.data as any || {});

  function handleFile(e: any) {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    const reader = new FileReader();
    reader.onload = ev => setReceiptBase64(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function copyToClipboard(text: string, label: string) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true); setSubmitError(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data: newAddr, error: addrErr } = await supabase.from("addresses").insert({ recipient_name: recipientName.trim(), phone: normalizeDigits(phone.trim()), province: province.trim(), city: city.trim(), street: street.trim(), postal_code: normalizeDigits(postalCode.trim()), user_id: userData.user?.id }).select("id").single();
      if (addrErr || !newAddr) throw new Error("خطا در ثبت آدرس");

      const orderId = await placeOrder({ addressId: newAddr.id, deliveryMethod: "post", deliverySlot: null, items: details.lines.map(({ line, quantity }) => ({ productId: line.productId, variantId: line.variantId, quantity })), couponCode: promo.appliedCoupon?.code ?? null, freeSampleId: promo.selectedSample?.id ?? null, idempotencyKey: crypto.randomUUID() });

      if (paymentMethod === "card" && receiptBase64) {
        const fileToUpload = receiptFile || await (await fetch(receiptBase64)).blob();
        const mimeType = fileToUpload.type || "image/jpeg";
        const ext = mimeType.split("/")[1] || "jpg";
        const path = orderId + "-" + Date.now() + "." + ext;
        const { error: uploadError } = await supabase.storage.from("receipts").upload(path, fileToUpload, { contentType: mimeType, upsert: true });
        if (uploadError) throw new Error("آپلود فیش با خطا مواجه شد.");
        await supabase.from("payment_receipts").insert({ order_id: orderId, amount_toman: total, payer_name: payerName, card_last4: cardLast4, tracking_code: trackingCode, storage_path: path, status: "pending" });
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
              <div className="mt-6 rounded-2xl border border-ivory-300 bg-white p-4 sm:p-6 shadow-soft">
                <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-burgundy-800"><CreditCard className="h-5 w-5" /> اطلاعات کارت بانکی فروشگاه</h3>
                <p className="mb-4 text-xs sm:text-sm leading-relaxed text-ink-700">مبلغ نهایی <b className="text-burgundy-800">{formatToman(total)}</b> را به کارت زیر واریز نمایید و سپس تصویر رسید را بارگذاری کنید.</p>

                <div className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-zinc-900 p-4 sm:p-6 text-white shadow-xl border border-white/10">
                  <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
                      <span className="text-xs text-white/70">نام بانک:</span>
                      <span className="text-sm sm:text-base font-bold text-white">{bankInfo.bankName}</span>
                    </div>
                    <div className="h-6 w-9 rounded-md bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-600 opacity-90 shadow-inner" />
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center justify-between text-[11px] text-white/70 mb-1.5">
                      <span>شماره کارت ۱۶ رقمی:</span>
                      <span>برای کپی روی شماره بزنید</span>
                    </div>
                    <div role="button" tabIndex={0} onClick={() => copyToClipboard(bankInfo.rawCard, "شماره کارت کپی شد")} className="w-full cursor-pointer flex items-center justify-between gap-1.5 rounded-xl bg-white/10 hover:bg-white/15 active:bg-white/20 px-2.5 py-2.5 transition border border-white/15">
                      <span className="flex items-center gap-1 rounded-lg bg-amber-400/20 text-amber-300 px-2 py-1 text-[10px] font-bold shrink-0"><Copy className="h-3 w-3" /> کپی</span>
                      <span dir="ltr" style={{ fontSize: "12px", letterSpacing: "0.5px" }} className="font-mono sm:!text-lg font-bold text-white whitespace-nowrap text-center flex-1">{bankInfo.formattedCard}</span>
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-2 border-t border-white/10 text-xs sm:text-sm">
                    <div className="flex items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2.5">
                      <span className="text-white/75 shrink-0">نام صاحب کارت:</span>
                      <span className="font-bold text-amber-300 text-sm sm:text-base text-end">{bankInfo.accountOwner || "فروشگاه نُوا"}</span>
                    </div>
                    {bankInfo.shabaNumber && (
                      <div className="rounded-xl bg-white/5 px-3 py-2.5 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-white/75 text-xs">شماره شبا:</span>
                          <button type="button" onClick={() => copyToClipboard(bankInfo.shabaNumber, "شماره شبا کپی شد")} className="inline-flex items-center gap-1 rounded-md bg-white/10 hover:bg-white/20 px-2 py-0.5 text-[11px] text-amber-300 transition"><Copy className="h-3 w-3" /> کپی شبا</button>
                        </div>
                        <div dir="ltr" className="font-mono text-[11px] sm:text-[13px] font-medium tracking-wider text-white/95 text-center whitespace-nowrap overflow-x-auto py-0.5">{bankInfo.shabaNumber}</div>
                      </div>
                    )}
                  </div>
                </div>

                {copied && <p className="mb-4 rounded-xl bg-success-100 py-2 text-xs font-bold text-success-600 text-center">✓ {copied}</p>}
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