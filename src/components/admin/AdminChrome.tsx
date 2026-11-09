import { useEffect, useState } from "react";
import { Bell, CreditCard, FileText, LayoutDashboard, LayoutGrid, Receipt, ShoppingBag, Store, Users } from "lucide-react";
import Link from "@/components/common/Link";
import { useLocation } from "@/lib/navigation";
import { fetchAdminPendingCounts } from "@/lib/adminOrders";

const ADMIN_LINKS = [
  { label: "داشبورد", to: "/admin", icon: LayoutDashboard },
  { label: "سفارش‌ها", to: "/admin/orders", icon: ShoppingBag, badgeKey: "orders" as const },
  { label: "بررسی پرداخت‌ها", to: "/admin/payments", icon: Receipt, badgeKey: "receipts" as const },
  { label: "مشتریان", to: "/admin/customers", icon: Users },
  { label: "درگاه‌های پرداخت", to: "/admin/gateways", icon: CreditCard },
  { label: "محتوای فروشگاه", to: "/admin/content", icon: Store },
  { label: "صفحات راهنما", to: "/admin/pages", icon: FileText },
  { label: "تنظیمات فروشگاه", to: "/admin/settings", icon: LayoutGrid },
];

export function AdminNav({ counts }: { counts?: { pendingOrders: number; pendingReceipts: number } }) {
  const { pathname } = useLocation();

  return (
    <nav aria-label="بخش‌های مدیریت" className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <ul className="flex w-max gap-1 rounded-full bg-ivory-200/70 p-1">
        {ADMIN_LINKS.map((item) => {
          const active = pathname === item.to || (item.to !== "/admin" && pathname.startsWith(`${item.to}/`));
          const Icon = item.icon;
          const badge =
            item.badgeKey === "orders"
              ? counts?.pendingOrders ?? 0
              : item.badgeKey === "receipts"
              ? counts?.pendingReceipts ?? 0
              : 0;

          return (
            <li key={item.to}>
              <Link
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm transition ${
                  active ? "bg-burgundy-700 text-ivory-50 shadow-soft" : "text-ink-700 hover:bg-ivory-50 hover:text-burgundy-700"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
                {badge > 0 && (
                  <span className={`inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-bold ${
                    active ? "bg-ivory-50 text-burgundy-800" : "bg-burgundy-700 text-ivory-50"
                  }`}>
                    {badge.toLocaleString("fa-IR")}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function AdminPageHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  const [counts, setCounts] = useState<{ pendingOrders: number; pendingReceipts: number }>({
    pendingOrders: 0,
    pendingReceipts: 0,
  });

  useEffect(() => {
    let mounted = true;
    const load = () => {
      fetchAdminPendingCounts()
        .then((res) => {
          if (mounted) setCounts(res);
        })
        .catch(() => {});
    };
    load();
    const timer = setInterval(load, 20000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="space-y-6">
      {(counts.pendingReceipts > 0 || counts.pendingOrders > 0) && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gold-500/50 bg-ivory-200/80 px-5 py-3.5 text-sm shadow-soft">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-burgundy-700 text-ivory-50">
              <Bell className="h-4 w-4" />
            </span>
            <div>
              <p className="font-bold text-ink-900">اعلان مدیریت سفارش‌ها</p>
              <p className="text-xs text-ink-700">
                {counts.pendingReceipts > 0 && `${counts.pendingReceipts.toLocaleString("fa-IR")} فیش واریزی در انتظار تأیید شماست. `}
                {counts.pendingOrders > 0 && `${counts.pendingOrders.toLocaleString("fa-IR")} سفارش فعال در مرحله آماده‌سازی یا بررسی قرار دارد.`}
              </p>
            </div>
          </div>
          <Link to="/admin/orders" className="btn-primary h-9 px-4 text-xs">
            مشاهده و مدیریت سفارش‌ها
          </Link>
        </div>
      )}

      <header className="flex flex-col gap-6 border-b border-ivory-300 pb-8 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="text-3xl md:text-4xl">{title}</h1>
          <p className="max-w-2xl text-sm leading-[1.8] text-ink-500">{description}</p>
        </div>
        <AdminNav counts={counts} />
      </header>
    </div>
  );
}
