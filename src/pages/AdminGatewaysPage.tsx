import { useState } from 'react';
import { CreditCard, ShieldAlert } from 'lucide-react';
import AdminGate from '@/components/admin/AdminGate';
import { AdminPageHeader } from '@/components/admin/AdminChrome';
import { EmptyState, ErrorState, SkeletonGrid } from '@/components/common/StateViews';
import { useAsync } from '@/hooks/useAsync';
import { fetchPaymentGateways, gatewayErrorMessage, updatePaymentGatewayMode, type PaymentGateway } from '@/lib/paymentGateways';

export default function AdminGatewaysPage() {
  return <AdminGate>{(access) => <GatewaysContent isOwner={access.role === 'owner'} />}</AdminGate>;
}

function GatewaysContent({ isOwner }: { isOwner: boolean }) {
  const gateways = useAsync(fetchPaymentGateways, []);

  return (
    <div className="container-nova py-12 md:py-16">
      <AdminPageHeader
        eyebrow="پرداخت آنلاین"
        title="درگاه‌های پرداخت"
        description="حالت کار هر درگاه را تنظیم کنید. کلیدهای اتصال در تنظیمات امن سرور نگهداری می‌شوند و هرگز در این صفحه نمایش داده یا دریافت نمی‌شوند."
      />

      <div className="mt-8 flex gap-3 rounded-3xl border border-gold-500/40 bg-gold-500/10 p-5 text-sm text-ink-900">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-gold-500" aria-hidden="true" />
        <p className="leading-[1.8]">
          درگاه‌های آنلاین هنوز به فروشگاه متصل نشده‌اند و پرداخت آنلاین فعال نیست. مشتریان فعلاً از طریق کارت به کارت پرداخت می‌کنند.
        </p>
      </div>

      <div className="mt-10">
        {gateways.loading && <SkeletonGrid count={1} />}
        {gateways.error && <ErrorState onRetry={gateways.retry} />}
        {gateways.data && gateways.data.length === 0 && <EmptyState title="درگاهی تعریف نشده است" description="برای افزودن درگاه با پشتیبانی تماس بگیرید." />}
        {gateways.data && gateways.data.length > 0 && (
          <ul className="space-y-6">
            {gateways.data.map((gateway) => (
              <li key={gateway.provider}>
                <GatewayCard gateway={gateway} canEdit={isOwner} onSaved={gateways.retry} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function GatewayCard({ gateway, canEdit, onSaved }: { gateway: PaymentGateway; canEdit: boolean; onSaved: () => void }) {
  const [mode, setMode] = useState(gateway.mode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = mode !== gateway.mode;

  async function save() {
    if (busy || !dirty) return;
    setBusy(true);
    setError(null);
    try {
      await updatePaymentGatewayMode(gateway.provider, mode);
      onSaved();
    } catch (cause) {
      setError(gatewayErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="rounded-3xl border border-ivory-300 bg-ivory-50 p-6 shadow-soft md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-burgundy-700 text-ivory-50">
            <CreditCard className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg">{gateway.label}</h2>
            <p className="text-xs text-ink-500" dir="ltr">
              {gateway.provider}
            </p>
          </div>
        </div>
        <span className="rounded-full bg-ivory-200 px-3 py-1 text-xs text-ink-700">متصل نشده</span>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <div className="space-y-2">
          <label htmlFor={`mode-${gateway.provider}`} className="block text-sm font-medium text-ink-900">
            حالت کار
          </label>
          <select
            id={`mode-${gateway.provider}`}
            value={mode}
            disabled={!canEdit || busy}
            onChange={(event) => setMode(event.target.value === 'live' ? 'live' : 'sandbox')}
            className="field"
          >
            <option value="sandbox">آزمایشی (Sandbox)</option>
            <option value="live">واقعی</option>
          </select>
        </div>
        <button type="button" onClick={save} disabled={!canEdit || !dirty || busy} className="btn-primary">
          {busy ? 'در حال ذخیره...' : 'ذخیره حالت'}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-error-100 px-4 py-3 text-sm text-error-600">
          {error}
        </p>
      )}
      {!canEdit && <p className="mt-4 text-sm text-ink-500">تغییر این تنظیمات فقط برای مالک فروشگاه امکان‌پذیر است.</p>}
    </article>
  );
}
