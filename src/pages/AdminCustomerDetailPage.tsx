import { useState, type FormEvent, type ReactNode } from 'react';
import { ArrowRight, Ban, ShieldCheck } from 'lucide-react';
import AdminGate from '@/components/admin/AdminGate';
import { AdminPageHeader } from '@/components/admin/AdminChrome';
import Link from '@/components/common/Link';
import { ErrorState, SkeletonGrid } from '@/components/common/StateViews';
import { useAsync } from '@/hooks/useAsync';
import {
  adminCustomerErrorMessage,
  fetchAdminCustomer,
  fetchCustomerOrders,
  updateAdminCustomer,
  type AdminCustomerDetail,
} from '@/lib/adminCustomers';
import { formatDate, formatToman } from '@/lib/format';
import { ORDER_STATUS_LABELS } from '@/lib/orderLabels';

export default function AdminCustomerDetailPage({ customerId }: { customerId: string }) {
  return <AdminGate>{(access) => <CustomerDetailContent customerId={customerId} canEdit={access.role !== 'reviewer'} />}</AdminGate>;
}

function CustomerDetailContent({ customerId, canEdit }: { customerId: string; canEdit: boolean }) {
  const customer = useAsync(() => fetchAdminCustomer(customerId), [customerId]);
  const orders = useAsync(() => fetchCustomerOrders(customerId), [customerId]);

  return (
    <div className="container-nova py-12 md:py-16">
      <Link to="/admin/customers" className="mb-6 inline-flex items-center gap-2 text-sm text-ink-700 hover:text-burgundy-700">
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
        بازگشت به فهرست مشتریان
      </Link>

      {customer.loading && <SkeletonGrid count={2} />}
      {customer.error && <ErrorState onRetry={customer.retry} />}
      {!customer.loading && !customer.error && customer.data === null && (
        <p className="rounded-2xl bg-ivory-200/60 p-8 text-center text-sm text-ink-500">این مشتری پیدا نشد.</p>
      )}

      {customer.data && (
        <>
          <AdminPageHeader
            eyebrow="پروفایل مشتری"
            title={customer.data.name || 'بدون نام'}
            description={`عضویت از ${formatDate(customer.data.createdAt)}`}
          />
          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_380px]">
            <div className="space-y-8">
              <div className="grid gap-4 sm:grid-cols-3">
                <Stat label="تعداد سفارش" value={customer.data.orderCount.toLocaleString('fa-IR')} />
                <Stat label="مجموع خرید" value={formatToman(customer.data.totalSpentToman)} />
                <Stat label="وضعیت حساب" value={customer.data.blocked ? 'مسدود' : 'فعال'} />
              </div>

              <Card title="سابقه سفارش‌ها">
                {orders.loading && <SkeletonGrid count={1} />}
                {orders.error && <ErrorState onRetry={orders.retry} />}
                {orders.data && orders.data.length === 0 && <p className="text-sm text-ink-500">این مشتری هنوز سفارشی ثبت نکرده است.</p>}
                {orders.data && orders.data.length > 0 && (
                  <ul className="divide-y divide-ivory-300 text-sm">
                    {orders.data.map((order) => (
                      <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                        <div>
                          <Link to={`/admin/orders/${order.id}`} className="font-medium text-burgundy-700 hover:underline" dir="ltr">
                            {order.orderNumber}
                          </Link>
                          <p className="text-xs text-ink-500">{formatDate(order.createdAt)}</p>
                        </div>
                        <div className="text-end">
                          <p>{ORDER_STATUS_LABELS[order.status]}</p>
                          <p className="font-medium">{formatToman(order.totalToman)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>

            <aside className="space-y-8">
              <Card title="اطلاعات تماس">
                <p className="text-sm" dir="ltr">
                  {customer.data.email}
                </p>
                <p className="mt-2 text-sm text-ink-700" dir="ltr">
                  {customer.data.phone ?? 'تلفن ثبت نشده'}
                </p>
              </Card>

              <Card title="دسترسی و یادداشت داخلی">
                <CustomerControls key={customer.data.id} customer={customer.data} canEdit={canEdit} onSaved={customer.retry} />
              </Card>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

function CustomerControls({ customer, canEdit, onSaved }: { customer: AdminCustomerDetail; canEdit: boolean; onSaved: () => void }) {
  const [blocked, setBlocked] = useState(customer.blocked);
  const [note, setNote] = useState(customer.note);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await updateAdminCustomer(customer.id, blocked, note.slice(0, 1000));
      setSaved(true);
      onSaved();
    } catch (cause) {
      setError(adminCustomerErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  const dirty = blocked !== customer.blocked || note !== customer.note;

  return (
    <form onSubmit={save} className="space-y-5">
      <label className={`flex items-start gap-3 rounded-2xl border border-ivory-300 p-4 text-sm ${canEdit ? 'cursor-pointer' : 'opacity-70'}`}>
        <input
          type="checkbox"
          checked={blocked}
          disabled={!canEdit || busy}
          onChange={(event) => {
            setBlocked(event.target.checked);
            setSaved(false);
          }}
          className="mt-1 h-4 w-4 accent-burgundy-700"
        />
        <span>
          <span className="flex items-center gap-2 font-medium text-ink-900">
            {blocked ? <Ban className="h-4 w-4 text-error-600" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4 text-success-600" aria-hidden="true" />}
            مسدود کردن ثبت سفارش
          </span>
          <span className="mt-1 block text-ink-500">با فعال بودن این گزینه، مشتری نمی‌تواند سفارش جدید ثبت کند.</span>
        </span>
      </label>

      <div className="space-y-2">
        <label htmlFor="customer-note" className="block text-sm font-medium text-ink-900">
          یادداشت داخلی (فقط برای مدیران)
        </label>
        <textarea
          id="customer-note"
          rows={4}
          maxLength={1000}
          value={note}
          disabled={!canEdit || busy}
          onChange={(event) => {
            setNote(event.target.value);
            setSaved(false);
          }}
          className="field h-auto rounded-2xl py-3"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-error-100 px-4 py-3 text-sm text-error-600">
          {error}
        </p>
      )}
      {saved && <p className="text-sm text-success-600">تغییرات ذخیره شد.</p>}

      {canEdit ? (
        <button type="submit" disabled={busy || !dirty} className="btn-primary w-full">
          {busy ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
        </button>
      ) : (
        <p className="text-sm text-ink-500">تغییر دسترسی و یادداشت مشتری فقط برای مدیر و مالک امکان‌پذیر است.</p>
      )}
    </form>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-ivory-300 bg-ivory-50 p-6 shadow-soft">
      <p className="text-sm text-ink-500">{label}</p>
      <p className="mt-2 text-lg font-bold text-ink-900">{value}</p>
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-ivory-300 bg-ivory-50 p-6 shadow-soft">
      <h2 className="mb-5 text-lg">{title}</h2>
      {children}
    </section>
  );
}
