import Link from '@/components/common/Link';
import type { DashboardLatestOrder, DashboardLowStockItem } from '@/lib/adminDashboard';
import { formatDate, formatNumber, formatToman } from '@/lib/format';
import { ORDER_STATUS_LABELS } from '@/lib/orderLabels';

export function LowStockPanel({ items, totalCount }: { items: DashboardLowStockItem[]; totalCount: number }) {
  return (
    <section className="rounded-3xl border border-ivory-300 bg-ivory-50 p-6 shadow-soft md:p-8">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl">کالاهای رو به اتمام</h2>
        <Link to="/admin/content" className="text-sm text-burgundy-700 underline-offset-4 hover:underline">
          مدیریت محصولات
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="mt-6 text-sm text-ink-500">همه کالاهای فعال موجودی کافی دارند.</p>
      ) : (
        <ul className="mt-6 divide-y divide-ivory-300">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-4 py-3">
              <span className="truncate text-sm text-ink-900">{item.name}</span>
              <span className="shrink-0 rounded-full bg-warning-100 px-3 py-1 text-xs font-medium text-warning-600">
                {formatNumber(item.stock)} عدد
              </span>
            </li>
          ))}
        </ul>
      )}
      {totalCount > items.length && (
        <p className="mt-4 text-xs text-ink-500">و {formatNumber(totalCount - items.length)} کالای دیگر</p>
      )}
    </section>
  );
}

export function LatestOrdersPanel({ orders }: { orders: DashboardLatestOrder[] }) {
  return (
    <section className="rounded-3xl border border-ivory-300 bg-ivory-50 p-6 shadow-soft md:p-8">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl">آخرین سفارش‌ها</h2>
        <Link to="/admin/orders" className="text-sm text-burgundy-700 underline-offset-4 hover:underline">
          همه سفارش‌ها
        </Link>
      </div>
      {orders.length === 0 ? (
        <p className="mt-6 text-sm text-ink-500">هنوز سفارشی ثبت نشده است.</p>
      ) : (
        <ul className="mt-6 divide-y divide-ivory-300">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                to={`/admin/orders/${order.id}`}
                className="flex flex-col gap-2 py-4 transition hover:text-burgundy-700 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink-900" dir="ltr">
                    {order.orderNumber}
                  </span>
                  <span className="block truncate text-xs text-ink-500">
                    {order.recipientName} · {formatDate(order.createdAt)}
                  </span>
                </span>
                <span className="flex items-center gap-3 text-sm">
                  <span className="rounded-full bg-ivory-200 px-3 py-1 text-xs text-ink-700">{ORDER_STATUS_LABELS[order.status]}</span>
                  <span className="font-medium text-ink-900">{formatToman(order.totalToman)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
