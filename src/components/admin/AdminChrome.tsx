import { CreditCard, FileText, LayoutDashboard, LayoutGrid, Receipt, ShoppingBag, Store, Users } from 'lucide-react';
import Link from '@/components/common/Link';
import { useLocation } from '@/lib/navigation';

const ADMIN_LINKS = [
  { label: 'داشبورد', to: '/admin', icon: LayoutDashboard },
  { label: 'سفارش‌ها', to: '/admin/orders', icon: ShoppingBag },
  { label: 'مشتریان', to: '/admin/customers', icon: Users },
  { label: 'بررسی پرداخت‌ها', to: '/admin/payments', icon: Receipt },
  { label: 'درگاه‌های پرداخت', to: '/admin/gateways', icon: CreditCard },
  { label: 'محتوای فروشگاه', to: '/admin/content', icon: Store },
  { label: 'صفحات راهنما', to: '/admin/pages', icon: FileText },
  { label: 'تنظیمات فروشگاه', to: '/admin/settings', icon: LayoutGrid },
];

export function AdminNav() {
  const { pathname } = useLocation();

  return (
    <nav aria-label="بخش‌های مدیریت" className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <ul className="flex w-max gap-1 rounded-full bg-ivory-200/70 p-1">
        {ADMIN_LINKS.map((item) => {
          const active = pathname === item.to || (item.to !== '/admin' && pathname.startsWith(`${item.to}/`));
          const Icon = item.icon;
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm transition ${
                  active ? 'bg-burgundy-700 text-ivory-50 shadow-soft' : 'text-ink-700 hover:bg-ivory-50 hover:text-burgundy-700'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function AdminPageHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <header className="flex flex-col gap-6 border-b border-ivory-300 pb-8 md:flex-row md:items-end md:justify-between">
      <div className="space-y-2">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="text-3xl md:text-4xl">{title}</h1>
        <p className="max-w-2xl text-sm leading-[1.8] text-ink-500">{description}</p>
      </div>
      <AdminNav />
    </header>
  );
}
