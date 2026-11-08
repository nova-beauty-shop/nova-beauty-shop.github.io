import type { ReactNode } from 'react';
import { ArrowRight, Printer } from 'lucide-react';
import AdminGate from '@/components/admin/AdminGate';
import { AdminPageHeader } from '@/components/admin/AdminChrome';
import OrderStatusPanel from '@/components/admin/orders/OrderStatusPanel';
import ReceiptPreview from '@/components/admin/payments/ReceiptPreview';
import Link from '@/components/common/Link';
import { ErrorState, SkeletonGrid } from '@/components/common/StateViews';
import { useAsync } from '@/hooks/useAsync';
import { fetchAdminOrderDetail } from '@/lib/adminOrders';
import { formatDate, formatToman } from '@/lib/format';
import { DELIVERY_LABELS, ORDER_STATUS_LABELS } from '@/lib/orderLabels';
import type { AdminOrderDetail as Detail } from '@/lib/adminOrders';
import type { AdminAccess } from '@/lib/adminSettings';

const PAYMENT_LABELS: Record<Detail['payments'][number]['status'], string> = {
  pending: 'در انتظار بررسی',
  approved: 'تأیید شده',
  rejected: 'رد شده',
};

export default function AdminOrderDetailPage({ orderId }: { orderId: string }) {
  return <AdminGate>{(access) => <AdminOrderDetailContent orderId={orderId} access={access} />}</AdminGate>;
}

function AdminOrderDetailContent({ orderId, access }: { orderId: string; access: AdminAccess }) {
  const order = useAsync(() => fetchAdminOrderDetail(orderId), [orderId]);
  const canEdit = access.role === 'owner' || access.role === 'manager';

  return (
    <div className="container-nova py-12 md:py-16">
      <Link to="/admin/orders" className="mb-6 inline-flex items-center gap-2 text-sm text-ink-700 hover:text-burgundy-700">
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
        بازگشت به فهرست سفارش‌ها
      </Link>

      {order.loading && <SkeletonGrid count={2} />}
      {order.error && <ErrorState onRetry={order.retry} />}
      {!order.loading && !order.error && order.data === null && (
        <p className="rounded-2xl bg-ivory-200/60 p-8 text-center text-sm text-ink-500">این سفارش پیدا نشد.</p>
      )}

      {order.data && (
        <>
          <AdminPageHeader
            eyebrow="جزئیات سفارش"
            title={order.data.orderNumber}
            description={`ثبت شده در ${formatDate(order.data.createdAt)} · ${ORDER_STATUS_LABELS[order.data.status]}`}
          />
          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_380px]">
            <div className="space-y-8">
              <Card title="اقلام سفارش">
                <ul className="divide-y divide-ivory-300">
                  {order.data.items.map((item) => (
                    <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm">
                      <div>
                        <p className="font-medium text-ink-900">{item.productName}</p>
                        <p className="text-xs text-ink-500">
                          {item.brand}
                          {item.variantLabel ? ` · ${item.variantLabel}` : ''}
                        </p>
                      </div>
                      <div className="text-end">
                        <p>
                          {item.quantity} × {formatToman(item.unitPriceToman)}
                        </p>
                        <p className="font-medium">{formatToman(item.lineTotalToman)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                <dl className="mt-4 space-y-2 border-t border-ivory-300 pt-4 text-sm">
                  <Row label="جمع اقلام" value={formatToman(order.data.subtotalToman)} />
                  <Row label="هزینه ارسال" value={formatToman(order.data.deliveryFeeToman)} />
                  <Row label="مبلغ کل" value={formatToman(order.data.totalToman)} strong />
                </dl>
              </Card>

              <Card title="پرداخت‌ها">
                {order.data.payments.length === 0 ? (
                  <p className="text-sm text-ink-500">هنوز رسیدی برای این سفارش ثبت نشده است.</p>
                ) : (
                  <ul className="space-y-3 text-sm">
                    {order.data.payments.map((payment) => (
                      <li key={payment.id} className="rounded-2xl bg-ivory-200/50 p-4">
                        <p className="font-medium">
                          {PAYMENT_LABELS[payment.status]} · {formatToman(payment.amountToman)}
                        </p>
                        <p className="text-xs text-ink-500">ثبت: {formatDate(payment.createdAt)}</p>
                        {payment.reviewNote && <p className="mt-2 text-error-600">دلیل رد: {payment.reviewNote}</p>}
                        {payment.payerName && <p className="mt-2 text-ink-700">واریزکننده: {payment.payerName}</p>}
                        {payment.cardLast4 && <p className="text-ink-700" dir="ltr">کارت مبدا: **** {payment.cardLast4}</p>}
                        {payment.bankName && <p className="text-ink-700">بانک: {payment.bankName}</p>}
                        {payment.trackingCode && (
                          <p className="text-ink-700" dir="ltr">پیگیری: {payment.trackingCode}</p>
                        )}
                        {payment.storagePath && (
                          <div className="mt-3">
                            <ReceiptPreview storagePath={payment.storagePath} />
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card title="تاریخچه وضعیت">
                {order.data.events.length === 0 ? (
                  <p className="text-sm text-ink-500">تغییری ثبت نشده است.</p>
                ) : (
                  <ol className="relative space-y-4 border-s border-ivory-300 ps-6 text-sm">
                    {order.data.events.map((event) => (
                      <li key={event.id}>
                        <p className="font-medium">
                          {ORDER_STATUS_LABELS[event.fromStatus]} ← {ORDER_STATUS_LABELS[event.toStatus]}
                        </p>
                        <p className="text-xs text-ink-500">{formatDate(event.createdAt)}</p>
                        {event.note && <p className="mt-1 text-ink-700">{event.note}</p>}
                      </li>
                    ))}
                  </ol>
                )}
              </Card>
            </div>

            <aside className="space-y-8">
              <Card title="وضعیت و ارسال">
                <p className="mb-4 text-sm">
                  وضعیت فعلی: <span className="font-medium">{ORDER_STATUS_LABELS[order.data.status]}</span>
                </p>
                {order.data.trackingCode && (
                  <p className="mb-4 text-sm">
                    کد رهگیری: <span dir="ltr" className="font-medium">{order.data.trackingCode}</span>
                  </p>
                )}
                <OrderStatusPanel order={order.data} canEdit={canEdit} onUpdated={order.retry} />
              </Card>

              <Card title="مشتری و نشانی">
                <p className="font-medium">{order.data.recipientName}</p>
                <p className="text-sm text-ink-500" dir="ltr">
                  {order.data.phone}
                </p>
                <p className="mt-3 text-sm leading-[1.8] text-ink-700">
                  {order.data.province}، {order.data.city}، {order.data.street} · کد پستی <span dir="ltr">{order.data.postalCode}</span>
                </p>
                
              </Card>

              <Link
                to={`/admin/orders/${order.data.id}/invoice`}
                className="btn-outline w-full"
              >
                <Printer className="h-4 w-4" aria-hidden="true" />
                نمایش فاکتور برای چاپ
              </Link>
            </aside>
          </div>
        </>
      )}
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

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-500">{label}</dt>
      <dd className={strong ? 'font-bold text-ink-900' : 'text-ink-700'}>{value}</dd>
    </div>
  );
}
