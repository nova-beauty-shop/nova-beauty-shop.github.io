import { useState, type FormEvent } from "react";
import { createAddress, type AddressInput } from "@/lib/addresses";
import { normalizeDigits } from "@/lib/digits";
import { IRAN_PROVINCES } from "@/lib/storeSettings";

const EMPTY_FORM: AddressInput = {
  recipientName: "",
  phone: "",
  province: "",
  city: "",
  street: "",
  postalCode: "",
};

function validate(form: AddressInput): string | null {
  if (form.recipientName.trim().length < 2) return "نام گیرنده را وارد کنید.";
  if (!/^0[0-9]{10}$/.test(normalizeDigits(form.phone.trim()))) return "شماره تماس باید ۱۱ رقمی و با ۰ شروع شود.";
  if (form.province.trim().length < 2) return "استان را انتخاب کنید.";
  if (form.city.trim().length < 2) return "نام شهر را وارد کنید.";
  if (form.street.trim().length < 5) return "نشانی کامل را وارد کنید.";
  if (!/^[0-9]{10}$/.test(normalizeDigits(form.postalCode.trim()))) return "کد پستی باید ۱۰ رقم باشد.";
  return null;
}

export default function AddressForm({ onSaved, onCancel }: { onSaved: () => void; onCancel?: () => void }) {
  const [form, setForm] = useState<AddressInput>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof AddressInput>(key: K, value: string) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "province") {
        const found = IRAN_PROVINCES.find((p) => p.province === value.trim());
        if (found) next.city = found.capital;
      }
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const problem = validate(form);
    if (problem) { setError(problem); return; }
    const payload: AddressInput = {
      recipientName: form.recipientName.trim(),
      phone: normalizeDigits(form.phone.trim()),
      province: form.province.trim(),
      city: form.city.trim(),
      street: form.street.trim(),
      postalCode: normalizeDigits(form.postalCode.trim()),
    };
    setSaving(true); setError(null);
    try {
      await createAddress(payload);
      setForm(EMPTY_FORM);
      onSaved();
    } catch {
      setError("ذخیره نشانی انجام نشد. لطفاً دوباره تلاش کنید.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
      <div className="space-y-1">
        <label htmlFor="addr-name" className="block text-xs font-medium text-ink-900 sm:text-sm">نام گیرنده</label>
        <input id="addr-name" type="text" placeholder="نام و نام خانوادگی" value={form.recipientName} onChange={(e) => update("recipientName", e.target.value)} className="field" />
      </div>
      <div className="space-y-1">
        <label htmlFor="addr-phone" className="block text-xs font-medium text-ink-900 sm:text-sm">شماره تماس</label>
        <input id="addr-phone" type="tel" dir="ltr" placeholder="0912..." value={form.phone} onChange={(e) => update("phone", e.target.value)} className="field text-start" />
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:col-span-2 sm:gap-4">
        <div className="space-y-1">
          <label htmlFor="addr-province" className="block text-xs font-medium text-ink-900 sm:text-sm">استان (محاسبه خودکار کرایه پستی)</label>
          <select id="addr-province" value={form.province} onChange={(e) => update("province", e.target.value)} className="field">
            <option value="">انتخاب استان...</option>
            {IRAN_PROVINCES.map((item) => (
              <option key={item.province} value={item.province}>{item.province}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="addr-city" className="block text-xs font-medium text-ink-900 sm:text-sm">شهر</label>
          <input id="addr-city" type="text" placeholder="مثلاً مشهد، نیشابور، تهران، شیراز..." value={form.city} onChange={(e) => update("city", e.target.value)} className="field" />
        </div>
      </div>
      <div className="space-y-1 sm:col-span-2">
        <label htmlFor="addr-street" className="block text-xs font-medium text-ink-900 sm:text-sm">نشانی کامل پستی</label>
        <textarea id="addr-street" rows={2} placeholder="خیابان، کوچه، پلاک، واحد" value={form.street} onChange={(e) => update("street", e.target.value)} className="field !h-auto !rounded-2xl py-2.5 leading-relaxed" />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <label htmlFor="addr-postal" className="block text-xs font-medium text-ink-900 sm:text-sm">کد پستی (۱۰ رقمی)</label>
        <input id="addr-postal" type="text" inputMode="numeric" dir="ltr" maxLength={10} placeholder="1234567890" value={form.postalCode} onChange={(e) => update("postalCode", e.target.value)} className="field text-start sm:max-w-xs" />
      </div>
      {error && <p role="alert" className="rounded-xl bg-error-100 px-3.5 py-2.5 text-xs text-error-600 sm:col-span-2 sm:text-sm">{error}</p>}
      <div className="flex flex-wrap gap-2.5 pt-1 sm:col-span-2 sm:gap-3">
        <button type="submit" disabled={saving} className="btn-primary flex-1 sm:flex-none">{saving ? "در حال ذخیره..." : "ذخیره نشانی"}</button>
        {onCancel && <button type="button" onClick={onCancel} className="btn-outline flex-1 sm:flex-none">انصراف</button>}
      </div>
    </form>
  );
}
