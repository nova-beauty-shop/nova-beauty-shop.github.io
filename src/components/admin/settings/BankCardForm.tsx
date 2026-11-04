import { useState, type FormEvent } from 'react';
import { FormField, FormStatus, ReadOnlyNotice, SettingsSection } from '@/components/admin/settings/SettingsSection';
import { ErrorState, SkeletonGrid } from '@/components/common/StateViews';
import { useAsync } from '@/hooks/useAsync';
import { adminErrorMessage, saveBankCard } from '@/lib/adminSettings';
import { normalizeDigits } from '@/lib/digits';
import { fetchPaymentSettings, type PaymentSettings } from '@/lib/payments';

interface BankCardState {
  bankName: string;
  cardNumber: string;
  accountHolder: string;
  accountNumber: string;
  iban: string;
}

export default function BankCardForm({ canEdit }: { canEdit: boolean }) {
  const settings = useAsync(fetchPaymentSettings, []);

  if (settings.loading) return <SkeletonGrid count={1} />;
  if (settings.error || !settings.data) return <ErrorState onRetry={settings.retry} />;

  return <BankCardFormContent initial={settings.data} canEdit={canEdit} />;
}

function toState(settings: PaymentSettings): BankCardState {
  return {
    bankName: settings.bankName,
    cardNumber: settings.cardNumber,
    accountHolder: settings.accountHolder,
    accountNumber: settings.accountNumber,
    iban: settings.iban,
  };
}

function BankCardFormContent({ initial, canEdit }: { initial: PaymentSettings; canEdit: boolean }) {
  const [form, setForm] = useState<BankCardState>(() => toState(initial));
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  function update<K extends keyof BankCardState>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !canEdit) return;

    const cardDigits = normalizeDigits(form.cardNumber).replace(/[\s-]/g, '');
    if (!/^\d{16}$/.test(cardDigits)) {
      setStatus({ tone: 'error', text: 'شماره کارت باید دقیقاً ۱۶ رقم باشد.' });
      return;
    }

    setSaving(true);
    setStatus(null);
    try {
      await saveBankCard({
        bankName: form.bankName.trim(),
        cardNumber: cardDigits,
        accountHolder: form.accountHolder.trim(),
        accountNumber: normalizeDigits(form.accountNumber).replace(/[\s-]/g, ''),
        iban: form.iban.replace(/\s/g, '').toUpperCase(),
      });
      setStatus({ tone: 'success', text: 'اطلاعات کارت بانکی ذخیره شد و در صفحه پرداخت مشتریان نمایش داده می‌شود.' });
    } catch (cause) {
      setStatus({ tone: 'error', text: adminErrorMessage(cause) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsSection
      title="اطلاعات کارت بانکی"
      description="این اطلاعات در صفحه پرداخت سفارش‌ها برای مشتریان وارد شده نمایش داده می‌شود. پس از ذخیره، مشتریان بلافاصله شماره کارت جدید را می‌بینند."
      footer={<FormStatus status={status} />}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-8">
        {!canEdit && <ReadOnlyNotice />}
        <fieldset disabled={!canEdit || saving} className="grid gap-6 sm:grid-cols-2">
          <FormField id="bank-name" label="نام بانک">
            <input id="bank-name" type="text" value={form.bankName} onChange={(e) => update('bankName', e.target.value)} className="field" />
          </FormField>
          <FormField id="account-holder" label="نام و نام خانوادگی صاحب حساب">
            <input id="account-holder" type="text" value={form.accountHolder} onChange={(e) => update('accountHolder', e.target.value)} className="field" />
          </FormField>
          <FormField id="card-number" label="شماره کارت" hint="۱۶ رقم، بدون نیاز به خط تیره." className="sm:col-span-2">
            <input
              id="card-number"
              type="text"
              inputMode="numeric"
              dir="ltr"
              autoComplete="off"
              value={form.cardNumber}
              onChange={(e) => update('cardNumber', e.target.value)}
              className="field text-start font-mono tracking-wider"
            />
          </FormField>
          <FormField id="account-number" label="شماره حساب (اختیاری)">
            <input
              id="account-number"
              type="text"
              inputMode="numeric"
              dir="ltr"
              autoComplete="off"
              value={form.accountNumber}
              onChange={(e) => update('accountNumber', e.target.value)}
              className="field text-start font-mono tracking-wider"
            />
          </FormField>
          <FormField id="iban" label="شماره شبا (اختیاری)" hint="با IR شروع می‌شود و ۲۶ کاراکتر دارد.">
            <input
              id="iban"
              type="text"
              dir="ltr"
              autoComplete="off"
              value={form.iban}
              onChange={(e) => update('iban', e.target.value)}
              placeholder="IR000000000000000000000000"
              className="field text-start font-mono tracking-wider"
            />
          </FormField>
        </fieldset>

        {canEdit && (
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'در حال ذخیره...' : 'ذخیره اطلاعات کارت'}
          </button>
        )}
      </form>
    </SettingsSection>
  );
}
