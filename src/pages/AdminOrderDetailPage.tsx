import { useState, type ReactNode } from "react";
import { ArrowRight, CheckCircle, PackageCheck, Printer, Send, Truck, XCircle } from "lucide-react";
import AdminGate from "@/components/admin/AdminGate";
import { AdminPageHeader } from "@/components/admin/AdminChrome";
import OrderStatusPanel from "@/components/admin/orders/OrderStatusPanel";
import ReceiptPreview from "@/components/admin/payments/ReceiptPreview";
import Link from "@/components/common/Link";
import { ErrorState, SkeletonGrid } from "@/components/common/StateViews";
import { useAsync } from "@/hooks/useAsync";
import { advanceOrderStatusTo, fetchAdminOrderDetail, type AdminOrderDetail as Detail } from "@/lib/adminOrders";
import { formatDate, formatToman } from "@/lib/format";
import { DELIVERY_LABELS, ORDER_STATUS_LABELS } from "@/lib/orderLabels";
import { reviewReceipt } from "@/lib/payments";
import type { AdminAccess } from "@/lib/adminSettings";

const PAYMENT_LABELS: Record<Detail["payments"][number]["status"], string> = {
  pending: "در انتظار بررسی و تأیید شما",
  approved: "تأیید شده",
  rejected: "رد شده",
};

export default function AdminOrderDetailPage({ orderId }: { orderId: string }) {
  return <AdminGate>{(access) => <AdminOrderDetailContent orderId={orderId} access={access} />}</AdminGate>;
}

function AdminOrderDetailContent({ orderId, access }: { orderId: string; access: AdminAccess }) {
  const order = useAsync(() => fetchAdminOrderDetail(orderId), [orderId]);
  const canEdit = access.role === "owner" || access.role === "manager";

  const [busy, setBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [trackingInput, setTrackingInput] = useState("");
  const [rejectingReceiptId, setRejectingReceiptId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  async function handleApproveAndPrepare(receiptId?: string) {
    if (!order.data || busy) return;
    setBusy(true);
    setActionError(null);
    setActionMessage(null);
    try {
      let currentStatus = order.data.status;
      if (receiptId) {
        await reviewReceipt(receiptId, true, "");
        currentStatus = "paid";
      }
      if (currentStatus === "paid" || currentStatus === "processing") {
        await advanceOrderStatusTo(
          order.data.id,
          currentStatus,
          "preparing",
          "سفارش شما تأیید شد و در حال آماده‌سازی برای ارسال است.",
          "",
        );
      }
      setActionMessage("سفارش با موفقیت تأیید شد و پیام «آماده ارسال» برای مشتری در سایت ثبت گردید.");
      order.retry();
    } catch {
      setActionError("خطا در تأیید سفارش. لطفاً دوباره تلاش کنید.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRejectReceipt(receiptId: string) {
    if (busy) return;
    if (rejectReason.trim().length < 3) {
      setActionError("لطفاً دلیل رد فیش را (حداقل ۳ حرف) وارد کنید.");
      return;
    }
    setBusy(true);
    setActionError(null);
    setActionMessage(null);
    try {
      await reviewReceipt(receiptId, false, rejectReason.trim());
      setRejectingReceiptId(null);
      setRejectReason("");
      setActionMessage("فیش رد شد و دلیل آن برای مشتری ارسال گردید.");
      order.retry();
    } catch {
      setActionError("خطا در ثبت رد فیش.");
    } finally {
      setBusy(false);
    }
  }

  async function handleShipOrder() {
    if (!order.data || busy) return;
    const code = trackingInput.trim() || order.data.trackingCode || "ارسال با پیک / پست";
    setBusy(true);
    setActionError(null);
    setActionMessage(null);
    try {
      await advanceOrderStatusTo(
        order.data.id,
        order.data.status,
        "shipped",
        "بسته شما تحویل پست/پیک داده شد و ارسال گردید.",
        code,
      );
      setActionMessage("وضعیت سفارش به «ارسال شده» تغییر یافت و به مشتری اطلاع داده شد.");
      order.retry();
    } catch {
      setActionError("خطا در ثبت ارسال سفارش. لطفاً دوباره تلاش کنید.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeliverOrder() {
    if (!order.data || busy) return;
    setBusy(true);
    setActionError(null);
    setActionMessage(null);
    try {
      await advanceOrderStatusTo(
        order.data.id,
        order.data.status,
        "delivered",
        "سفارش با موفقیت تحویل مشتری گردید.",
        order.data.trackingCode || "",
      );
      setActionMessage("تیک نهایی تحویل سفارش با موفقیت ثبت شد.");
      order.retry();
    } catch {
      setActionError("خطا در ثبت تحویل نهایی.");
    } finally {
      setBusy(false);
    }
  }

  const pendingReceipt = order.data?.payments.find((p) => p.status === "pending");

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
            eyebrow="پرونده کامل سفارش"
            title={`سفارش ${order.data.orderNumber} — ${order.data.recipientName}`}
            description={`ثبت شده در ${formatDate(order.data.createdAt)} · وضعیت فعلی: ${ORDER_STATUS_LABELS[order.data.status]}`}
          />

          {actionMessage && (
            <div className="mt-6 rounded-2xl border border-success-600/30 bg-success-100 px-5 py-4 text-sm font-medium text-success-600">
              {actionMessage}
            </div>
          )}
          {actionError && (
            <div className="mt-6 rounded-2xl bg-error-100 px-5 py-4 text-sm font-medium text-error-600">
              {actionError}
            </div>
          )}

          {canEdit && (
            <section className="mt-8 rounded-3xl border-2 border-burgundy-700/25 bg-ivory-50 p-6 shadow-soft md:p-8">
              <h2 className="text-lg font-bold text-ink-900">مراحل سریع مدیریت و ارسال سفارش (گام به گام)</h2>
              <p className="mt-1 text-xs text-ink-500">
                با زدن هر دکمه، وضعیت سفارش در حساب کاربری مشتری بلافاصله به‌روز می‌شود و پیام مربوطه به او نمایش داده می‌شود.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className={`flex flex-col justify-between rounded-2xl border p-5 ${
                  ["pending_review", "paid", "processing"].includes(order.data.status)
                    ? "border-burgundy-700 bg-ivory-200/60"
                    : "border-ivory-300 bg-ivory-100/60 opacity-75"
                }`}>
                  <div>
                    <span className="inline-block rounded-full bg-burgundy-700 px-2.5 py-0.5 text-xs font-bold text-ivory-50">
                      گام ۱: تأیید و آماده‌سازی
                    </span>
                    <h3 className="mt-3 font-bold text-ink-900">تأیید سفارش و فیش واریزی</h3>
                    <p className="mt-1 text-xs leading-relaxed text-ink-600">
                      فیش واریزی تأیید می‌شود و به مشتری پیام می‌رود که: «سفارش شما ثبت و تأیید شد و آماده ارسال است».
                    </p>
                  </div>
                  <div className="mt-4">
                    {["preparing", "shipped", "delivered"].includes(order.data.status) ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-success-600">
                        <CheckCircle className="h-4 w-4" />
                        تأیید و آماده ارسال شده
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={busy || (!pendingReceipt && !["paid", "processing"].includes(order.data.status))}
                        onClick={() => void handleApproveAndPrepare(pendingReceipt?.id)}
                        className="btn-primary w-full text-xs"
                      >
                        <CheckCircle className="h-4 w-4" />
                        {busy ? "در حال انجام..." : "تأیید سفارش و آماده ارسال"}
                      </button>
                    )}
                  </div>
                </div>

                <div className={`flex flex-col justify-between rounded-2xl border p-5 ${
                  order.data.status === "preparing"
                    ? "border-burgundy-700 bg-ivory-200/60"
                    : "border-ivory-300 bg-ivory-100/60 opacity-75"
                }`}>
                  <div>
                    <span className="inline-block rounded-full bg-burgundy-700 px-2.5 py-0.5 text-xs font-bold text-ivory-50">
                      گام ۲: ارسال بسته
                    </span>
                    <h3 className="mt-3 font-bold text-ink-900">ثبت ارسال به مشتری</h3>
                    <p className="mt-1 text-xs leading-relaxed text-ink-600">
                      کد رهگیری پستی (اختیاری) را وارد کنید و دکمه ارسال را بزنید تا مشتری بداند بسته ارسال شده است.
                    </p>
                    {!["shipped", "delivered"].includes(order.data.status) && (
                      <input
                        type="text"
                        dir="ltr"
                        placeholder="کد رهگیری پستی (اختیاری)"
                        value={trackingInput}
                        onChange={(e) => setTrackingInput(e.target.value)}
                        className="field mt-3 h-9 text-xs"
                      />
                    )}
                  </div>
                  <div className="mt-4">
                    {["shipped", "delivered"].includes(order.data.status) ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-success-600">
                        <Truck className="h-4 w-4" />
                        بسته ارسال شده است
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={busy || !["paid", "processing", "preparing"].includes(order.data.status)}
                        onClick={() => void handleShipOrder()}
                        className="btn-primary w-full text-xs"
                      >
                        <Send className="h-4 w-4" />
                        {busy ? "در حال ثبت..." : "ثبت ارسال سفارش"}
                      </button>
                    )}
                  </div>
                </div>

                <div className={`flex flex-col justify-between rounded-2xl border p-5 ${
                  order.data.status === "shipped"
                    ? "border-burgundy-700 bg-ivory-200/60"
                    : "border-ivory-300 bg-ivory-100/60 opacity-75"
                }`}>
                  <div>
                    <span className="inline-block rounded-full bg-burgundy-700 px-2.5 py-0.5 text-xs font-bold text-ivory-50">
                      گام ۳: تیک نهایی تحویل
                    </span>
                    <h3 className="mt-3 font-bold text-ink-900">تحویل کامل به مشتری</h3>
                    <p className="mt-1 text-xs leading-relaxed text-ink-600">
                      پس از رسیدن بسته به دست مشتری، این تیک نهایی را بزنید تا پرونده سفارش تکمیل شود.
                    </p>
                  </div>
                  <div className="mt-4">
                    {order.data.status === "delivered" ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-success-600">
                        <PackageCheck className="h-4 w-4" />
                        تحویل داده شده (تکمیل شد)
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={busy || order.data.status !== "shipped"}
                        onClick={() => void handleDeliverOrder()}
                        className="btn-primary w-full text-xs"
                      >
                        <PackageCheck className="h-4 w-4" />
                        {busy ? "در حال ثبت..." : "زدن تیک نهایی (تحویل شد)"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
            <div className="space-y-8">
              <Card title="۱. مشخصات مشتری و نشانی ارسال">
                <div className="grid gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-ink-500">نام و نام خانوادگی گیرنده</p>
                    <p className="mt-1 text-base font-bold text-ink-900">{order.data.recipientName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-500">شماره تماس مشتری</p>
                    <p className="mt-1 text-base font-bold text-burgundy-700" dir="ltr">
                      {order.data.phone}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs text-ink-500">نشانی دقیق پستی</p>
                    <p className="mt-1 font-medium leading-[1.9] text-ink-800">
                      استان {order.data.province}، شهر {order.data.city}، {order.data.street}
                    </p>
                    <p className="mt-1 text-xs text-ink-500">
                      کد پستی: <span dir="ltr" className="font-mono font-bold text-ink-800">{order.data.postalCode}</span> · روش ارسال: {DELIVERY_LABELS[order.data.deliveryMethod]}
                    </p>
                  </div>
                </div>
              </Card>

              <Card title="۲. تصویر فیش واریزی و اطلاعات پرداخت">
                {order.data.payments.length === 0 ? (
                  <p className="rounded-2xl bg-ivory-200/50 p-4 text-sm text-ink-600">
                    مشتری هنوز تصویر فیش واریزی برای این سفارش آپلود نکرده است.
                  </p>
                ) : (
                  <ul className="space-y-6 text-sm">
                    {order.data.payments.map((payment) => (
                      <li key={payment.id} className="grid gap-6 rounded-2xl border border-ivory-300 bg-ivory-100/70 p-5 md:grid-cols-[240px_1fr]">
                        {payment.storagePath && (
                          <div className="overflow-hidden rounded-2xl border border-ivory-300 bg-white">
                            <ReceiptPreview storagePath={payment.storagePath} />
                          </div>
                        )}
                        <div className="flex flex-col justify-between gap-4">
                          <div className="space-y-2">
                            <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${
                              payment.status === "approved"
                                ? "bg-success-100 text-success-600"
                                : payment.status === "rejected"
                                ? "bg-error-100 text-error-600"
                                : "bg-gold-500/25 text-burgundy-900"
                            }`}>
                              {PAYMENT_LABELS[payment.status]}
                            </span>
                            <p className="text-lg font-bold text-ink-900">مبلغ فیش: {formatToman(payment.amountToman)}</p>
                            <p className="text-xs text-ink-500">زمان ارسال فیش: {formatDate(payment.createdAt)}</p>
                            {payment.payerName && <p className="text-ink-800">نام واریزکننده: <span className="font-bold">{payment.payerName}</span></p>}
                            {payment.cardLast4 && <p className="text-ink-800" dir="ltr">چهار رقم آخر کارت: **** {payment.cardLast4}</p>}
                            {payment.bankName && <p className="text-ink-800">بانک مبدأ: {payment.bankName}</p>}
                            {payment.trackingCode && <p className="text-ink-800" dir="ltr">شماره پیگیری فیش: {payment.trackingCode}</p>}
                            {payment.reviewNote && <p className="mt-2 rounded-xl bg-error-100 px-3 py-2 text-xs text-error-600">دلیل رد: {payment.reviewNote}</p>}
                          </div>

                          {canEdit && payment.status === "pending" && (
                            <div className="space-y-3 border-t border-ivory-300 pt-4">
                              {rejectingReceiptId === payment.id ? (
                                <div className="space-y-2">
                                  <input
                                    type="text"
                                    placeholder="دلیل رد فیش برای مشتری (مثلاً مبلغ نادرست است)"
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    className="field text-xs"
                                  />
                                  <div className="flex gap-2">
                                    <button type="button" disabled={busy} onClick={() => void handleRejectReceipt(payment.id)} className="btn-primary h-9 px-4 text-xs">
                                      ثبت رد فیش
                                    </button>
                                    <button type="button" disabled={busy} onClick={() => setRejectingReceiptId(null)} className="btn-outline h-9 px-4 text-xs">
                                      انصراف
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-wrap gap-2.5">
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => void handleApproveAndPrepare(payment.id)}
                                    className="btn-primary h-10 px-5 text-xs"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                    تأیید فیش و آماده‌سازی سفارش
                                  </button>
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => setRejectingReceiptId(payment.id)}
                                    className="btn-outline h-10 px-4 text-xs"
                                  >
                                    <XCircle className="h-4 w-4" />
                                    رد فیش
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card title="۳. اقلام سفارش داده‌شده توسط مشتری">
                <ul className="divide-y divide-ivory-300">
                  {order.data.items.map((item) => (
                    <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm">
                      <div>
                        <p className="text-base font-bold text-ink-900">{item.productName}</p>
                        <p className="mt-0.5 text-xs text-ink-500">
                          برند: {item.brand}
                          {item.variantLabel ? ` · مدل/رنگ: ${item.variantLabel}` : ""}
                        </p>
                      </div>
                      <div className="text-end">
                        <p className="text-xs text-ink-600">
                          تعداد: <span className="font-bold text-ink-900">{item.quantity} عدد</span> × {formatToman(item.unitPriceToman)}
                        </p>
                        <p className="mt-0.5 font-bold text-burgundy-700">{formatToman(item.lineTotalToman)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                <dl className="mt-4 space-y-2 border-t border-ivory-300 pt-4 text-sm">
                  <Row label="جمع اقلام" value={formatToman(order.data.subtotalToman)} />
                  <Row label="هزینه ارسال" value={order.data.deliveryFeeToman === 0 ? "رایگان" : formatToman(order.data.deliveryFeeToman)} />
                  <Row label="مبلغ کل سفارش" value={formatToman(order.data.totalToman)} strong />
                </dl>
              </Card>
            </div>

            <aside className="space-y-8">
              <Card title="چاپ فاکتور">
                <Link to={`/admin/orders/${order.data.id}/invoice`} className="btn-outline w-full">
                  <Printer className="h-4 w-4" aria-hidden="true" />
                  مشاهده و چاپ فاکتور سفارش
                </Link>
              </Card>

              <Card title="تغییر دستی وضعیت (پیشرفته)">
                <p className="mb-4 text-sm">
                  وضعیت فعلی: <span className="font-bold text-burgundy-700">{ORDER_STATUS_LABELS[order.data.status]}</span>
                </p>
                {order.data.trackingCode && (
                  <p className="mb-4 text-sm">
                    کد رهگیری ثبت‌شده: <span dir="ltr" className="font-mono font-bold">{order.data.trackingCode}</span>
                  </p>
                )}
                <OrderStatusPanel order={order.data} canEdit={canEdit} onUpdated={order.retry} />
              </Card>

              <Card title="تاریخچه مراحل سفارش">
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
      <h2 className="mb-5 text-lg font-bold text-ink-900">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-500">{label}</dt>
      <dd className={strong ? "font-bold text-ink-900" : "text-ink-700"}>{value}</dd>
    </div>
  );
}
