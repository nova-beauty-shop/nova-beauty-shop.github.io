import { Boxes, Receipt, TrendingUp, Truck, Wallet } from 'lucide-react';
import { useState } from 'react';
import AdminGate from '@/components/admin/AdminGate';
import { AdminPageHeader } from '@/components/admin/AdminChrome';
import KpiCard from '@/components/admin/dashboard/KpiCard';
import { LatestOrdersPanel, LowStockPanel } from '@/components/admin/dashboard/DashboardLists';
import SalesChart from '@/components/admin/dashboard/SalesChart';
import Link from '@/components/common/Link';
import { EmptyState, ErrorState, SkeletonGrid } from '@/components/common/StateViews';
import { useAsync } from '@/hooks/useAsync';
import {
  DASHBOARD_PERIODS,
  fetchAdminDashboardStats,
  type AdminDashboardStats,
  type DashboardPeriod,
} from '@/lib/adminDashboard';
import { formatNumber, formatToman } from '@/lib/format';

export default function AdminDashboardPage() {
  return <AdminGate>{() => <AdminDashboardContent />}</AdminGate>;
}

function AdminDashboardContent() {
  const [days, setDays] = useState<DashboardPeriod>(30);
  const stats = useAsync(() => fetchAdminDashboardStats(days), [days]);

  return (
    <div className="container-nova py-12 md:py-16">
      <AdminPageHeader
        eyebrow="مدیریت فروشگاه"
        title="داشبورد"
        description="نگاهی سریع به فروش، سود، سفارش‌های در انتظار و موجودی کالاها."
      />

      <div className="mt-10 space-y-10">
        <PeriodSwitch value={days} onChange={setDays} />

        {stats.loading && <SkeletonGrid count={3} />}
        {stats.error && <ErrorState onRetry={stats.retry} />}
        {stats.data && <DashboardBody stats={stats.data} />}
      </div>
    </div>
  );
}

function PeriodSwitch({ value, onChange }: { value: DashboardPeriod; onChange: (next: DashboardPeriod) => void }) {
  return (
    <div role="group" aria-label="بازه گزارش" className="inline-flex gap-1 rounded-full bg-ivory-200/70 p-1">
      {DASHBOARD_PERIODS.map((period) => {
        const active = period === value;
        return (
          <button
            key={period}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(period)}
            className={`h-10 rounded-full px-5 text-sm transition ${
              active ? 'bg-burgundy-700 text-ivory-50 shadow-soft' : 'text-ink-700 hover:bg-ivory-50 hover:text-burgundy-700'
            }`}
          >
            {formatNumber(period)} روز گذشته
          </button>
        );
      })}
    </div>
  );
}

function DashboardBody({ stats }: { stats: AdminDashboardStats }) {
  const hasSales = stats.series.some((point) => point.sales > 0);

  return (
    <div className="space-y-10">
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="فروش کالا"
          value={formatToman(stats.salesToman)}
          hint={`${formatNumber(stats.ordersCount)} سفارش پرداخت‌شده در این بازه`}
          icon={Wallet}
        />
        <KpiCard
          label="سود خالص"
          value={formatToman(stats.netProfitToman)}
          hint={`پس از کسر قیمت تمام‌شده (${formatToman(stats.costToman)})`}
          icon={TrendingUp}
          tone={stats.netProfitToman >= 0 ? 'success' : 'warning'}
        />
        <KpiCard
          label="سفارش‌های آماده ارسال"
          value={formatNumber(stats.pendingShipments)}
          hint="پرداخت شده و هنوز ارسال نشده"
          icon={Truck}
        />
        <KpiCard
          label="فیش‌های در انتظار بررسی"
          value={formatNumber(stats.pendingReceipts)}
          hint="پرداخت کارت به کارت منتظر تأیید"
          icon={Receipt}
          tone={stats.pendingReceipts > 0 ? 'warning' : 'default'}
        />
        <KpiCard
          label="کالاهای رو به اتمام"
          value={formatNumber(stats.lowStockCount)}
          hint="موجودی کمتر از ۵ عدد"
          icon={Boxes}
          tone={stats.lowStockCount > 0 ? 'warning' : 'default'}
        />
      </div>

      {stats.missingCostCount > 0 && (
        <p className="rounded-2xl border border-warning-600/30 bg-warning-100/60 px-5 py-4 text-sm leading-[1.9] text-ink-900">
          برای {formatNumber(stats.missingCostCount)} محصول فعال، قیمت تمام‌شده ثبت نشده است و سود آن‌ها بدون کسر هزینه محاسبه می‌شود.{' '}
          <Link to="/admin/content" className="font-medium text-burgundy-700 underline-offset-4 hover:underline">
            ثبت قیمت تمام‌شده
          </Link>
        </p>
      )}

      <section className="rounded-3xl border border-ivory-300 bg-ivory-50 p-6 shadow-soft md:p-8">
        <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <h2 className="text-xl">فروش روزانه</h2>
          <p className="text-xs text-ink-500">مبلغ فروش کالا بر حسب تومان</p>
        </div>
        {hasSales ? (
          <SalesChart series={stats.series} />
        ) : (
          <EmptyState title="فروشی در این بازه ثبت نشده است" description="بازه دیگری را انتخاب کنید یا منتظر سفارش‌های جدید بمانید." />
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <LowStockPanel items={stats.lowStock} totalCount={stats.lowStockCount} />
        <LatestOrdersPanel orders={stats.latestOrders} />
      </div>
    </div>
  );
}
