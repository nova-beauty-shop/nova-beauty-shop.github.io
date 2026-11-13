import { useState, type ReactNode } from "react";
import { ArrowRight, CheckCircle, CheckCircle2, Clock, PackageCheck, Printer, Send, Truck, XCircle } from "lucide-react";
import AdminGate from "@/components/admin/AdminGate";
import { AdminPageHeader } from "@/components/admin/AdminChrome";
import ReceiptPreview from "@/components/admin/payments/ReceiptPreview";
import Link from "@/components/common/Link";
import { ErrorState, SkeletonGrid } from "@/components/common/StateViews";
import { useAsync } from "@/hooks/useAsync";
import { advanceOrderStatusTo, fetchAdminOrderDetail, type AdminOrderDetail as Detail } from "@/lib/adminOrders";
import { formatDate, formatToman } from "@/lib/format";
import { resolveOrderDynamicTotals } from "@/lib/storeSettings";
import { DELIVERY_LABELS, ORDER_STATUS_LABELS } from "@/lib/orderLabels";
import { reviewReceipt } from "@/lib/payments";
import type { AdminAccess } from "@/lib/adminSettings";

const PAYMENT_LABELS: Record<Detail["payments"][number]["status"], string> = {
  pending: "در انتظار بررسی و تأیید شما",
  approved: "تأیید شده ✓",
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

  async function handleStep1Approve(receiptId?: string) {
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
          "سفارش شما ثبت و تأیید شد و آماده ارسال است.",
          "",
        );
      }
      setActionMessage("✓ گام ۱ انجام شد: فیش تأیید گردید و پیام «آماده ارسال» برای مشتری ثبت شد.");
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

  async function handleStep2Ship() {
    if (!order.data || busy) return;
    setBusy(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const code = trackingInput.trim() || order.data.trackingCode || "ارسال با پست / پیک";
      await advanceOrderStatusTo(
        order.data.id,
        order.data.status,
        "shipped",
        "بسته شما تحویل پست/پیک داده شد و ارسال گردید.",
        code,
      );
      setActionMessage("✓ گام ۲ انجام شد: وضعیت سفارش به «ارسال شده» تغییر یافت.");
      order.retry();
    } catch {
      setActionError("خطا در ثبت ارسال سفارش.");
    } finally {
      setBusy(false);
    }
  }

  async function handleStep3Deliver() {
    if (!order.data || busy) return;
    setBusy(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const code = trackingInput.trim() || order.data.trackingCode || "تحویل شده";
      await advanceOrderStatusTo(
        order.data.id,
        order.data.status,
        "delivered",
        "سفارش با موفقیت تحویل مشتری گردید.",
        code,
      );
      setActionMessage("✅ گام ۳ انجام شد: تیک نهایی تحویل سفارش با موفقیت ثبت شد.");
      order.retry();
    } catch {
      setActionError("خطا در ثبت تحویل نهایی.");
    } finally {
      setBusy(false);
    }
  }

  const isStep1Done = order.data ? ["paid", "processing", "preparing", "shipped", "delivered"].includes(order.data.status) : false;
  const isStep2Done = order.data ? ["shipped", "delivered"].includes(order.data.status) : false;
  const isStep3Done = order.data?.status === "delivered";

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
            <div className="mt-6 rounded-2xl border border-success-600/30 bg-success-100 px-5 py-4 text-sm font-bold text-success-600">
              {actionMessage}
            </div>
          )}
          {actionError && (
            <div className="mt-6 rounded-2xl bg-error-100 px-5 py-4 text-sm font-bold text-error-600">
              {actionError}
            </div>
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

              <Card title="۲. تصویر فیش واریزی و دکمه تأیید (گام ۱)">
                {order.data.payments.length === 0 ? (
                  <p className="rounded-2xl bg-ivory-200/50 p-4 text-sm text-ink-600">
                    مشتری هنوز تصویر فیش واریزی برای این سفارش آپلود نکرده است.
                  </p>
                ) : (
                  <ul className="space-y-6 text-sm">
                    {order.data.payments.map((payment) => (
                      <li key={payment.id} className="grid gap-6 rounded-2xl border border-ivory-300 bg-ivory-100/70 p-5 md:grid-cols-[260px_1fr]">
                        <div className="space-y-3">
                          {payment.storagePath && (
                            <div className="overflow-hidden rounded-2xl border border-ivory-300 bg-white">
                              <ReceiptPreview storagePath={payment.storagePath} />
                            </div>
                          )}

                          {/* Step 1 Approve/Reject button directly beneath the receipt image */}
                          {canEdit && (
                            <div>
                              {payment.status === "approved" || isStep1Done ? (
                                <div className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-success-600/30 bg-success-100 px-3 text-xs font-bold text-success-600">
                                  <CheckCircle className="h-4 w-4 shrink-0" />
                                  <span>✓ گام ۱: فیش تأیید شد</span>
                                </div>
                              ) : payment.status === "pending" ? (
                                <div className="space-y-2">
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={() => void handleStep1Approve(payment.id)}
                                      className="btn-primary h-10 flex-1 px-3 text-xs"
                                    >
                                      <CheckCircle className="h-4 w-4 shrink-0" />
                                      {busy ? "در حال ثبت..." : "گام ۱: تأیید فیش و سفارش"}
                                    </button>
                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={() => setRejectingReceiptId(payment.id)}
                                      className="btn-outline h-10 px-3 text-xs text-error-600"
                                    >
                                      <XCircle className="h-4 w-4 shrink-0" />
                                      رد فیش
                                    </button>
                                  </div>
                                  {rejectingReceiptId === payment.id && (
                                    <div className="space-y-2 pt-1">
                                      <input
                                        type="text"
                                        placeholder="دلیل رد فیش برای مشتری..."
                                        value={rejectReason}
                                        onChange={(e) => setRejectReason(e.target.value)}
                                        className="field h-9 text-xs"
                                      />
                                      <div className="flex gap-2">
                                        <button type="button" disabled={busy} onClick={() => void handleRejectReceipt(payment.id)} className="btn-primary h-8 px-3 text-xs">
                                          ثبت رد فیش
                                        </button>
                                        <button type="button" disabled={busy} onClick={() => setRejectingReceiptId(null)} className="btn-outline h-8 px-3 text-xs">
                                          انصراف
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : null}
                            </div>
                          )}
                        </div>

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
                  <Row label="هزینه ارسال" value={resolveOrderDynamicTotals({ province: order.data.province, city: order.data.city, subtotalToman: order.data.subtotalToman, dbDeliveryFeeToman: order.data.deliveryFeeToman, dbTotalToman: resolveOrderDynamicTotals({ province: order.data.province, city: order.data.city, subtotalToman: order.data.subtotalToman, dbDeliveryFeeToman: order.data.deliveryFeeToman, dbTotalToman: order.data.totalToman, itemCount: order.data.items.reduce((s, i) => s + i.quantity, 0) }).totalToman, itemCount: order.data.items.reduce((s, i) => s + i.quantity, 0) }).deliveryFeeToman === 0 ? "رایگان" : formatToman(order.data.deliveryFeeToman)} />
                  <Row label="مبلغ کل سفارش" value={formatToman(order.data.totalToman)} strong />
                </dl>
              </Card>
            </div>

            <aside className="space-y-8">
              <Card title="مراحل ارسال و تحویل (گام ۲ و ۳)">
                <div className="space-y-5">
                  {/* Step 2 Box */}
                  <div className="space-y-2.5 border-b border-ivory-300 pb-5">
                    <p className="text-xs font-bold text-burgundy-700">گام ۲: ارسال کالا به مشتری</p>
                    {isStep2Done ? (
                      <div className="flex items-center gap-2 rounded-2xl bg-success-100 p-3.5 text-xs font-bold text-success-600">
                        <Truck className="h-4 w-4 shrink-0" />
                        <span>✓ کالا ارسال شده است</span>
                      </div>
                    ) : (
                      <>
                        <input
                          type="text"
                          dir="ltr"
                          placeholder="کد رهگیری پستی (اختیاری)"
                          value={trackingInput}
                          onChange={(e) => setTrackingInput(e.target.value)}
                          disabled={!isStep1Done}
                          className="field text-xs disabled:opacity-50"
                        />
                        {canEdit && (
                          <button
                            type="button"
                            disabled={busy || !isStep1Done}
                            onClick={() => void handleStep2Ship()}
                            className="btn-primary w-full text-xs"
                          >
                            <Send className="h-4 w-4" />
                            {busy ? "در حال ثبت..." : "گام ۲: ثبت ارسال کالا"}
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  {/* Step 3 Box */}
                  <div className="space-y-2.5">
                    <p className="text-xs font-bold text-burgundy-700">گام ۳: تیک نهایی تحویل</p>
                    {isStep3Done ? (
                      <div className="flex items-center gap-2 rounded-2xl bg-success-100 p-3.5 text-xs font-bold text-success-600">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>✅ تیک آخر خورده (تحویل داده شد)</span>
                      </div>
                    ) : (
                      canEdit && (
                        <button
                          type="button"
                          disabled={busy || !isStep2Done}
                          onClick={() => void handleStep3Deliver()}
                          className="btn-primary w-full text-xs"
                        >
                          <PackageCheck className="h-4 w-4" />
                          {busy ? "در حال ثبت..." : "گام ۳: زدن تیک آخر (تحویل داده شد ✓)"}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </Card>

              <Card title="چاپ فاکتور">
                <Link to={`/admin/orders/${order.data.id}/invoice`} className="btn-outline w-full">
                  <Printer className="h-4 w-4" aria-hidden="true" />
                  مشاهده و چاپ فاکتور سفارش
                </Link>
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
