import { useState, type FormEvent } from 'react';
import { ErrorState, SkeletonGrid } from '@/components/common/StateViews';
import { FormField, FormStatus, ReadOnlyNotice, SettingsSection } from '@/components/admin/settings/SettingsSection';
import { useAsync } from '@/hooks/useAsync';
import { adminErrorMessage, saveStoreSettings } from '@/lib/adminSettings';
import { normalizeDigits, parseIntegerInput } from '@/lib/digits';
import { fetchStoreSettings, type StoreSettings } from '@/lib/storeSettings';
import { formatToman } from '@/lib/format';

interface GeneralFormState {
  storeName: string;
  supportPhone: string;
  supportEmail: string;
  address: string;
  courierFee: string;
  courierThreshold: string;
  postFee: string;
}

function toFormState(settings: StoreSettings): GeneralFormState {
  return {
    storeName: settings.storeName,
    supportPhone: settings.supportPhone,
    supportEmail: settings.supportEmail,
    address: settings.address,
    courierFee: String(settings.courierFeeToman),
    courierThreshold: String(settings.courierFreeThresholdToman),
    postFee: String(settings.postFeeToman),
  };
}

export default function GeneralSettingsForm({ canEdit }: { canEdit: boolean }) {
  const settings = useAsync(fetchStoreSettings, []);

  if (settings.loading) return <SkeletonGrid count={1} />;
  if (settings.error || !settings.data) return <ErrorState onRetry={settings.retry} />;

  return <GeneralForm initial={toFormState(settings.data)} canEdit={canEdit} />;
}

function GeneralForm({ initial, canEdit }: { initial: GeneralFormState; canEdit: boolean }) {
  const [form, setForm] = useState<GeneralFormState>(initial);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  function update<K extends keyof GeneralFormState>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !canEdit) return;

    const courierFee = parseIntegerInput(form.courierFee);
    const courierThreshold = parseIntegerInput(form.courierThreshold);
    const postFee = parseIntegerInput(form.postFee);
    if (courierFee === null || courierThreshold === null || postFee === null) {
      setStatus({ tone: 'error', text: 'مبلغ‌ها را فقط با ارقام وارد کنید.' });
      return;
    }

    setSaving(true);
    setStatus(null);
    try {
      await saveStoreSettings({
        storeName: form.storeName.trim(),
        supportPhone: normalizeDigits(form.supportPhone.trim()),
        supportEmail: form.supportEmail.trim(),
        address: form.address.trim(),
        courierFeeToman: courierFee,
        courierFreeThresholdToman: courierThreshold,
        postFeeToman: postFee,
      });
      setStatus({ tone: 'success', text: 'اطلاعات فروشگاه با موفقیت ذخیره شد.' });
    } catch (cause) {
      setStatus({ tone: 'error', text: adminErrorMessage(cause) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsSection
      title="اطلاعات عمومی فروشگاه"
      description="نام، اطلاعات تماس و هزینه‌های ارسال. این مقادیر در بنر بالای سایت، صفحات راهنما و تسویه حساب نمایش داده می‌شوند."
      footer={<FormStatus status={status} />}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-8">
        {!canEdit && <ReadOnlyNotice />}
        <fieldset disabled={!canEdit || saving} className="grid gap-6 sm:grid-cols-2">
          <FormField id="store-name" label="نام فروشگاه" className="sm:col-span-2">
            <input id="store-name" type="text" value={form.storeName} onChange={(e) => update('storeName', e.target.value)} className="field" />
          </FormField>
          <FormField id="support-phone" label="تلفن پشتیبانی" hint="فقط ارقام، با یا بدون کد شهر.">
            <input
              id="support-phone"
              type="tel"
              dir="ltr"
              value={form.supportPhone}
              onChange={(e) => update('supportPhone', e.target.value)}
              className="field text-start"
            />
          </FormField>
          <FormField id="support-email" label="ایمیل پشتیبانی">
            <input
              id="support-email"
              type="email"
              dir="ltr"
              value={form.supportEmail}
              onChange={(e) => update('supportEmail', e.target.value)}
              className="field text-start"
            />
          </FormField>
          <FormField id="store-address" label="نشانی فروشگاه" className="sm:col-span-2">
            <textarea id="store-address" rows={2} value={form.address} onChange={(e) => update('address', e.target.value)} className="field h-auto py-3" />
          </FormField>

          <div className="sm:col-span-2">
            <h3 className="text-base font-medium text-ink-900">هزینه ارسال</h3>
            <p className="mt-1 text-sm text-ink-500">مبالغ به تومان. برای ارسال رایگان، مبلغ آستانه را بالاتر از سبد بزرگ‌ترین مشتری بگذارید.</p>
          </div>
          <FormField id="courier-fee" label="هزینه ارسال با پیک" hint={`نمایش: ${formatToman(parseIntegerInput(form.courierFee) ?? 0)}`}>
            <input
              id="courier-fee"
              type="text"
              inputMode="numeric"
              dir="ltr"
              value={form.courierFee}
              onChange={(e) => update('courierFee', e.target.value)}
              className="field text-start"
            />
          </FormField>
          <FormField
            id="courier-threshold"
            label="ارسال رایگان با پیک از مبلغ"
            hint={`نمایش: ${formatToman(parseIntegerInput(form.courierThreshold) ?? 0)}`}
          >
            <input
              id="courier-threshold"
              type="text"
              inputMode="numeric"
              dir="ltr"
              value={form.courierThreshold}
              onChange={(e) => update('courierThreshold', e.target.value)}
              className="field text-start"
            />
          </FormField>
          <FormField id="post-fee" label="هزینه پست پیشتاز" hint={`نمایش: ${formatToman(parseIntegerInput(form.postFee) ?? 0)}`}>
            <input
              id="post-fee"
              type="text"
              inputMode="numeric"
              dir="ltr"
              value={form.postFee}
              onChange={(e) => update('postFee', e.target.value)}
              className="field text-start"
            />
          </FormField>
        </fieldset>

        {canEdit && (
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'در حال ذخیره...' : 'ذخیره اطلاعات فروشگاه'}
          </button>
        )}
      </form>
    </SettingsSection>
  );
}
