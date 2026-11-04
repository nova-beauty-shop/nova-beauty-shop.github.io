import RequireAuth from '@/components/account/RequireAuth';
import CardPaymentPanel from '@/components/order/CardPaymentPanel';
import OnlinePaymentPanel from '@/components/order/OnlinePaymentPanel';
import Link from '@/components/common/Link';
import { ErrorState, SkeletonGrid } from '@/components/common/StateViews';
import { useAsync } from '@/hooks/useAsync';
import { formatDate, formatToman } from '@/lib/format';
import { fetchOrder, type OrderStatus } from '@/lib/orders';
import { DELIVERY_LABELS, ORDER_STATUS_LABELS } from '@/lib/orderLabels';

const PAYABLE_STATUSES: OrderStatus[] = ['awaiting_payment', 'pending_review', 'paid'];

export default function OrderPage({ id }: { id: string }) {
  return <RequireAuth>{(user) => <OrderContent id={id} userId={user.id} />}</RequireAuth>;
}

function OrderContent({ id, userId }: { id: string; userId: string }) {
  const order = useAsync(() => fetchOrder(id), [id]);

  if (order.loading) {
    return (
      <div className="container-nova py-12">
        <SkeletonGrid count={2} />
      </div>
    );
  }

  if (order.error) {
    return (
      <div className="container-nova py-12">
        <ErrorState onRetry={order.retry} />
      </div>
    );
  }

  if (!order.data) {
    return (
      <div className="container-nova flex flex-col items-center gap-6 py-32 text-center">
        <p className="eyebrow">سفارش یافت نشد</p>
        <h1 className="text-3xl">این سفارش در حساب شما وجود ندارد</h1>
        <Link to="/account/orders" className="btn-primary">
          سفارش‌های من
        </Link>
      </div>
    );
  }

  const data = order.data;

  return (
    <div className="container-nova py-12 md:py-16">
      <header className="flex flex-col gap-4 border-b border-ivory-300 pb-8 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="eyebrow">جزئیات سفارش</p>
          <h1 className="text-3xl md:text-4xl" dir="ltr">
            {data.orderNumber}
          </h1>
          <p className="text-sm text-ink-500">ثبت شده در {formatDate(data.createdAt)}</p>
        </div>
        <span className="self-start rounded-full bg-burgundy-700 px-4 py-2 text-sm text-ivory-50 md:self-auto">
          {ORDER_STATUS_LABELS[data.status]}
        </span>
      </header>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
        <section className="rounded-3xl border border-ivory-300 bg-ivory-50 p-6 shadow-soft md:p-8">
          <h2 className="text-xl">اقلام سفارش</h2>
          <ul className="mt-6 divide-y divide-ivory-300">
            {data.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-4 py-4 text-sm">
                <div className="space-y-1">
                  <p className="font-medium text-ink-900">{item.productName}</p>
                  <p className="text-ink-500">
                    {item.brand}
                    {item.variantLabel ? ` · ${item.variantLabel}` : ''}
                  </p>
                  <p className="text-ink-500">تعداد: {item.quantity.toLocaleString('fa-IR')}</p>
                </div>
                <span className="shrink-0 font-medium">{formatToman(item.lineTotalToman)}</span>
              </li>
            ))}
          </ul>
        </section>

        <aside className="h-fit space-y-6 rounded-3xl border border-ivory-300 bg-ivory-50 p-6 shadow-soft md:p-8">
          <div className="space-y-3">
            <h2 className="text-xl">ارسال به</h2>
            <div className="space-y-1 text-sm leading-[1.8] text-ink-700">
              <p className="font-medium text-ink-900">{data.recipientName}</p>
              <p dir="ltr" className="text-start">
                {data.phone}
              </p>
              <p>
                {data.province}، {data.city}، {data.street}
              </p>
              <p dir="ltr" className="text-start text-ink-500">
                کد پستی: {data.postalCode}
              </p>
              <p>{DELIVERY_LABELS[data.deliveryMethod]}</p>
            </div>
          </div>

          <dl className="space-y-3 border-t border-ivory-300 pt-5 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-700">جمع اقلام</dt>
              <dd>{formatToman(data.subtotalToman)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-700">هزینه ارسال</dt>
              <dd>{data.deliveryFeeToman === 0 ? 'رایگان' : formatToman(data.deliveryFeeToman)}</dd>
            </div>
            <div className="flex justify-between border-t border-ivory-300 pt-4 text-base">
              <dt className="font-medium">مبلغ کل</dt>
              <dd className="font-bold">{formatToman(data.totalToman)}</dd>
            </div>
          </dl>
        </aside>
      </div>

      {data.paymentProvider && (PAYABLE_STATUSES.includes(data.status) || data.status === 'paid') && (
        <div className="mt-10">
          <OnlinePaymentPanel order={data} onChanged={order.retry} />
        </div>
      )}
      {!data.paymentProvider && PAYABLE_STATUSES.includes(data.status) && (
        <div className="mt-10">
          <CardPaymentPanel order={data} userId={userId} onChanged={order.retry} />
        </div>
      )}
    </div>
  );
}
