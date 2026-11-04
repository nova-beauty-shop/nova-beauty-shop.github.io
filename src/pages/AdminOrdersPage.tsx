import { useState, type FormEvent } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import AdminGate from '@/components/admin/AdminGate';
import { AdminPageHeader } from '@/components/admin/AdminChrome';
import Link from '@/components/common/Link';
import { EmptyState, ErrorState, SkeletonGrid } from '@/components/common/StateViews';
import { useAsync } from '@/hooks/useAsync';
import { ADMIN_ORDER_PAGE_SIZE, ADMIN_ORDER_STATUSES, fetchAdminOrderPage } from '@/lib/adminOrders';
import { formatDate, formatToman } from '@/lib/format';
import { ORDER_STATUS_LABELS } from '@/lib/orderLabels';
import type { OrderStatus } from '@/lib/orders';

export default function AdminOrdersPage() {
  return <AdminGate>{() => <AdminOrdersContent />}</AdminGate>;
}

function AdminOrdersContent() {
  const [draftSearch, setDraftSearch] = useState('');
  const [search, setSearch] = useState('');
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
        eyebrow="مدیریت سفارش‌ها"
        title="سفارش‌ها"
        description="همه سفارش‌ها را جستجو و فیلتر کنید و برای مشاهده جزئیات، پرداخت، ارسال و وضعیت هر سفارش وارد شوید."
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
                placeholder="شماره سفارش، نام گیرنده یا تلفن"
                className="field ps-11"
              />
            </div>
            <button type="submit" className="btn-primary">
              جستجو
            </button>
          </form>

          <label className="flex items-center gap-3 text-sm text-ink-700">
            وضعیت
            <select
              value={status ?? ''}
              onChange={(event) => {
                setPage(0);
                setStatus(event.target.value === '' ? null : (event.target.value as OrderStatus));
              }}
              className="field h-11 w-auto min-w-[12rem]"
            >
              <option value="">همه وضعیت‌ها</option>
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
          <EmptyState title="سفارشی پیدا نشد" description="فیلترها یا عبارت جستجو را تغییر دهید." />
        )}

        {orders.data && orders.data.rows.length > 0 && (
          <div className="overflow-x-auto rounded-3xl border border-ivory-300 bg-ivory-50 shadow-soft">
            <table className="min-w-full text-sm">
              <thead className="bg-ivory-200/70 text-start text-ink-700">
                <tr>
                  <th className="px-5 py-4 text-start font-medium">شماره سفارش</th>
                  <th className="px-5 py-4 text-start font-medium">گیرنده</th>
                  <th className="px-5 py-4 text-start font-medium">مبلغ</th>
                  <th className="px-5 py-4 text-start font-medium">وضعیت</th>
                  <th className="px-5 py-4 text-start font-medium">کد رهگیری</th>
                  <th className="px-5 py-4 text-start font-medium">تاریخ ثبت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ivory-300">
                {orders.data.rows.map((row) => (
                  <tr key={row.id} className="transition hover:bg-ivory-200/50">
                    <td className="px-5 py-4">
                      <Link to={`/admin/orders/${row.id}`} className="font-medium text-burgundy-700 underline-offset-4 hover:underline" dir="ltr">
                        {row.orderNumber}
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-ink-900">{row.recipientName}</p>
                      <p className="text-xs text-ink-500" dir="ltr">
                        {row.phone}
                      </p>
                    </td>
                    <td className="px-5 py-4 font-medium">{formatToman(row.totalToman)}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-ivory-200 px-3 py-1 text-xs text-ink-700">{ORDER_STATUS_LABELS[row.status]}</span>
                    </td>
                    <td className="px-5 py-4 text-ink-500" dir="ltr">
                      {row.trackingCode ?? '—'}
                    </td>
                    <td className="px-5 py-4 text-ink-500">{formatDate(row.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {orders.data && total > 0 && (
          <nav aria-label="صفحه‌بندی سفارش‌ها" className="flex items-center justify-between gap-4 text-sm text-ink-700">
            <span>
              صفحه {page + 1} از {pageCount} · {total} سفارش
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
