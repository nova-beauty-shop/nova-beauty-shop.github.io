import RequireAuth from '@/components/account/RequireAuth';
import Link from '@/components/common/Link';
import { EmptyState, ErrorState, SkeletonGrid } from '@/components/common/StateViews';
import { useAsync } from '@/hooks/useAsync';
import { formatDate, formatToman } from '@/lib/format';
import { fetchOrders } from '@/lib/orders';
import { ORDER_STATUS_LABELS } from '@/lib/orderLabels';

export default function OrdersPage() {
  return <RequireAuth>{() => <OrdersContent />}</RequireAuth>;
}

function OrdersContent() {
  const orders = useAsync(fetchOrders, []);

  return (
    <div className="container-nova py-12 md:py-16">
      <nav aria-label="مسیر صفحه" className="mb-6 text-sm text-ink-500">
        <Link to="/account" className="hover:text-burgundy-700">
          حساب کاربری
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ink-900">سفارش‌های من</span>
      </nav>

      <header className="space-y-2 border-b border-ivory-300 pb-8">
        <p className="eyebrow">سفارش‌ها</p>
        <h1 className="text-3xl md:text-4xl">سفارش‌های من</h1>
      </header>

      <div className="mt-10">
        {orders.loading && <SkeletonGrid count={2} />}
        {orders.error && <ErrorState onRetry={orders.retry} />}
        {orders.data && orders.data.length === 0 && (
          <EmptyState
            title="هنوز سفارشی ثبت نکرده‌اید"
            description="محصولات مورد علاقه خود را از فروشگاه انتخاب کنید."
            action={
              <Link to="/shop" className="btn-primary">
                مشاهده فروشگاه
              </Link>
            }
          />
        )}
        {orders.data && orders.data.length > 0 && (
          <ul className="space-y-4">
            {orders.data.map((order) => (
              <li key={order.id}>
                <Link
                  to={`/account/orders/${order.id}`}
                  className="flex flex-col gap-3 rounded-3xl border border-ivory-300 bg-ivory-50 p-6 shadow-soft transition hover:border-gold-500 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1">
                    <p className="font-medium text-ink-900" dir="ltr">
                      {order.orderNumber}
                    </p>
                    <p className="text-sm text-ink-500">{formatDate(order.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <span className="rounded-full bg-ivory-200 px-3 py-1 text-ink-700">{ORDER_STATUS_LABELS[order.status]}</span>
                    <span className="font-bold">{formatToman(order.totalToman)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
