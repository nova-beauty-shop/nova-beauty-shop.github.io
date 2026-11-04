import { formatDate, formatToman } from '@/lib/format';
import { DELIVERY_LABELS, ORDER_STATUS_LABELS } from '@/lib/orderLabels';
import type { AdminOrderDetail } from '@/lib/adminOrders';
import type { StoreSettings } from '@/lib/storeSettings';

export default function OrderInvoice({ order, store }: { order: AdminOrderDetail; store: StoreSettings }) {
  return (
    <article className="print-area mx-auto max-w-3xl rounded-3xl border border-ivory-300 bg-white p-8 text-ink-900 shadow-soft md:p-12">
      <header className="flex flex-col gap-6 border-b border-ivory-300 pb-8 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-2xl font-bold text-burgundy-800">{store.storeName}</p>
          <p className="mt-2 text-sm text-ink-500">{store.address}</p>
          <p className="text-sm text-ink-500" dir="ltr">
            {store.supportPhone} · {store.supportEmail}
          </p>
        </div>
        <div className="text-sm md:text-end">
          <p className="text-lg font-bold">فاکتور فروش</p>
          <p className="mt-2 text-ink-700" dir="ltr">
            {order.orderNumber}
          </p>
          <p className="text-ink-500">تاریخ: {formatDate(order.createdAt)}</p>
          <p className="text-ink-500">وضعیت: {ORDER_STATUS_LABELS[order.status]}</p>
        </div>
      </header>

      <section className="grid gap-6 py-8 text-sm md:grid-cols-2">
        <div>
          <h2 className="mb-2 font-bold">مشخصات گیرنده</h2>
          <p>{order.recipientName}</p>
          <p dir="ltr" className="text-ink-500">
            {order.phone}
          </p>
          <p className="mt-2 leading-[1.8] text-ink-700">
            {order.province}، {order.city}، {order.street} · کد پستی <span dir="ltr">{order.postalCode}</span>
          </p>
        </div>
        <div>
          <h2 className="mb-2 font-bold">ارسال</h2>
          <p>{DELIVERY_LABELS[order.deliveryMethod]}</p>
          {order.trackingCode && (
            <p className="mt-2 text-ink-700">
              کد رهگیری: <span dir="ltr">{order.trackingCode}</span>
            </p>
          )}
          {order.deliveryNote && <p className="mt-2 text-ink-500">{order.deliveryNote}</p>}
        </div>
      </section>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-y border-ivory-300 bg-ivory-100 text-start">
            <th className="px-3 py-3 text-start font-medium">کالا</th>
            <th className="px-3 py-3 text-center font-medium">تعداد</th>
            <th className="px-3 py-3 text-end font-medium">قیمت واحد</th>
            <th className="px-3 py-3 text-end font-medium">جمع</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id} className="border-b border-ivory-200">
              <td className="px-3 py-3">
                {item.productName}
                <span className="block text-xs text-ink-500">
                  {item.brand}
                  {item.variantLabel ? ` · ${item.variantLabel}` : ''}
                </span>
              </td>
              <td className="px-3 py-3 text-center">{item.quantity}</td>
              <td className="px-3 py-3 text-end">{formatToman(item.unitPriceToman)}</td>
              <td className="px-3 py-3 text-end">{formatToman(item.lineTotalToman)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="ms-auto mt-6 w-full max-w-sm space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-ink-500">جمع اقلام</dt>
          <dd>{formatToman(order.subtotalToman)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-500">هزینه ارسال</dt>
          <dd>{formatToman(order.deliveryFeeToman)}</dd>
        </div>
        <div className="flex justify-between border-t border-ivory-300 pt-3 text-base font-bold">
          <dt>مبلغ قابل پرداخت</dt>
          <dd>{formatToman(order.totalToman)}</dd>
        </div>
      </dl>

      <footer className="mt-12 border-t border-ivory-300 pt-6 text-center text-xs text-ink-500">
        از خرید شما سپاسگزاریم.
      </footer>
    </article>
  );
}
