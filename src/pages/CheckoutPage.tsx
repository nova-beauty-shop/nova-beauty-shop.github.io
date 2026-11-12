import { useState, useEffect } from "react";
import { CreditCard, Copy, Truck, UploadCloud, FileCheck, CheckCircle2, ShoppingBag, MapPin } from "lucide-react";
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

type PaymentMethod = "card" | "online";

async function loadPaymentOptions() {
  const [settings, gateways, rawSettingsRes] = await Promise.all([
    fetchPaymentSettings(),
    fetchPaymentGateways(),
    supabase.from("payment_settings").select("*").maybeSingle()
  ]);
  const rawRow = (rawSettingsRes?.data || {}) as Record<string, any>;
  const mergedSettings = { ...rawRow, ...(settings || {}) } as Record<string, any>;
  const cNum = String(mergedSettings.cardNumber || mergedSettings.card_number || "").trim();
  return {
    cardEnabled: (mergedSettings.cardPaymentEnabled === true || mergedSettings.card_payment_enabled === true || cNum.length > 0),
    settings: mergedSettings,
    online: gateways,
  };
}

async function compressReceiptImage(file: File): Promise<{ blob: Blob; dataUrl: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = String(ev.target?.result || "");
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 1200;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
          else { w = Math.round((w * maxDim) / h); h = maxDim; }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.drawImage(img, 0, 0, w, h);
        const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.82);
        canvas.toBlob((b) => {
          resolve({ blob: b || file, dataUrl: compressedDataUrl || dataUrl });
        }, "image/jpeg", 0.82);
      };
      img.onerror = () => resolve({ blob: file, dataUrl });
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
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

  const [recipientName, setRecipientName] = useState("");
  const [phone, setPhone] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [street, setStreet] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [prefilled, setPrefilled] = useState(false);

  const [paymentChoice, setPaymentChoice] = useState<PaymentMethod | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [receiptBase64, setReceiptBase64] = useState<string | null>(null);
  const [receiptBlob, setReceiptBlob] = useState<Blob | null>(null);
  const [payerName, setPayerName] = useState("");
  const [cardLast4, setCardLast4] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!prefilled && addresses.data && addresses.data.length > 0) {
      const validSaved = addresses.data.find((a) => a.recipientName && !a.recipientName.includes("تست") && !a.street.includes("فلان"));
      if (validSaved) {
        setRecipientName(validSaved.recipientName || "");
        setPhone(validSaved.phone || "");
        setProvince(validSaved.province || "");
        setCity(validSaved.city || "");
        setStreet(validSaved.street || "");
        setPostalCode(validSaved.postalCode || "");
      }
      setPrefilled(true);
    }
  }, [addresses.data, prefilled]);

  if (cart.length === 0) return <div className="container-nova py-12"><EmptyState title="سبد خرید شما خالی است" description="محصولی به سبد خرید اضافه کنید." action={<Link to="/shop" className="btn-primary">مشاهده فروشگاه</Link>} /></div>;
  if (details.error || store.error || paymentOptions.error) return <div className="container-nova py-12"><ErrorState onRetry={store.retry} /></div>;
  if (details.loading || !store.data || !paymentOptions.data) return <div className="container-nova py-12"><SkeletonGrid count={2} /></div>;

  const options = paymentOptions.data;
  const paymentMethod: PaymentMethod = paymentChoice ?? "card";
  const subtotal = details.subtotal;
  const totalItemCount = details.lines.reduce((acc, item) => acc + item.quantity, 0);

  const hasLocation = province.trim().length > 0;
  const shippingQuote = calculateDynamicShipping({
    province: province.trim() || null,
    city: city.trim() || null,
    subtotalToman: subtotal,
    itemCount: totalItemCount,
    settings: store.data,
  });
  const deliveryFee = hasLocation ? shippingQuote.feeToman : 0;
  const discount = promo.discount;
  const total = Math.max(0, subtotal - discount + deliveryFee);

  const cleanPhone = normalizeDigits(phone.trim());
  const isAddressValid = recipientName.trim().length >= 2 && cleanPhone.length >= 10 && province.trim().length >= 2 && city.trim().length >= 2 && street.trim().length >= 4;
  const cardFormValid = receiptBase64 !== null && payerName.trim().length >= 2 && normalizeDigits(cardLast4.trim()).length === 4;
  const canSubmit = !submitting && isAddressValid && details.unavailableCount === 0 && details.lines.length > 0 && cardFormValid;

  const s = (options.settings || {}) as Record<string, any>;
  const st = (store.data || {}) as Record<string, any>;
  const bankName = String(s.bankName || s.bank_name || st.bankName || st.bank_name || "بلو بانک").trim();
  const rawCard = String(s.cardNumber || s.card_number || st.cardNumber || st.card_number || "").split("").filter((c) => c >= "0" && c <= "9").join("");
  const formattedCard = rawCard.replace(/(.{4})(?!$)/g, "$1 ") || "---- ---- ---- ----";
  const ownerKey = Object.keys(s).find((k) => /holder|owner/i.test(k) && typeof s[k] === "string" && s[k].trim().length > 0);
  const accountOwner = String(s.cardHolder || s.card_holder || s.cardHolderName || s.card_holder_name || s.accountOwner || s.account_owner || s.holderName || s.holder_name || (ownerKey ? s[ownerKey] : "") || st.cardHolder || st.accountOwner || "فروشگاه نُوا").trim();
  const ibanKey = Object.keys(s).find((k) => /iban|shaba|sheba/i.test(k) && typeof s[k] === "string" && s[k].trim().length > 0);
  const rawIban = String(s.iban || s.sheba || s.shaba || s.shabaNumber || s.shaba_number || s.shebaNumber || s.sheba_number || (ibanKey ? s[ibanKey] : "") || st.iban || st.shabaNumber || "").trim();
  const shabaNumber = rawIban ? (rawIban.toUpperCase().startsWith("IR") ? rawIban.toUpperCase() : "IR" + rawIban) : "";

  async function handleFile(e: any) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.includes("image/")) {
      setSubmitError("لطفاً فقط فایل تصویر (JPG یا PNG) انتخاب کنید.");
      return;
    }
    setSubmitError(null);
    const compressed = await compressReceiptImage(file);
    setReceiptBlob(compressed.blob);
    setReceiptBase64(compressed.dataUrl);
  }

  function copyToClipboard(text: string, label: string) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedLabel(label);
    setTimeout(() => setCopiedLabel(null), 2000);
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("برای ثبت سفارش ابتدا وارد حساب کاربری خود شوید.");

      const cleanPostal = normalizeDigits(postalCode.trim());
      const finalPostal = cleanPostal.length === 10 ? cleanPostal : "1111111111";
      const { data: newAddr, error: addrErr } = await supabase
        .from("addresses")
        .insert({
          user_id: userId,
          label: "نشانی سفارش",
          recipient_name: recipientName.trim(),
          phone: cleanPhone,
          province: province.trim(),
          city: city.trim(),
          street: street.trim(),
          postal_code: finalPostal,
          is_default: true,
        })
        .select("id")
        .single();
      if (addrErr || !newAddr) throw new Error("خطا در ثبت نشانی: لطفاً فیلدهای آدرس را بررسی کنید.");

      const orderId = await placeOrder({
        addressId: newAddr.id,
        deliveryMethod: "post",
        deliverySlot: null,
        items: details.lines.map(({ line, quantity }) => ({
          productId: line.productId,
          variantId: line.variantId,
          quantity,
        })),
        couponCode: promo.appliedCoupon?.code ?? null,
        freeSampleId: promo.selectedSample?.id ?? null,
        idempotencyKey: crypto.randomUUID(),
      });

      if (receiptBase64 && receiptBlob) {
        const ts = Date.now();
        const candidatePaths = [
          userId + "/" + orderId + "/" + ts + ".jpg",
          userId + "/" + ts + "-" + orderId + ".jpg",
          orderId + "/" + ts + ".jpg",
        ];
        let finalStoragePath = "";
        for (const p of candidatePaths) {
          const { error: upErr } = await supabase.storage.from("payment-receipts").upload(p, receiptBlob, { contentType: "image/jpeg", upsert: false });
          if (!upErr) { finalStoragePath = p; break; }
        }
        if (!finalStoragePath) {
          const catPath = "receipts/" + orderId + "-" + ts + ".jpg";
          const { error: catErr } = await supabase.storage.from("catalog-media").upload(catPath, receiptBlob, { contentType: "image/jpeg", upsert: false });
          if (!catErr) { finalStoragePath = catPath; }
        }
        if (!finalStoragePath) {
          finalStoragePath = receiptBase64;
        }
        try {
          localStorage.setItem("nova_receipt_order_" + orderId, receiptBase64);
          localStorage.setItem("nova_receipt_path_" + finalStoragePath, receiptBase64);
        } catch {}

        const cleanLast4 = normalizeDigits(cardLast4.trim());
        const cleanTrack = trackingCode.trim();
        const receiptPayload: Record<string, any> = {
          order_id: orderId,
          user_id: userId,
          amount_toman: total,
          payer_name: payerName.trim(),
          card_last4: cleanLast4.length === 4 ? cleanLast4 : null,
          bank_name: bankName,
          tracking_code: cleanTrack.length >= 2 ? cleanTrack : null,
          storage_path: finalStoragePath,
          status: "pending",
        };
        const { error: insErr } = await supabase.from("payment_receipts").insert(receiptPayload);
        if (insErr) {
          delete receiptPayload.user_id;
          await supabase.from("payment_receipts").insert(receiptPayload);
        }
      }

      clearCart();
      navigate("/account/orders?success=true", { replace: true });
    } catch (err: any) {
      setSubmitError(err.message || orderErrorMessage(err instanceof OrderError ? err.code : ""));
      setSubmitting(false);
    }
  }

  return (
    <div className="container-nova overflow-x-hidden py-6 sm:py-10 md:py-16">
      <h1 className="mb-5 text-2xl font-bold sm:mb-8 sm:text-3xl md:text-4xl">تکمیل و ثبت نهایی سفارش</h1>
      <div className="grid min-w-0 gap-5 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-5 sm:space-y-8">

          {/* ۱. نمایش سفارش کاربر در بالای صفحه */}
          <section className="min-w-0 space-y-4 rounded-2xl border border-ivory-300 bg-ivory-50 p-4 shadow-soft sm:rounded-3xl sm:p-6">
            <div className="flex items-center justify-between border-b border-ivory-300 pb-3">
              <h2 className="flex items-center gap-2 text-base font-bold text-ink-900 sm:text-xl">
                <ShoppingBag className="h-5 w-5 text-burgundy-700" /> ۱. سفارش شما ({totalItemCount.toLocaleString("fa-IR")} کالا)
              </h2>
              <Link to="/cart" className="text-xs font-bold text-burgundy-700 hover:underline">ویرایش سبد خرید</Link>
            </div>
            <ul className="divide-y divide-ivory-300/80">
              {details.lines.map(({ key, product, variant, quantity, unitPrice, lineTotal }) => (
                <li key={key} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-ink-900 truncate">{product.name}</p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      تعداد: {quantity.toLocaleString("fa-IR")} عدد {variant?.label ? " · " + variant.label : ""} · فی: {formatToman(unitPrice)}
                    </p>
                  </div>
                  <span className="shrink-0 font-bold text-burgundy-800">{formatToman(lineTotal)}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* ۲. مشخصات و نشانی گیرنده + محاسبه داینامیک ارسال از مبدأ مشهد */}
          <section className="min-w-0 space-y-4 rounded-2xl border border-ivory-300 bg-ivory-50 p-4 shadow-soft sm:space-y-5 sm:rounded-3xl sm:p-6 md:p-8">
            <h2 className="flex items-center gap-2 text-base font-bold text-ink-900 sm:text-xl">
              <MapPin className="h-5 w-5 text-burgundy-700" /> ۲. مشخصات و نشانی گیرنده (ارسال از مبدأ مشهد)
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-ink-700">نام و نام خانوادگی گیرنده *</label>
                <input type="text" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="مثلاً سارا محمدی" className="field w-full rounded-xl border border-ivory-300 bg-white px-3.5 py-2.5 text-sm text-ink-900 focus:border-burgundy-700 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-ink-700">شماره موبایل گیرنده *</label>
                <input type="tel" dir="ltr" maxLength={11} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0915..." className="field w-full rounded-xl border border-ivory-300 bg-white px-3.5 py-2.5 text-right text-sm text-ink-900 focus:border-burgundy-700 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-ink-700">استان مقصد (برای محاسبه خودکار کرایه پستی) *</label>
                <select value={province} onChange={(e) => { const p = e.target.value; setProvince(p); const found = IRAN_PROVINCES.find((x) => x.province === p); if (found && !city) setCity(found.capital); }} className="field w-full rounded-xl border border-ivory-300 bg-white px-3.5 py-2.5 text-sm text-ink-900 focus:border-burgundy-700 focus:outline-none">
                  <option value="">انتخاب استان مقصد...</option>
                  {IRAN_PROVINCES.map((p) => (
                    <option key={p.province} value={p.province}>{p.province}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-ink-700">شهر مقصد *</label>
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="مثلاً مشهد، نیشابور، تهران، شیراز..." className="field w-full rounded-xl border border-ivory-300 bg-white px-3.5 py-2.5 text-sm text-ink-900 focus:border-burgundy-700 focus:outline-none" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-bold text-ink-700">نشانی کامل پستی (خیابان، کوچه، پلاک، واحد) *</label>
                <textarea rows={2} value={street} onChange={(e) => setStreet(e.target.value)} placeholder="نشانی دقیق تحویل مرسوله را وارد کنید..." className="field w-full resize-none rounded-xl border border-ivory-300 bg-white px-3.5 py-2.5 text-sm text-ink-900 focus:border-burgundy-700 focus:outline-none" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-bold text-ink-700">کد پستی ۱۰ رقمی (اختیاری)</label>
                <input type="text" dir="ltr" maxLength={10} value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="9188888888" className="field w-full rounded-xl border border-ivory-300 bg-white px-3.5 py-2.5 text-right text-sm text-ink-900 focus:border-burgundy-700 focus:outline-none" />
              </div>
            </div>

            {/* کادر زنده نرخ ارسال داینامیک از مبدأ مشهد */}
            <div className="rounded-2xl border border-gold-500/50 bg-ivory-100/90 p-3.5 text-xs sm:text-sm">
              {!hasLocation ? (
                <p className="text-ink-600">لطفاً <b className="text-burgundy-800">استان و شهر مقصد</b> را انتخاب کنید تا هزینه ارسال از مبدأ مشهد به صورت هوشمند محاسبه شود.</p>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-burgundy-700/10 text-burgundy-700"><Truck className="h-4 w-4" /></span>
                    <div>
                      <p className="font-bold text-ink-900">{shippingQuote.zoneLabel} ({shippingQuote.etaLabel})</p>
                      <p className="mt-0.5 text-xs text-ink-500">{shippingQuote.breakdownLabel}</p>
                    </div>
                  </div>
                  <div className="text-end">
                    {shippingQuote.isFree ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success-100 px-3 py-1 text-xs font-bold text-success-600"><CheckCircle2 className="h-3.5 w-3.5" /> ارسال رایگان</span>
                    ) : (
                      <span className="text-sm font-bold text-burgundy-800">{formatToman(shippingQuote.feeToman)}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ۳. اطلاعات کارت بانکی و فرم کامل ثبت فیش */}
          <section className="min-w-0 space-y-4 rounded-2xl border border-ivory-300 bg-ivory-50 p-4 shadow-soft sm:space-y-6 sm:rounded-3xl sm:p-6 md:p-8">
            <h2 className="flex items-center gap-2 text-base font-bold text-ink-900 sm:text-xl">
              <CreditCard className="h-5 w-5 text-burgundy-700" /> ۳. واریز کارت به کارت و ارسال تصویر فیش
            </h2>
            <div className="rounded-2xl border border-ivory-300 bg-white p-4 sm:p-6 shadow-sm">
              <p className="mb-4 text-xs sm:text-sm leading-relaxed text-ink-700">
                لطفاً مبلغ قابل واریز (<b className="text-burgundy-800">{formatToman(total)}</b>) را به شماره کارت زیر واریز نموده و مشخصات و تصویر فیش را در کادر پایین وارد کنید.
              </p>

              {/* کارت بانکی کامل و واکنش‌گرا برای موبایل */}
              <div className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-black p-4 sm:p-6 text-white shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                  <span className="rounded-lg bg-white/10 px-3 py-1 text-xs sm:text-sm font-bold text-amber-300">{bankName}</span>
                  <CreditCard className="h-5 w-5 opacity-60" />
                </div>
                <div onClick={() => copyToClipboard(rawCard, "شماره کارت")} className="mb-4 flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-3 transition hover:bg-white/15">
                  <span className="flex shrink-0 items-center gap-1 rounded-lg bg-amber-400/20 px-2 py-1 text-[11px] font-bold text-amber-300">
                    <Copy className="h-3.5 w-3.5" /> کپی
                  </span>
                  <span dir="ltr" style={{ fontSize: "14px", letterSpacing: "0.08em" }} className="flex-1 text-center font-mono font-bold text-white whitespace-nowrap sm:!text-xl">
                    {formattedCard}
                  </span>
                </div>
                <div className="space-y-2.5 border-t border-white/15 pt-3 text-xs sm:text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-white/70">به نام (صاحب حساب):</span>
                    <span className="font-bold text-white">{accountOwner}</span>
                  </div>
                  {shabaNumber && (
                    <div onClick={() => copyToClipboard(shabaNumber, "شماره شبا")} className="flex cursor-pointer items-center justify-between gap-2 rounded-lg bg-white/10 px-2.5 py-2 transition hover:bg-white/15">
                      <span className="text-white/70 shrink-0">شبا:</span>
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <span dir="ltr" className="font-mono text-[11px] sm:text-xs text-white/95 truncate">{shabaNumber}</span>
                        <Copy className="h-3.5 w-3.5 shrink-0 text-amber-300" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {copiedLabel && <p className="mb-4 rounded-xl bg-success-100 py-2 text-center text-xs font-bold text-success-600">{copiedLabel} با موفقیت کپی شد!</p>}

              {/* کادرهای کامل مشخصات واریز و آپلود فیش */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-ink-700">نام صاحب حسابی که از آن واریز کردید *</label>
                  <input type="text" value={payerName} onChange={(e) => setPayerName(e.target.value)} placeholder="مثلاً مریم حسینی" className="field w-full rounded-xl border border-ivory-300 bg-ivory-50 px-3.5 py-2.5 text-sm text-ink-900 focus:border-burgundy-700 focus:bg-white focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-ink-700">۴ رقم آخر کارت شما *</label>
                  <input type="text" dir="ltr" maxLength={4} value={cardLast4} onChange={(e) => setCardLast4(normalizeDigits(e.target.value).split("").filter((c) => c >= "0" && c <= "9").join(""))} placeholder="1234" className="field w-full rounded-xl border border-ivory-300 bg-ivory-50 px-3.5 py-2.5 text-right text-sm text-ink-900 focus:border-burgundy-700 focus:bg-white focus:outline-none" />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-bold text-ink-700">کد پیگیری / شماره ارجاع فیش (اختیاری)</label>
                  <input type="text" dir="ltr" value={trackingCode} onChange={(e) => setTrackingCode(e.target.value)} placeholder="مثلاً 123456789" className="field w-full rounded-xl border border-ivory-300 bg-ivory-50 px-3.5 py-2.5 text-right text-sm text-ink-900 focus:border-burgundy-700 focus:bg-white focus:outline-none" />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-xs font-bold text-ink-700">تصویر فیش واریزی (الزامی) *</label>
                  <div className="flex items-center gap-4">
                    <label className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-burgundy-700/40 bg-ivory-50 px-4 py-6 transition hover:border-burgundy-700 hover:bg-ivory-100">
                      {receiptBase64 ? <FileCheck className="h-8 w-8 text-success-600" /> : <UploadCloud className="h-8 w-8 text-burgundy-700" />}
                      <span className="text-xs sm:text-sm font-bold text-ink-800">{receiptBase64 ? "تصویر فیش انتخاب شد (برای تغییر کلیک کنید)" : "انتخاب عکس فیش واریزی از گالری"}</span>
                      <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
                    </label>
                    {receiptBase64 && (
                      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-ivory-300 shadow-sm">
                        <img src={receiptBase64} alt="فیش" className="h-full w-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ستون خلاصه فاکتور نهایی */}
        <aside className="h-fit min-w-0 space-y-4 rounded-2xl border border-ivory-300 bg-ivory-50 p-4 shadow-soft sm:space-y-6 sm:rounded-3xl sm:p-6 md:p-8 lg:sticky lg:top-28">
          <h2 className="text-base font-bold sm:text-xl">خلاصه فاکتور نهایی</h2>
          <ul className="max-h-60 divide-y divide-ivory-300 overflow-y-auto text-sm">
            {details.lines.map(({ key, product, quantity, lineTotal }) => (
              <li key={key} className="flex justify-between gap-3 py-3">
                <span className="text-ink-700">{product.name} × {quantity.toLocaleString("fa-IR")}</span>
                <span className="shrink-0 font-medium">{formatToman(lineTotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="space-y-3 border-t border-ivory-300 pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-ink-700">جمع کالاها</dt><dd>{formatToman(subtotal)}</dd></div>
            <div className="flex items-start justify-between gap-2">
              <dt className="text-ink-700">کرایه پستی (از مشهد)</dt>
              <dd className="text-end font-medium">
                {!hasLocation ? (
                  <span className="text-xs text-ink-500">پس از انتخاب استان</span>
                ) : shippingQuote.isFree ? (
                  <span className="font-bold text-success-600">رایگان</span>
                ) : (
                  formatToman(deliveryFee)
                )}
              </dd>
            </div>
            <div className="flex justify-between border-t border-ivory-300 pt-4 text-base">
              <dt className="font-bold">مبلغ قابل واریز</dt>
              <dd className="font-bold text-burgundy-800">{formatToman(total)}</dd>
            </div>
          </dl>
          {submitError && <p className="rounded-xl bg-error-100 px-4 py-3 text-sm font-bold text-error-600">{submitError}</p>}
          <button type="button" onClick={() => void handleSubmit()} disabled={!canSubmit} className="btn-primary w-full">
            {submitting ? "در حال ثبت سفارش و ارسال فیش..." : "تأیید و ثبت نهایی سفارش"}
          </button>
        </aside>
      </div>
    </div>
  );
}