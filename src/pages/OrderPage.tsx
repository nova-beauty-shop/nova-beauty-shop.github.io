import { CheckCircle2, Clock, PackageCheck, Truck } from "lucide-react";
import RequireAuth from "@/components/account/RequireAuth";
import CardPaymentPanel from "@/components/order/CardPaymentPanel";
import OnlinePaymentPanel from "@/components/order/OnlinePaymentPanel";
import Link from "@/components/common/Link";
import { ErrorState, SkeletonGrid } from "@/components/common/StateViews";
import { useAsync } from "@/hooks/useAsync";
import { formatDate, formatToman } from "@/lib/format";
import { fetchOrder, type OrderStatus } from "@/lib/orders";
import { DELIVERY_LABELS, ORDER_STATUS_LABELS } from "@/lib/orderLabels";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { resolveOrderDynamicTotals } from "@/lib/storeSettings";

const PAYABLE_STATUSES: OrderStatus[] = ["awaiting_payment", "pending_review", "paid"];

function getCustomerStatusBanner(status: OrderStatus, trackingCode: string | null) {
  switch (status) {
    case "awaiting_payment":
      return {
        title: "سفارش شما ثبت شد — در انتظار ثبت فیش پرداخت",
        desc: "لطفاً مبلغ سفارش را کارت به کارت کرده و تصویر فیش واریزی را در فرم پایین همین صفحه بارگذاری کنید.",
        tone: "bg-ivory-200/80 border-gold-500/40 text-ink-900",
        step: 1,
      };
    case "pending_review":
      return {
        title: "فیش پرداخت شما دریافت شد و در حال بررسی است",
        desc: "همکاران ما به زودی فیش واریزی شما را تأیید می‌کنند و وضعیت سفارش به «آماده ارسال» تغییر خواهد کرد.",
        tone: "bg-ivory-200/80 border-gold-500/40 text-ink-900",
        step: 1,
      };
    case "paid":
    case "processing":
    case "preparing":
      return {
        title: "سفارش شما ثبت و تأیید شد و آماده ارسال است!",
        desc: "پرداخت شما با موفقیت تأیید گردید. سفارش شما در حال بسته‌بندی و تحویل به واحد ارسال است.",
        tone: "bg-success-100 border-success-600/30 text-success-600",
        step: 2,
      };
    case "shipped":
      return {
        title: "سفارش شما ارسال شد!",
        desc: trackingCode
          ? `بسته شما ارسال شده است. کد رهگیری مرسوله: ${trackingCode}`
          : "بسته شما تحویل واحد ارسال شده و در مسیر رسیدن به دست شماست.",
        tone: "bg-success-100 border-success-600/30 text-success-600",
        step: 3,
      };
    case "delivered":
      return {
        title: "سفارش تحویل داده شد ✓",
        desc: "این سفارش با موفقیت به دست شما رسیده است. از خرید شما از نُوا شاپ سپاسگزاریم!",
        tone: "bg-success-100 border-success-600/30 text-success-600",
        step: 4,
      };
    default:
      return null;
  }
}

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
  const totalItemCount = data.items.reduce((sum, it) => sum + it.quantity, 0);
  const dynamicPricing = resolveOrderDynamicTotals({ province: data.province, city: data.city, subtotalToman: data.subtotalToman, dbDeliveryFeeToman: data.deliveryFeeToman, dbTotalToman: data.totalToman, itemCount: totalItemCount, freeThreshold: store.data?.courierFreeThresholdToman ?? 2000000 });
  const banner = getCustomerStatusBanner(data.status, data.trackingCode);

  const steps = [
    { id: 1, label: "ثبت سفارش و بررسی", icon: Clock },
    { id: 2, label: "تأیید شده و آماده ارسال", icon: CheckCircle2 },
    { id: 3, label: "ارسال شده", icon: Truck },
    { id: 4, label: "تحویل شده ✓", icon: PackageCheck },
  ];

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

      {banner && (
        <section className={`mt-8 rounded-3xl border p-6 shadow-soft ${banner.tone}`}>
          <h2 className="text-lg font-bold">{banner.title}</h2>
          <p className="mt-1.5 text-sm leading-relaxed opacity-90">{banner.desc}</p>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {steps.map((s) => {
              const Icon = s.icon;
              const active = banner.step >= s.id;
              return (
                <div
                  key={s.id}
                  className={`flex items-center gap-2.5 rounded-2xl border px-3.5 py-3 text-xs font-bold transition ${
                    active
                      ? "border-burgundy-700 bg-burgundy-700 text-ivory-50 shadow-soft"
                      : "border-ivory-300 bg-ivory-50/80 text-ink-500"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{s.label}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

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
                    {item.variantLabel ? ` · ${item.variantLabel}` : ""}
                  </p>
                  <p className="text-ink-500">تعداد: {item.quantity.toLocaleString("fa-IR")}</p>
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
              <dd>{data.deliveryFeeToman === 0 ? "رایگان" : formatToman(data.deliveryFeeToman)}</dd>
            </div>
            <div className="flex justify-between border-t border-ivory-300 pt-4 text-base">
              <dt className="font-medium">مبلغ کل</dt>
              <dd className="font-bold">{formatToman(data.totalToman)}</dd>
            </div>
          </dl>
        </aside>
      </div>

      {data.paymentProvider && (PAYABLE_STATUSES.includes(data.status) || data.status === "paid") && (
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
