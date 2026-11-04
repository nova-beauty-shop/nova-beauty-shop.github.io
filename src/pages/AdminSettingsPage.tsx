import { useState } from 'react';
import { Building2, CreditCard, KeyRound, Landmark, Users } from 'lucide-react';
import AdminGate from '@/components/admin/AdminGate';
import { AdminPageHeader } from '@/components/admin/AdminChrome';
import AdministratorsPanel from '@/components/admin/settings/AdministratorsPanel';
import BankCardForm from '@/components/admin/settings/BankCardForm';
import GeneralSettingsForm from '@/components/admin/settings/GeneralSettingsForm';
import PaymentSettingsForm from '@/components/admin/settings/PaymentSettingsForm';
import SecuritySection from '@/components/admin/settings/SecuritySection';
import type { AdminAccess } from '@/lib/adminSettings';

type TabId = 'general' | 'payment' | 'bank' | 'admins' | 'security';

const TABS: { id: TabId; label: string; icon: typeof Building2 }[] = [
  { id: 'general', label: 'تنظیمات عمومی', icon: Building2 },
  { id: 'payment', label: 'تنظیمات پرداخت', icon: CreditCard },
  { id: 'bank', label: 'اطلاعات کارت بانکی', icon: Landmark },
  { id: 'admins', label: 'مدیران', icon: Users },
  { id: 'security', label: 'امنیت', icon: KeyRound },
];

export default function AdminSettingsPage() {
  return <AdminGate>{(access) => <AdminSettingsContent access={access} />}</AdminGate>;
}

function AdminSettingsContent({ access }: { access: AdminAccess }) {
  const [tab, setTab] = useState<TabId>('general');
  const canEdit = access.role === 'owner' || access.role === 'manager';
  const isOwner = access.role === 'owner';

  return (
    <div className="container-nova py-12 md:py-16">
      <AdminPageHeader
        eyebrow="مدیریت فروشگاه"
        title="تنظیمات فروشگاه"
        description="اطلاعات فروشگاه، کارت بانکی، پرداخت و مدیران همگی از این بخش مدیریت می‌شوند. اطلاعات حساس فقط در پایگاه داده نگهداری می‌شود."
      />

      <div className="mt-10 grid gap-8 lg:grid-cols-[260px_1fr]">
        <nav aria-label="بخش‌های تنظیمات" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
          <ul className="flex w-max gap-2 lg:w-auto lg:flex-col">
            {TABS.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setTab(item.id)}
                    aria-current={active ? 'true' : undefined}
                    className={`flex h-12 w-full items-center gap-3 rounded-2xl px-4 text-sm transition ${
                      active
                        ? 'bg-burgundy-700 text-ivory-50 shadow-soft'
                        : 'text-ink-700 hover:bg-ivory-200 hover:text-burgundy-700'
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="min-w-0">
          {tab === 'general' && <GeneralSettingsForm canEdit={canEdit} />}
          {tab === 'payment' && <PaymentSettingsForm canEdit={canEdit} />}
          {tab === 'bank' && <BankCardForm canEdit={canEdit} />}
          {tab === 'admins' && <AdministratorsPanel canManage={isOwner} />}
          {tab === 'security' && <SecuritySection access={access} />}
        </div>
      </div>
    </div>
  );
}
