import { useState, type FormEvent } from 'react';
import { createAddress, type AddressInput } from '@/lib/addresses';
import { normalizeDigits } from '@/lib/digits';

const EMPTY_FORM: AddressInput = {
  recipientName: '',
  phone: '',
  province: '',
  city: '',
  street: '',
  postalCode: '',
};

function validate(form: AddressInput): string | null {
  if (form.recipientName.trim().length < 2) return 'نام گیرنده را وارد کنید.';
  if (!/^0\d{10}$/.test(normalizeDigits(form.phone.trim()))) return 'شماره تماس باید ۱۱ رقمی و با ۰ شروع شود.';
  if (form.province.trim().length < 2) return 'استان را وارد کنید.';
  if (form.city.trim().length < 2) return 'شهر را وارد کنید.';
  if (form.street.trim().length < 5) return 'نشانی کامل را وارد کنید.';
  if (!/^\d{10}$/.test(normalizeDigits(form.postalCode.trim()))) return 'کد پستی باید ۱۰ رقم باشد.';
  return null;
}

export default function AddressForm({ onSaved, onCancel }: { onSaved: () => void; onCancel?: () => void }) {
  const [form, setForm] = useState<AddressInput>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof AddressInput>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const problem = validate(form);
    if (problem) {
      setError(problem);
      return;
    }

    const payload: AddressInput = {
      recipientName: form.recipientName.trim(),
      phone: normalizeDigits(form.phone.trim()),
      province: form.province.trim(),
      city: form.city.trim(),
      street: form.street.trim(),
      postalCode: normalizeDigits(form.postalCode.trim()),
    };

    setSaving(true);
    setError(null);
    try {
      await createAddress(payload);
      setForm(EMPTY_FORM);
      onSaved();
    } catch {
      setError('ذخیره نشانی انجام نشد. لطفاً دوباره تلاش کنید.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-5 sm:grid-cols-2">
      <div className="space-y-2">
        <label htmlFor="addr-name" className="block text-sm font-medium text-ink-900">
          نام گیرنده
        </label>
        <input id="addr-name" type="text" autoComplete="name" value={form.recipientName} onChange={(e) => update('recipientName', e.target.value)} className="field" />
      </div>
      <div className="space-y-2">
        <label htmlFor="addr-phone" className="block text-sm font-medium text-ink-900">
          شماره تماس
        </label>
        <input id="addr-phone" type="tel" dir="ltr" autoComplete="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} className="field text-start" />
      </div>
      <div className="space-y-2">
        <label htmlFor="addr-province" className="block text-sm font-medium text-ink-900">
          استان
        </label>
        <input id="addr-province" type="text" value={form.province} onChange={(e) => update('province', e.target.value)} className="field" />
      </div>
      <div className="space-y-2">
        <label htmlFor="addr-city" className="block text-sm font-medium text-ink-900">
          شهر
        </label>
        <input id="addr-city" type="text" value={form.city} onChange={(e) => update('city', e.target.value)} className="field" />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <label htmlFor="addr-street" className="block text-sm font-medium text-ink-900">
          نشانی کامل
        </label>
        <textarea id="addr-street" rows={3} value={form.street} onChange={(e) => update('street', e.target.value)} className="field h-auto py-3" />
      </div>
      <div className="space-y-2">
        <label htmlFor="addr-postal" className="block text-sm font-medium text-ink-900">
          کد پستی
        </label>
        <input id="addr-postal" type="text" inputMode="numeric" dir="ltr" value={form.postalCode} onChange={(e) => update('postalCode', e.target.value)} className="field text-start" />
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-error-100 px-4 py-3 text-sm text-error-600 sm:col-span-2">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3 sm:col-span-2">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'در حال ذخیره...' : 'ذخیره نشانی'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-outline">
            انصراف
          </button>
        )}
      </div>
    </form>
  );
}
