import { useState, type FormEvent } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import AdminGate from '@/components/admin/AdminGate';
import { AdminPageHeader } from '@/components/admin/AdminChrome';
import Link from '@/components/common/Link';
import { EmptyState, ErrorState, SkeletonGrid } from '@/components/common/StateViews';
import { useAsync } from '@/hooks/useAsync';
import { ADMIN_CUSTOMER_PAGE_SIZE, fetchAdminCustomerPage } from '@/lib/adminCustomers';
import { formatDate, formatToman } from '@/lib/format';

export default function AdminCustomersPage() {
  return <AdminGate>{() => <AdminCustomersContent />}</AdminGate>;
}

function AdminCustomersContent() {
  const [draftSearch, setDraftSearch] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const customers = useAsync(() => fetchAdminCustomerPage(search, page), [search, page]);

  const total = customers.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / ADMIN_CUSTOMER_PAGE_SIZE));

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(0);
    setSearch(draftSearch.trim());
  }

  return (
    <div className="container-nova py-12 md:py-16">
      <AdminPageHeader
        eyebrow="مدیریت مشتریان"
        title="مشتریان"
        description="مشتریان را با نام، تلفن یا ایمیل جستجو کنید و سابقه سفارش، مجموع خرید و وضعیت حساب هر مشتری را ببینید."
      />

      <div className="mt-10 space-y-6">
        <form onSubmit={handleSearch} role="search" className="flex gap-3">
          <label htmlFor="customer-search" className="sr-only">
            جستجوی مشتری
          </label>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" aria-hidden="true" />
            <input
              id="customer-search"
              type="search"
              value={draftSearch}
              onChange={(event) => setDraftSearch(event.target.value)}
              placeholder="نام، تلفن یا ایمیل مشتری"
              className="field ps-11"
            />
          </div>
          <button type="submit" className="btn-primary">
            جستجو
          </button>
        </form>

        {customers.loading && <SkeletonGrid count={3} />}
        {customers.error && <ErrorState onRetry={customers.retry} />}
        {customers.data && customers.data.rows.length === 0 && (
          <EmptyState title="مشتری پیدا نشد" description="عبارت جستجو را تغییر دهید." />
        )}

        {customers.data && customers.data.rows.length > 0 && (
          <div className="overflow-x-auto rounded-3xl border border-ivory-300 bg-ivory-50 shadow-soft">
            <table className="min-w-full text-sm">
              <thead className="bg-ivory-200/70 text-ink-700">
                <tr>
                  <th className="px-5 py-4 text-start font-medium">مشتری</th>
                  <th className="px-5 py-4 text-start font-medium">تلفن</th>
                  <th className="px-5 py-4 text-start font-medium">سفارش‌ها</th>
                  <th className="px-5 py-4 text-start font-medium">مجموع خرید</th>
                  <th className="px-5 py-4 text-start font-medium">وضعیت حساب</th>
                  <th className="px-5 py-4 text-start font-medium">عضویت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ivory-300">
                {customers.data.rows.map((row) => (
                  <tr key={row.id} className="transition hover:bg-ivory-200/50">
                    <td className="px-5 py-4">
                      <Link to={`/admin/customers/${row.id}`} className="font-medium text-burgundy-700 underline-offset-4 hover:underline">
                        {row.name || 'بدون نام'}
                      </Link>
                      <p className="text-xs text-ink-500" dir="ltr">
                        {row.email}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-ink-700" dir="ltr">
                      {row.phone ?? '—'}
                    </td>
                    <td className="px-5 py-4">{row.orderCount.toLocaleString('fa-IR')}</td>
                    <td className="px-5 py-4 font-medium">{formatToman(row.totalSpentToman)}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs ${row.blocked ? 'bg-error-100 text-error-600' : 'bg-success-100 text-success-600'}`}
                      >
                        {row.blocked ? 'مسدود' : 'فعال'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-ink-500">{formatDate(row.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {customers.data && total > 0 && (
          <nav aria-label="صفحه‌بندی مشتریان" className="flex items-center justify-between gap-4 text-sm text-ink-700">
            <span>
              صفحه {page + 1} از {pageCount} · {total.toLocaleString('fa-IR')} مشتری
            </span>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0} className="btn-outline h-10 px-4">
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
