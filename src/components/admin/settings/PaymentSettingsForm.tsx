import { useState, type FormEvent } from 'react';
import { FormField, FormStatus, ReadOnlyNotice, SettingsSection } from '@/components/admin/settings/SettingsSection';
import { ErrorState, SkeletonGrid } from '@/components/common/StateViews';
import { useAsync } from '@/hooks/useAsync';
import { adminErrorMessage, savePaymentToggle } from '@/lib/adminSettings';
import { fetchPaymentSettings, type PaymentSettings } from '@/lib/payments';

export default function PaymentSettingsForm({ canEdit }: { canEdit: boolean }) {
  const settings = useAsync(fetchPaymentSettings, []);

  if (settings.loading) return <SkeletonGrid count={1} />;
  if (settings.error || !settings.data) return <ErrorState onRetry={settings.retry} />;

  return <PaymentForm initial={settings.data} canEdit={canEdit} />;
}

function PaymentForm({ initial, canEdit }: { initial: PaymentSettings; canEdit: boolean }) {
  const [enabled, setEnabled] = useState(initial.cardPaymentEnabled);
  const [instructions, setInstructions] = useState(initial.instructions);
  const [notice, setNotice] = useState(initial.paymentNotice);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !canEdit) return;
    setSaving(true);
    setStatus(null);
    try {
      await savePaymentToggle({ enabled, instructions: instructions.trim(), notice: notice.trim() });
      setStatus({ tone: 'success', text: 'تنظیمات پرداخت ذخیره شد.' });
    } catch (cause) {
      setStatus({ tone: 'error', text: adminErrorMessage(cause) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsSection
      title="تنظیمات پرداخت کارت به کارت"
      description="با روشن کردن این گزینه، مشتریان می‌توانند هنگام تسویه حساب سفارش ثبت کنند و رسید پرداخت را ارسال کنند."
      footer={<FormStatus status={status} />}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-8">
        {!canEdit && <ReadOnlyNotice />}
        <fieldset disabled={!canEdit || saving} className="space-y-8">
          <div className="flex items-center justify-between gap-6 rounded-2xl bg-ivory-200/60 p-5">
            <div className="space-y-1">
              <p id="payment-enabled-label" className="font-medium text-ink-900">
                فعال بودن پرداخت کارت به کارت
              </p>
              <p className="text-sm text-ink-500">{enabled ? 'مشتریان می‌توانند از این روش پرداخت کنند.' : 'این روش پرداخت برای مشتریان نمایش داده نمی‌شود.'}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              aria-labelledby="payment-enabled-label"
              onClick={() => setEnabled((value) => !value)}
              className={`relative inline-flex h-7 w-12 flex-none items-center rounded-full transition ${
                enabled ? 'bg-success-600' : 'bg-ink-500/40'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-ivory-50 shadow transition ${
                  enabled ? '-translate-x-6' : '-translate-x-1'
                }`}
              />
            </button>
          </div>

          <FormField id="payment-instructions" label="راهنمای پرداخت" hint="این متن زیر اطلاعات کارت برای مشتری نمایش داده می‌شود. حداکثر ۱۰۰۰ نویسه.">
            <textarea
              id="payment-instructions"
              rows={4}
              maxLength={1000}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="field h-auto py-3"
            />
          </FormField>

          <FormField id="payment-notice" label="اطلاعیه برای مشتری (اختیاری)" hint="برای نمایش نکته‌ای مهم مانند ساعت کاری تأیید رسید. خالی بگذارید تا نمایش داده نشود.">
            <textarea
              id="payment-notice"
              rows={3}
              maxLength={500}
              value={notice}
              onChange={(e) => setNotice(e.target.value)}
              className="field h-auto py-3"
            />
          </FormField>
        </fieldset>

        {canEdit && (
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات پرداخت'}
          </button>
        )}
      </form>
    </SettingsSection>
  );
}
