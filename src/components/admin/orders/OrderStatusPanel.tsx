import { useState, type FormEvent } from 'react';
import { ORDER_STATUS_LABELS } from '@/lib/orderLabels';
import { NEXT_ORDER_STATUSES, adminOrderErrorMessage, updateOrderStatus, type AdminOrderDetail } from '@/lib/adminOrders';
import type { OrderStatus } from '@/lib/orders';

const NOTE_MAX = 500;

export default function OrderStatusPanel({
  order,
  canEdit,
  onUpdated,
}: {
  order: AdminOrderDetail;
  canEdit: boolean;
  onUpdated: () => void;
}) {
  const options = NEXT_ORDER_STATUSES[order.status];
  const [nextStatus, setNextStatus] = useState<OrderStatus | ''>('');
  const [note, setNote] = useState('');
  const [tracking, setTracking] = useState(order.trackingCode ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || nextStatus === '') return;
    setBusy(true);
    setError(null);
    try {
      await updateOrderStatus(order.id, nextStatus, note.slice(0, NOTE_MAX), tracking);
      setNextStatus('');
      setNote('');
      onUpdated();
    } catch (cause) {
      setError(adminOrderErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  if (!canEdit) {
    return <p className="text-sm text-ink-500">تغییر وضعیت سفارش فقط برای مدیر و مالک فروشگاه امکان‌پذیر است.</p>;
  }

  if (options.length === 0) {
    return <p className="text-sm text-ink-500">این سفارش در وضعیت «{ORDER_STATUS_LABELS[order.status]}» است و تغییر دیگری مجاز نیست.</p>;
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="next-status" className="block text-sm font-medium text-ink-900">
          وضعیت جدید
        </label>
        <select id="next-status" value={nextStatus} onChange={(event) => setNextStatus(event.target.value as OrderStatus | '')} className="field">
          <option value="">انتخاب کنید</option>
          {options.map((item) => (
            <option key={item} value={item}>
              {ORDER_STATUS_LABELS[item]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="tracking-code" className="block text-sm font-medium text-ink-900">
          کد رهگیری ارسال
        </label>
        <input
          id="tracking-code"
          dir="ltr"
          value={tracking}
          maxLength={60}
          onChange={(event) => setTracking(event.target.value)}
          className="field text-start"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="status-note" className="block text-sm font-medium text-ink-900">
          یادداشت (در تاریخچه سفارش ثبت می‌شود)
        </label>
        <textarea
          id="status-note"
          rows={3}
          maxLength={NOTE_MAX}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className="field h-auto rounded-2xl py-3"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-error-100 px-4 py-3 text-sm text-error-600">
          {error}
        </p>
      )}

      <button type="submit" disabled={busy || nextStatus === ''} className="btn-primary">
        {busy ? 'در حال ثبت...' : 'ثبت وضعیت جدید'}
      </button>
    </form>
  );
}
