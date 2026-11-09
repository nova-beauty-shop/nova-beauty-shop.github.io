import { useState, type FormEvent } from "react";
import { CheckCircle, ChevronLeft, ChevronRight, Eye, PackageCheck, Search, Send, Truck, XCircle } from "lucide-react";
import AdminGate from "@/components/admin/AdminGate";
import { AdminPageHeader } from "@/components/admin/AdminChrome";
import ReceiptPreview from "@/components/admin/payments/ReceiptPreview";
import Link from "@/components/common/Link";
import { EmptyState, ErrorState, SkeletonGrid } from "@/components/common/StateViews";
import { useAsync } from "@/hooks/useAsync";
import {
  ADMIN_ORDER_PAGE_SIZE,
  ADMIN_ORDER_STATUSES,
  advanceOrderStatusTo,
  fetchAdminOrderPage,
  type AdminOrderRow,
} from "@/lib/adminOrders";
import { formatDate, formatToman } from "@/lib/format";
import { ORDER_STATUS_LABELS } from "@/lib/orderLabels";
import { reviewReceipt } from "@/lib/payments";
import type { OrderStatus } from "@/lib/orders";

export default function AdminOrdersPage() {
  return <AdminGate>{() => <AdminOrdersContent />}</AdminGate>;
}

function AdminOrdersContent() {
  const [draftSearch, setDraftSearch] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<OrderStatus | null>(null);
  const [page, setPage] = useState(0);
  const orders = useAsync(() => fetchAdminOrderPage({ search, status, page }), [search, status, page]);

  const total = orders.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / ADMIN_ORDER_PAGE_SIZE));

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(0);
    setSearch(draftSearch.trim());
  }

  return (
    <div className="container-nova py-12 md:py-16">
      <AdminPageHeader
        eyebrow="مدیریت آسان سفارش‌ها"
        title="سفارش‌های مشتریان"
        description="در هر کارت، نام و آدرس مشتری، کالاهای سفارش داده‌شده و عکس فیش واریزی را یکجا ببینید و با یک کلیک سفارش را تأیید و ارسال کنید."
      />

      <div className="mt-10 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <form onSubmit={handleSearch} role="search" className="flex flex-1 gap-3">
            <label htmlFor="order-search" className="sr-only">
              جستجوی سفارش
            </label>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" aria-hidden="true" />
              <input
                id="order-search"
                type="search"
                value={draftSearch}
                onChange={(event) => setDraftSearch(event.target.value)}
                placeholder="جستجوی شماره سفارش، نام مشتری یا شماره موبایل..."
                className="field ps-11"
              />
            </div>
            <button type="submit" className="btn-primary">
              جستجو
            </button>
          </form>

          <label className="flex items-center gap-3 text-sm text-ink-700">
            فیلتر وضعیت:
            <select
              value={status ?? ""}
              onChange={(event) => {
                setPage(0);
                setStatus(event.target.value === "" ? null : (event.target.value as OrderStatus));
              }}
              className="field h-11 w-auto min-w-[12rem]"
            >
              <option value="">همه سفارش‌ها</option>
              {ADMIN_ORDER_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {ORDER_STATUS_LABELS[item]}
                </option>
              ))}
            </select>
          </label>
        </div>

        {orders.loading && <SkeletonGrid count={3} />}
        {orders.error && <ErrorState onRetry={orders.retry} />}
        {orders.data && orders.data.rows.length === 0 && (
          <EmptyState title="سفارشی پیدا نشد" description="هنوز سفارشی با این مشخصات ثبت نشده است." />
        )}

        {orders.data && orders.data.rows.length > 0 && (
          <div className="space-y-6">
            {orders.data.rows.map((row) => (
              <AdminOrderCard key={row.id} row={row} onUpdated={orders.retry} />
            ))}
          </div>
        )}

        {orders.data && total > 0 && (
          <nav aria-label="صفحه‌بندی سفارش‌ها" className="flex items-center justify-between gap-4 pt-4 text-sm text-ink-700">
            <span>
              صفحه {page + 1} از {pageCount} · مجموعاً {total} سفارش
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(0, current - 1))}
                disabled={page === 0}
                className="btn-outline h-10 px-4"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
                قبلی
              </button>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
                disabled={page + 1 >= pageCount}
                className="btn-outline h-10 px-4"
              >
                بعدی
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}

function AdminOrderCard({ row, onUpdated }: { row: AdminOrderRow; onUpdated: () => void }) {
  const [busy, setBusy] = useState(false);
  const [trackingInput, setTrackingInput] = useState(row.trackingCode ?? "");
  const [notice, setNotice] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const latestReceipt = row.payments[0] ?? null;
  const pendingReceipt = row.payments.find((p) => p.status === "pending") ?? null;

  async function handleApprove() {
    if (busy) return;
    setBusy(true);
    setErr(null);
    setNotice(null);
    try {
      let currentStatus = row.status;
      if (pendingReceipt) {
        await reviewReceipt(pendingReceipt.id, true, "");
        currentStatus = "paid";
      }
      if (currentStatus === "paid" || currentStatus === "processing") {
        await advanceOrderStatusTo(
          row.id,
          currentStatus,
          "preparing",
          "سفارش شما ثبت و تأیید شد و آماده ارسال است.",
          ""
        );
      }
      setNotice("سفارش تأیید شد و پیام «ثبت شد و آماده ارسال است» برای مشتری ارسال گردید.");
      onUpdated();
    } catch {
      setErr("خطا در تأیید سفارش. لطفاً مطمئن شوید مشتری فیش واریزی را ارسال کرده است.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    if (!pendingReceipt || busy) return;
    const reason = window.prompt("لطفاً دلیل رد فیش را برای مشتری بنویسید:", "تصویر فیش نامعتبر یا مبلغ واریزی نادرست است.");
    if (!reason || reason.trim().length < 3) return;
    setBusy(true);
    setErr(null);
    setNotice(null);
    try {
      await reviewReceipt(pendingReceipt.id, false, reason.trim());
      setNotice("فیش واریزی رد شد و به مشتری اطلاع داده شد.");
      onUpdated();
    } catch {
      setErr("خطا در رد کردن فیش.");
    } finally {
      setBusy(false);
    }
  }

  async function handleShip() {
    if (busy) return;
    setBusy(true);
    setErr(null);
    setNotice(null);
    try {
      await advanceOrderStatusTo(
        row.id,
        row.status,
        "shipped",
        "بسته شما تحویل پست/پیک داده شد و ارسال گردید.",
        trackingInput.trim() || "ارسال شده"
      );
      setNotice("وضعیت سفارش به «ارسال شده» تغییر یافت.");
      onUpdated();
    } catch {
      setErr("خطا در ثبت ارسال سفارش.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeliver() {
    if (busy) return;
    setBusy(true);
    setErr(null);
    setNotice(null);
    try {
      await advanceOrderStatusTo(
        row.id,
        row.status,
        "delivered",
        "سفارش با موفقیت تحویل مشتری گردید.",
        row.trackingCode || trackingInput.trim() || "تحویل شده"
      );
      setNotice("تیک نهایی تحویل سفارش با موفقیت زده شد!");
      onUpdated();
    } catch {
      setErr("خطا در ثبت تیک تحویل نهایی.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="rounded-3xl border-2 border-ivory-300 bg-ivory-50 p-6 shadow-soft transition hover:border-gold-500/60 md:p-8">
      {/* Header: Order number, date, status badge */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-ivory-300 pb-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-burgundy-700 px-4 py-1.5 font-mono text-sm font-bold text-ivory-50" dir="ltr">
            {row.orderNumber}
          </span>
          <span className="text-xs text-ink-500">ثبت شده در {formatDate(row.createdAt)}</span>
          <span className="rounded-full bg-ivory-200 px-3.5 py-1 text-xs font-bold text-ink-900">
            وضعیت فعلی: {ORDER_STATUS_LABELS[row.status]}
          </span>
          {pendingReceipt && (
            <span className="rounded-full bg-gold-500/30 px-3 py-1 text-xs font-bold text-burgundy-900">
              فیش جدید در انتظار تأیید شما
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <p className="text-base font-bold text-burgundy-800">مبلغ کل: {formatToman(row.totalToman)}</p>
          <Link to={`/admin/orders/${row.id}`} className="btn-outline h-9 px-4 text-xs">
            <Eye className="h-3.5 w-3.5" />
            جزئیات و چاپ فاکتور
          </Link>
        </div>
      </div>

      {notice && (
        <div className="mt-4 rounded-2xl bg-success-100 px-4 py-3 text-xs font-bold text-success-600">
          {notice}
        </div>
      )}
      {err && (
        <div className="mt-4 rounded-2xl bg-error-100 px-4 py-3 text-xs font-bold text-error-600">
          {err}
        </div>
      )}

      {/* Body: 3 clear columns -> 1. Customer & Address, 2. Ordered Items, 3. Receipt Image */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Column 1: Customer Info */}
        <div className="rounded-2xl border border-ivory-300 bg-ivory-100/60 p-4">
          <h3 className="text-xs font-bold text-burgundy-700">۱. مشخصات و آدرس مشتری</h3>
          <p className="mt-2 text-base font-bold text-ink-900">{row.recipientName}</p>
          <p className="mt-1 font-mono text-sm font-bold text-ink-700" dir="ltr">
            {row.phone}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-ink-700">
            {row.province}، {row.city}، {row.street}
          </p>
          <p className="mt-1 text-xs text-ink-500">
            کد پستی: <span dir="ltr" className="font-mono">{row.postalCode}</span>
          </p>
        </div>

        {/* Column 2: Ordered Items */}
        <div className="rounded-2xl border border-ivory-300 bg-ivory-100/60 p-4">
          <h3 className="text-xs font-bold text-burgundy-700">۲. اقلام سفارش داده‌شده ({row.items.length} کالا)</h3>
          <ul className="mt-2 divide-y divide-ivory-300 text-xs">
            {row.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2 py-2">
                <div>
                  <p className="font-bold text-ink-900">{item.productName}</p>
                  <p className="text-[11px] text-ink-500">
                    {item.brand} {item.variantLabel ? `· ${item.variantLabel}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-end">
                  <span className="rounded-lg bg-burgundy-700/10 px-2 py-0.5 font-bold text-burgundy-800">
                    {item.quantity} عدد
                  </span>
                  <p className="mt-0.5 font-medium text-ink-700">{formatToman(item.lineTotalToman)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 3: Receipt Image Preview */}
        <div className="rounded-2xl border border-ivory-300 bg-ivory-100/60 p-4">
          <h3 className="text-xs font-bold text-burgundy-700">۳. تصویر فیش واریزی</h3>
          {!latestReceipt ? (
            <p className="mt-4 rounded-xl bg-ivory-200/70 p-3 text-xs text-ink-500">
              مشتری هنوز تصویر فیش واریزی را آپلود نکرده است.
            </p>
          ) : (
            <div className="mt-2 space-y-2 text-xs">
              {latestReceipt.storagePath && (
                <div className="max-h-44 overflow-hidden rounded-xl border border-ivory-300 bg-white">
                  <ReceiptPreview storagePath={latestReceipt.storagePath} />
                </div>
              )}
              <div className="flex flex-wrap justify-between gap-1 pt-1 text-[11px] text-ink-700">
                {latestReceipt.payerName && <span>واریزکننده: <b>{latestReceipt.payerName}</b></span>}
                {latestReceipt.trackingCode && <span dir="ltr">پیگیری: <b>{latestReceipt.trackingCode}</b></span>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions: 3 Step Buttons */}
      <div className="mt-6 grid gap-3 border-t border-ivory-300 pt-5 md:grid-cols-3">
        {/* Step 1 Button */}
        <div className="flex flex-col gap-2">
          {["preparing", "shipped", "delivered"].includes(row.status) ? (
            <div className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-success-100 px-4 text-xs font-bold text-success-600">
              <CheckCircle className="h-4 w-4" />
              ۱. تأیید و آماده ارسال شد
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy || (!pendingReceipt && !["paid", "processing"].includes(row.status))}
                onClick={() => void handleApprove()}
                className="btn-primary h-11 flex-1 text-xs"
              >
                <CheckCircle className="h-4 w-4" />
                {busy ? "در حال ثبت..." : "۱. تأیید فیش و آماده ارسال"}
              </button>
              {pendingReceipt && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleReject()}
                  className="btn-outline h-11 px-3 text-xs text-error-600"
                  title="رد کردن فیش"
                >
                  <XCircle className="h-4 w-4" />
                  رد فیش
                </button>
              )}
            </div>
          )}
        </div>

        {/* Step 2 Button */}
        <div className="flex gap-2">
          {["shipped", "delivered"].includes(row.status) ? (
            <div className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-success-100 px-4 text-xs font-bold text-success-600">
              <Truck className="h-4 w-4" />
              ۲. بسته ارسال شده است
            </div>
          ) : (
            <>
              <input
                type="text"
                dir="ltr"
                placeholder="کد رهگیری (اختیاری)"
                value={trackingInput}
                onChange={(e) => setTrackingInput(e.target.value)}
                className="field h-11 w-36 text-xs"
              />
              <button
                type="button"
                disabled={busy || !["paid", "processing", "preparing"].includes(row.status)}
                onClick={() => void handleShip()}
                className="btn-primary h-11 flex-1 text-xs"
              >
                <Send className="h-4 w-4" />
                ۲. ثبت ارسال
              </button>
            </>
          )}
        </div>

        {/* Step 3 Button */}
        <div>
          {row.status === "delivered" ? (
            <div className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-success-100 px-4 text-xs font-bold text-success-600">
              <PackageCheck className="h-4 w-4" />
              ۳. تحویل داده شد (تکمیل نهایی)
            </div>
          ) : (
            <button
              type="button"
              disabled={busy || row.status !== "shipped"}
              onClick={() => void handleDeliver()}
              className="btn-primary h-11 w-full text-xs"
            >
              <PackageCheck className="h-4 w-4" />
              ۳. زدن تیک آخر (تحویل شد)
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
