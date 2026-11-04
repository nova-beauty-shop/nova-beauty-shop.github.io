import { ChevronLeft } from 'lucide-react';
import AdminGate from '@/components/admin/AdminGate';
import { AdminPageHeader } from '@/components/admin/AdminChrome';
import Link from '@/components/common/Link';
import { ErrorState, SkeletonGrid } from '@/components/common/StateViews';
import { useAsync } from '@/hooks/useAsync';
import { fetchAdminInfoPageSummaries } from '@/lib/infoPages';
import type { AdminInfoPageSummary } from '@/lib/infoPages';

export default function AdminInfoPagesPage() {
  return <AdminGate>{() => <InfoPagesListContent />}</AdminGate>;
}

function InfoPagesListContent() {
  const pages = useAsync(fetchAdminInfoPageSummaries, []);

  return (
    <div className="container-nova py-12 md:py-16">
      <AdminPageHeader
        eyebrow="مدیریت محتوا"
        title="صفحات راهنما"
        description="متن، بخش‌ها و اطلاعات سئوی صفحات راهنما را ویرایش و منتشر کنید. تغییرات منتشر شده بلافاصله در سایت دیده می‌شوند."
      />

      <div className="mt-10">
        {pages.loading && <SkeletonGrid count={6} />}
        {pages.error && <ErrorState onRetry={pages.retry} />}
        {pages.data && (
          <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {pages.data.map((page) => (
              <li key={page.slug}>
                <PageCard page={page} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function PageCard({ page }: { page: AdminInfoPageSummary }) {
  const statusLabel = page.status === 'published' ? 'منتشر شده' : page.status === 'draft' ? 'پیش‌نویس' : 'محتوای پیش‌فرض';
  const statusTone = page.status === 'published' ? 'bg-success-100 text-success-600' : 'bg-ivory-200 text-ink-700';

  return (
    <Link
      to={`/admin/pages/${page.slug}`}
      className="group flex h-full flex-col justify-between gap-6 rounded-3xl border border-ivory-300 bg-ivory-50 p-6 shadow-soft transition hover:-translate-y-0.5 hover:border-gold-500 hover:shadow-lg"
    >
      <div className="space-y-4">
        <span className={`inline-flex h-7 items-center rounded-full px-3 text-xs font-medium ${statusTone}`}>{statusLabel}</span>
        <h2 className="text-xl">{page.navLabel}</h2>
        <p className="text-xs text-ink-500" dir="ltr">
          /{page.slug}
        </p>
      </div>
      <div className="flex items-center justify-between text-sm text-ink-700">
        <span>
          {page.updatedAt ? `آخرین ویرایش: ${new Date(page.updatedAt).toLocaleDateString('fa-IR')}` : 'هنوز ویرایش نشده'}
        </span>
        <ChevronLeft className="h-5 w-5 text-gold-600 transition group-hover:-translate-x-1" aria-hidden="true" />
      </div>
    </Link>
  );
}
