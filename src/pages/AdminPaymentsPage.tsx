import { useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import AdminGate from '@/components/admin/AdminGate';
import { AdminPageHeader } from '@/components/admin/AdminChrome';
import ReceiptPreview from '@/components/admin/payments/ReceiptPreview';
import Link from '@/components/common/Link';
import { EmptyState, ErrorState, SkeletonGrid } from '@/components/common/StateViews';
import { useAsync } from '@/hooks/useAsync';
import { ORDER_STATUS_LABELS } from '@/lib/orderLabels';
import { advanceOrderStatusTo } from '@/lib/adminOrders';
import { formatDate, formatToman } from '@/lib/format';
import {
  fetchReceiptRecords,
  reviewReceipt,
  type ReceiptRecord,
  type ReceiptStatus,
} from '@/lib/payments';

type FilterId = 'pending' | 'approved' | 'rejected' | 'all';

const FILTERS: { id: FilterId; label: string; status: ReceiptStatus | null }[] = [
  { id: 'pending', label: 'در انتظار بررسی', status: 'pending' },
  { id: 'approved', label: 'تأیید شده', status: 'approved' },
  { id: 'rejected', label: 'رد شده', status: 'rejected' },
  { id: 'all', label: 'همه', status: null },
];

const RECEIPT_STATUS_LABELS: Record<ReceiptStatus, string> = {
  pending: 'در انتظار بررسی',
  approved: 'تأیید شده',
  rejected: 'رد شده',
};

const RECEIPT_STATUS_STYLES: Record<ReceiptStatus, string> = {
  pending: 'bg-gold-500/20 text-ink-900',
  approved: 'bg-success-100 text-success-600',
  rejected: 'bg-error-100 text-error-600',
};

const MIN_REJECT_NOTE_LENGTH = 3;

export default function AdminPaymentsPage() {
  return <AdminGate>{() => <AdminPaymentsContent />}</AdminGate>;
}

function AdminPaymentsContent() {
  const [filter, setFilter] = useState<FilterId>('pending');
  const current = FILTERS.find((item) => item.id === filter) ?? FILTERS[0];
  const receipts = useAsync(() => fetchReceiptRecords(current.status), [current.status]);

  return (
    <div className="container-nova py-12 md:py-16">
      <AdminPageHeader
        eyebrow="مدیریت پرداخت"
        title="بررسی رسیدهای کارت به کارت"
        description="رسیدهای ارسالی مشتریان را بررسی کنید، تأیید یا با ذکر دلیل رد کنید و سابقه همه پرداخت‌ها را ببینید."
      />

      <div role="tablist" aria-label="فیلتر وضعیت رسید" className="-mx-4 mt-10 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
        {FILTERS.map((item) => {
          const active = item.id === filter;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(item.id)}
              className={`h-10 shrink-0 rounded-full px-5 text-sm transition ${
                active ? 'bg-burgundy-700 text-ivory-50 shadow-soft' : 'bg-ivory-200/70 text-ink-700 hover:text-burgundy-700'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="mt-8">
        {receipts.loading && <SkeletonGrid count={2} />}
        {receipts.error && <ErrorState onRetry={receipts.retry} />}
        {receipts.data && receipts.data.length === 0 && (
          <EmptyState title="رسیدی در این فیلتر نیست" description="پس از ارسال رسید توسط مشتری، اینجا نمایش داده می‌شود." />
        )}
        {receipts.data && receipts.data.length > 0 && (
          <ul className="space-y-6">
            {receipts.data.map((receipt) => (
              <li key={receipt.id}>
                <ReceiptCard receipt={receipt} onReviewed={receipts.retry} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ReceiptCard({ receipt, onReviewed }: { receipt: ReceiptRecord; onReviewed: () => void }) {
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isPending = receipt.status === 'pending';

  async function submit(approve: boolean) {
    if (busy) return;
    const trimmedNote = note.trim();
    if (!approve && trimmedNote.length < MIN_REJECT_NOTE_LENGTH) {
      setError(`برای رد رسید، دلیل آن را حداقل ${MIN_REJECT_NOTE_LENGTH} نویسه وارد کنید.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await reviewReceipt(receipt.id, approve, approve ? '' : trimmedNote);
      if (approve) {
        await advanceOrderStatusTo(receipt.orderId, 'paid', 'preparing', 'سفارش شما ثبت و تأیید شد و آماده ارسال است.', '');
      }
      onReviewed();
    } catch {
      setError('ثبت نتیجه بررسی انجام نشد. لطفاً دوباره تلاش کنید.');
      setBusy(false);
    }
  }

  return (
    <article className="grid gap-6 rounded-3xl border border-ivory-300 bg-ivory-50 p-6 shadow-soft md:grid-cols-[220px_1fr] md:p-8">
      <div className="overflow-hidden rounded-2xl bg-ivory-200">
        <ReceiptPreview storagePath={receipt.storagePath} />
      </div>

      <div className="flex min-w-0 flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-xs ${RECEIPT_STATUS_STYLES[receipt.status]}`}>
            {RECEIPT_STATUS_LABELS[receipt.status]}
          </span>
          {receipt.orderStatus && (
            <span className="text-xs text-ink-500">وضعیت سفارش: {ORDER_STATUS_LABELS[receipt.orderStatus]}</span>
          )}
        </div>

        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink-500">شماره سفارش</dt>
            <dd className="mt-1 font-medium" dir="ltr">
              <Link to={`/admin/orders/${receipt.orderId}`} className="text-burgundy-700 underline-offset-4 hover:underline">
                {receipt.orderNumber}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-ink-500">گیرنده</dt>
            <dd className="mt-1 font-medium">{receipt.recipientName}</dd>
          </div>
          <div>
            <dt className="text-ink-500">مبلغ رسید</dt>
            <dd className="mt-1 font-bold">{formatToman(receipt.amountToman)}</dd>
          </div>
          <div>
            <dt className="text-ink-500">ثبت رسید</dt>
            <dd className="mt-1">{formatDate(receipt.createdAt)}</dd>
          </div>
          {receipt.payerName && (
            <div>
              <dt className="text-ink-500">نام واریزکننده</dt>
              <dd className="mt-1 font-medium">{receipt.payerName}</dd>
            </div>
          )}
          {receipt.cardLast4 && (
            <div>
              <dt className="text-ink-500">کارت مبدا</dt>
              <dd className="mt-1 font-mono" dir="ltr">**** {receipt.cardLast4}</dd>
            </div>
          )}
          {receipt.bankName && (
            <div>
              <dt className="text-ink-500">بانک مبدا</dt>
              <dd className="mt-1">{receipt.bankName}</dd>
            </div>
          )}
          {receipt.trackingCode && (
            <div>
              <dt className="text-ink-500">شماره پیگیری</dt>
              <dd className="mt-1 font-mono" dir="ltr">{receipt.trackingCode}</dd>
            </div>
          )}
          {receipt.reviewedAt && (
            <div>
              <dt className="text-ink-500">زمان بررسی</dt>
              <dd className="mt-1">{formatDate(receipt.reviewedAt)}</dd>
            </div>
          )}
          {receipt.reviewNote && (
            <div className="sm:col-span-2">
              <dt className="text-ink-500">دلیل رد</dt>
              <dd className="mt-1 rounded-xl bg-error-100 px-4 py-3 text-error-600">{receipt.reviewNote}</dd>
            </div>
          )}
        </dl>

        {error && (
          <p role="alert" className="rounded-xl bg-error-100 px-4 py-3 text-sm text-error-600">
            {error}
          </p>
        )}

        {isPending && rejecting && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor={`reject-note-${receipt.id}`} className="block text-sm font-medium text-ink-900">
                دلیل رد رسید (برای مشتری نمایش داده می‌شود)
              </label>
              <textarea
                id={`reject-note-${receipt.id}`}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={500}
                rows={3}
                className="field"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => void submit(false)} disabled={busy} className="btn-primary">
                <XCircle className="h-4 w-4" aria-hidden="true" />
                {busy ? 'در حال ثبت...' : 'ثبت رد رسید'}
              </button>
              <button type="button" onClick={() => setRejecting(false)} disabled={busy} className="btn-outline">
                انصراف
              </button>
            </div>
          </div>
        )}

        {isPending && !rejecting && (
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => void submit(true)} disabled={busy} className="btn-primary">
              <CheckCircle className="h-4 w-4" aria-hidden="true" />
              {busy ? 'در حال ثبت...' : 'تأیید پرداخت'}
            </button>
            <button type="button" onClick={() => setRejecting(true)} disabled={busy} className="btn-outline">
              رد رسید
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
