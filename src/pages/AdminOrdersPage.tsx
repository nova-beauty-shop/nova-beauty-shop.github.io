import { useState, type FormEvent } from "react";
import { CheckCircle, CheckCircle2, ChevronLeft, ChevronRight, Clock, Eye, PackageCheck, Search, XCircle } from "lucide-react";
import AdminGate from "@/components/admin/AdminGate";
import { AdminPageHeader } from "@/components/admin/AdminChrome";
import ReceiptPreview from "@/components/admin/payments/ReceiptPreview";
import Link from "@/components/common/Link";
import { EmptyState, ErrorState, SkeletonGrid } from "@/components/common/StateViews";
import { useAsync } from "@/hooks/useAsync";
import {
  ADMIN_ORDER_PAGE_SIZE,
  advanceOrderStatusTo,
  fetchAdminOrderPage,
  type AdminOrderRow,
} from "@/lib/adminOrders";
import { formatDate, formatToman } from "@/lib/format";
import { ORDER_STATUS_LABELS } from "@/lib/orderLabels";
import { reviewReceipt } from "@/lib/payments";

type QuickTab = "all" | "needs_approval" | "pending_send" | "completed";

export default function AdminOrdersPage() {
  return <AdminGate>{() => <AdminOrdersContent />}</AdminGate>;
}

function AdminOrdersContent() {
  const [draftSearch, setDraftSearch] = useState("");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<QuickTab>("all");
  const [page, setPage] = useState(0);
  const orders = useAsync(() => fetchAdminOrderPage({ search, status: null, page }), [search, page]);

  const allRows = orders.data?.rows ?? [];

  const needsApprovalRows = allRows.filter(
    (r) => r.status === "pending_review" || r.status === "awaiting_payment" || r.payments.some((p) => p.status === "pending")
  );
  const pendingSendRows = allRows.filter((r) =>
    ["paid", "processing", "preparing", "shipped"].includes(r.status)
  );
  const completedRows = allRows.filter((r) => r.status === "delivered");

  const visibleRows =
    tab === "needs_approval"
      ? needsApprovalRows
      : tab === "pending_send"
      ? pendingSendRows
      : tab === "completed"
      ? completedRows
      : allRows;

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
        eyebrow="پنل ساده و بدون پیچیدگی"
        title="مدیریت سفارش‌ها"
        description="۱. فیش را تأیید کنید (تیک اول می‌خورد و در وضعیت معلق ارسال با آیکون ساعت قرار می‌گیرد) ← ۲. پس از ارسال، تیک آخر را بزنید."
      />

      <div className="mt-8 space-y-6">
        {/* Simple Visual Filter Tabs */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => setTab("all")}
            className={`flex items-center justify-between rounded-2xl border p-4 text-start transition ${
              tab === "all"
                ? "border-burgundy-700 bg-burgundy-700 text-ivory-50 shadow-soft"
                : "border-ivory-300 bg-ivory-50 text-ink-800 hover:border-gold-500"
            }`}
          >
            <div>
              <p className="text-xs opacity-80">نمایش یکجا</p>
              <p className="mt-1 text-sm font-bold">همه سفارش‌ها</p>
            </div>
            <span className="rounded-full bg-black/10 px-3 py-1 text-sm font-bold">
              {allRows.length.toLocaleString("fa-IR")}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTab("needs_approval")}
            className={`flex items-center justify-between rounded-2xl border p-4 text-start transition ${
              tab === "needs_approval"
                ? "border-burgundy-700 bg-burgundy-700 text-ivory-50 shadow-soft"
                : "border-ivory-300 bg-ivory-50 text-ink-800 hover:border-gold-500"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Clock className="h-5 w-5 shrink-0" />
              <div>
                <p className="text-xs opacity-80">گام اول</p>
                <p className="mt-0.5 text-sm font-bold">منتظر تأیید فیش</p>
              </div>
            </div>
            <span className="rounded-full bg-gold-500/30 px-3 py-1 text-sm font-bold">
              {needsApprovalRows.length.toLocaleString("fa-IR")}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTab("pending_send")}
            className={`flex items-center justify-between rounded-2xl border p-4 text-start transition ${
              tab === "pending_send"
                ? "border-burgundy-700 bg-burgundy-700 text-ivory-50 shadow-soft"
                : "border-gold-500/60 bg-ivory-200/70 text-ink-900 hover:border-burgundy-700"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Clock className="h-5 w-5 shrink-0" />
              <div>
                <p className="text-xs opacity-80">تأیید شده (معلق ارسال)</p>
                <p className="mt-0.5 text-sm font-bold">منتظر تیک آخر ارسال</p>
              </div>
            </div>
            <span className="rounded-full bg-burgundy-700 px-3 py-1 text-sm font-bold text-ivory-50">
              {pendingSendRows.length.toLocaleString("fa-IR")}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTab("completed")}
            className={`flex items-center justify-between rounded-2xl border p-4 text-start transition ${
              tab === "completed"
                ? "border-burgundy-700 bg-burgundy-700 text-ivory-50 shadow-soft"
                : "border-ivory-300 bg-ivory-50 text-ink-800 hover:border-gold-500"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <div>
                <p className="text-xs opacity-80">تکمیل شده</p>
                <p className="mt-0.5 text-sm font-bold">ارسال و تحویل شده ✓</p>
              </div>
            </div>
            <span className="rounded-full bg-success-100 px-3 py-1 text-sm font-bold text-success-600">
              {completedRows.length.toLocaleString("fa-IR")}
            </span>
          </button>
        </div>

        <form onSubmit={handleSearch} role="search" className="flex gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" aria-hidden="true" />
            <input
              id="order-search"
              type="search"
              value={draftSearch}
              onChange={(event) => setDraftSearch(event.target.value)}
              placeholder="جستجوی نام مشتری، شماره تماس یا کد سفارش..."
              className="field ps-11"
            />
          </div>
          <button type="submit" className="btn-primary">
            جستجو
          </button>
        </form>

        {orders.loading && <SkeletonGrid count={3} />}
        {orders.error && <ErrorState onRetry={orders.retry} />}
        {orders.data && visibleRows.length === 0 && (
          <EmptyState title="سفارشی در این بخش وجود ندارد" description="می‌توانید از تب‌های بالا بخش دیگری را انتخاب کنید." />
        )}

        {orders.data && visibleRows.length > 0 && (
          <div className="space-y-6">
            {visibleRows.map((row) => (
              <AdminOrderCard key={row.id} row={row} onUpdated={orders.retry} />
            ))}
          </div>
        )}

        {orders.data && total > ADMIN_ORDER_PAGE_SIZE && (
          <nav aria-label="صفحه‌بندی سفارش‌ها" className="flex items-center justify-between gap-4 pt-4 text-sm text-ink-700">
            <span>
              صفحه {page + 1} از {pageCount}
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

  const isApprovedPendingSend = ["paid", "processing", "preparing", "shipped"].includes(row.status);
  const isCompleted = row.status === "delivered";

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
      setNotice("✓ فیش تأیید شد و پیام «آماده ارسال» برای مشتری رفت. سفارش در حالت «معلق ارسال» قرار گرفت تا تیک آخر را بزنید.");
      onUpdated();
    } catch {
      setErr("برای تأیید سفارش، ابتدا باید مشتری فیش واریزی را ارسال کرده باشد.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    if (!pendingReceipt || busy) return;
    const reason = window.prompt("دلیل رد فیش برای نمایش به مشتری:", "تصویر فیش نامعتبر است.");
    if (!reason || reason.trim().length < 3) return;
    setBusy(true);
    setErr(null);
    setNotice(null);
    try {
      await reviewReceipt(pendingReceipt.id, false, reason.trim());
      setNotice("فیش رد شد و به مشتری اطلاع داده شد.");
      onUpdated();
    } catch {
      setErr("خطا در رد کردن فیش.");
    } finally {
      setBusy(false);
    }
  }

  async function handleFinalTick() {
    if (busy) return;
    setBusy(true);
    setErr(null);
    setNotice(null);
    try {
      const code = trackingInput.trim() || row.trackingCode || "ارسال به مشتری";
      await advanceOrderStatusTo(
        row.id,
        row.status,
        "delivered",
        "سفارش شما ارسال شد و تحویل گردید.",
        code
      );
      setNotice("✅ تیک نهایی زده شد! سفارش به وضعیت «تکمیل و ارسال شده» تغییر یافت.");
      onUpdated();
    } catch {
      setErr("خطا در ثبت تیک نهایی. لطفاً دوباره تلاش کنید.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article
      className={`rounded-3xl border-2 p-6 shadow-soft transition md:p-8 ${
        isCompleted
          ? "border-success-600/40 bg-ivory-50/70"
          : isApprovedPendingSend
          ? "border-gold-500 bg-ivory-50"
          : "border-ivory-300 bg-ivory-50"
      }`}
    >
      {/* Visual Status Strip at top of card */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ivory-200/70 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {isCompleted ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success-100 px-3.5 py-1.5 text-xs font-bold text-success-600">
              <CheckCircle2 className="h-4 w-4" />
              ✅ تکمیل شده (تأیید و ارسال شد)
            </span>
          ) : isApprovedPendingSend ? (
            <>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success-100 px-3 py-1 text-xs font-bold text-success-600">
                <CheckCircle className="h-4 w-4" />
                ✓ فیش تأیید شد (پیام آماده ارسال برای مشتری رفت)
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-500/30 px-3.5 py-1 text-xs font-bold text-burgundy-900">
                <Clock className="h-4 w-4" />
                ⏰ معلق ارسال — یادتان نرود پس از ارسال، تیک آخر را بزنید!
              </span>
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-500/25 px-3.5 py-1.5 text-xs font-bold text-burgundy-900">
              <Clock className="h-4 w-4" />
              ⏳ سفارش جدید — منتظر تأیید فیش توسط شما ({ORDER_STATUS_LABELS[row.status]})
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-bold text-ink-700" dir="ltr">
            {row.orderNumber}
          </span>
          <span className="text-xs text-ink-500">{formatDate(row.createdAt)}</span>
          <Link to={`/admin/orders/${row.id}`} className="btn-outline h-8 px-3 text-xs">
            <Eye className="h-3.5 w-3.5" />
            فاکتور
          </Link>
        </div>
      </div>

      {notice && (
        <div className="mb-5 rounded-2xl bg-success-100 px-4 py-3 text-xs font-bold text-success-600">
          {notice}
        </div>
      )}
      {err && (
        <div className="mb-5 rounded-2xl bg-error-100 px-4 py-3 text-xs font-bold text-error-600">
          {err}
        </div>
      )}

      {/* 3 Clear Columns: 1. Customer Name & Address, 2. Items Ordered, 3. Receipt Image */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-ivory-300 bg-ivory-100/60 p-4">
          <h3 className="text-xs font-bold text-burgundy-700">۱. نام مشتری و آدرس</h3>
          <p className="mt-2 text-base font-bold text-ink-900">{row.recipientName}</p>
          <p className="mt-1 font-mono text-sm font-bold text-burgundy-700" dir="ltr">
            {row.phone}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-ink-700">
            {row.province}، {row.city}، {row.street}
          </p>
          <p className="mt-1 text-xs text-ink-500">
            کد پستی: <span dir="ltr" className="font-mono">{row.postalCode}</span>
          </p>
        </div>

        <div className="rounded-2xl border border-ivory-300 bg-ivory-100/60 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-burgundy-700">۲. چیزهایی که سفارش داده</h3>
            <span className="text-xs font-bold text-ink-900">جمع: {formatToman(row.totalToman)}</span>
          </div>
          <ul className="mt-2 divide-y divide-ivory-300 text-xs">
            {row.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2 py-2">
                <div>
                  <p className="font-bold text-ink-900">{item.productName}</p>
                  <p className="text-[11px] text-ink-500">
                    {item.brand} {item.variantLabel ? `· ${item.variantLabel}` : ""}
                  </p>
                </div>
                <span className="shrink-0 rounded-lg bg-burgundy-700/10 px-2.5 py-1 font-bold text-burgundy-800">
                  {item.quantity} عدد
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-ivory-300 bg-ivory-100/60 p-4">
          <h3 className="text-xs font-bold text-burgundy-700">۳. عکس فیش واریزی</h3>
          {!latestReceipt ? (
            <p className="mt-4 rounded-xl bg-ivory-200/70 p-3 text-xs text-ink-500">
              مشتری هنوز عکس فیش را نفرستاده است.
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

      {/* Ultra-Simple 2-Step Action Bar */}
      <div className="mt-6 grid gap-4 border-t border-ivory-300 pt-5 md:grid-cols-2">
        {/* Button 1: Approve & Mark Ready (Adds First Checkmark + Clock Pending Icon) */}
        <div className="flex items-center gap-2">
          {isApprovedPendingSend || isCompleted ? (
            <div className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-success-600/30 bg-success-100 px-4 text-xs font-bold text-success-600">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>تیک ۱ خورده: فیش تأیید شد و پیام آماده ارسال برای مشتری رفت</span>
            </div>
          ) : (
            <>
              <button
                type="button"
                disabled={busy || (!pendingReceipt && !["paid", "processing"].includes(row.status))}
                onClick={() => void handleApprove()}
                className="btn-primary h-12 flex-1 text-xs"
              >
                <CheckCircle className="h-4 w-4" />
                {busy ? "در حال ثبت..." : "گام ۱: تأیید فیش و سفارش (ارسال پیام آماده ارسال به کاربر)"}
              </button>
              {pendingReceipt && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleReject()}
                  className="btn-outline h-12 px-4 text-xs text-error-600"
                >
                  <XCircle className="h-4 w-4" />
                  رد فیش
                </button>
              )}
            </>
          )}
        </div>

        {/* Button 2: Final Tick (Sent & Delivered) */}
        <div className="flex items-center gap-2">
          {isCompleted ? (
            <div className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-success-600/30 bg-success-100 px-4 text-xs font-bold text-success-600">
              <PackageCheck className="h-4 w-4 shrink-0" />
              <span>✅ تیک آخر خورده: سفارش ارسال و تکمیل شده است</span>
            </div>
          ) : (
            <>
              <input
                type="text"
                dir="ltr"
                placeholder="کد رهگیری پستی (اختیاری)"
                value={trackingInput}
                onChange={(e) => setTrackingInput(e.target.value)}
                className="field h-12 w-40 text-xs"
              />
              <button
                type="button"
                disabled={busy || !isApprovedPendingSend}
                onClick={() => void handleFinalTick()}
                className="btn-primary h-12 flex-1 text-xs"
              >
                <PackageCheck className="h-4 w-4" />
                {busy ? "در حال ثبت..." : "گام ۲: زدن تیک آخر (ارسال و تحویل شد ✓)"}
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
