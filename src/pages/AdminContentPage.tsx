import { Gift, HelpCircle, Image, MessageSquare, Package, Sparkles, Tags, TicketPercent, Type } from 'lucide-react';
import AdminGate from '@/components/admin/AdminGate';
import { AdminPageHeader } from '@/components/admin/AdminChrome';
import BannersManager from '@/components/admin/content/BannersManager';
import CategoriesManager from '@/components/admin/content/CategoriesManager';
import CouponsManager from '@/components/admin/content/CouponsManager';
import ProductsManager from '@/components/admin/content/ProductsManager';
import QuestionsManager from '@/components/admin/content/QuestionsManager';
import ReviewsManager from '@/components/admin/content/ReviewsManager';
import SamplesManager from '@/components/admin/content/SamplesManager';
import SiteTextsManager from '@/components/admin/content/SiteTextsManager';
import StoriesManager from '@/components/admin/content/StoriesManager';
import type { AdminAccess } from '@/lib/adminSettings';
import { contentEditPath } from '@/lib/adminLinks';
import { navigate, useLocation } from '@/lib/navigation';

type TabId = 'products' | 'categories' | 'banners' | 'stories' | 'reviews' | 'questions' | 'samples' | 'coupons' | 'texts';

const TABS: { id: TabId; label: string; icon: typeof Package }[] = [
  { id: 'products', label: 'محصولات', icon: Package },
  { id: 'categories', label: 'دسته‌بندی‌ها', icon: Tags },
  { id: 'banners', label: 'بنرها', icon: Image },
  { id: 'stories', label: 'استوری‌ها', icon: Sparkles },
  { id: 'reviews', label: 'نظرات', icon: MessageSquare },
  { id: 'questions', label: 'پرسش و پاسخ', icon: HelpCircle },
  { id: 'samples', label: 'نمونه رایگان', icon: Gift },
  { id: 'coupons', label: 'کدهای تخفیف', icon: TicketPercent },
  { id: 'texts', label: 'نوشته‌ها', icon: Type },
];

export default function AdminContentPage() {
  return <AdminGate>{(access) => <AdminContentContent access={access} />}</AdminGate>;
}

function AdminContentContent({ access }: { access: AdminAccess }) {
  const { searchParams } = useLocation();
  const requestedTab = searchParams.get('tab');
  const tab: TabId = TABS.find((item) => item.id === requestedTab)?.id ?? 'products';
  // Quick-edit links from the storefront open a specific product straight in its edit form.
  const editProductId = tab === 'products' ? searchParams.get('edit') : null;
  const setTab = (next: TabId) => navigate(contentEditPath(next), { replace: true });
  const canEdit = access.role === 'owner' || access.role === 'manager';

  return (
    <div className="container-nova py-12 md:py-16">
      <AdminPageHeader
        eyebrow="مدیریت محتوا"
        title="محتوای فروشگاه"
        description="محصولات، دسته‌بندی‌ها، بنرها، استوری‌ها و نظرات را بدون نیاز به کد تغییر دهید. تغییرات بلافاصله در سایت نمایش داده می‌شوند."
      />

      <div className="mt-10 grid gap-8 lg:grid-cols-[260px_1fr]">
        <nav aria-label="بخش‌های محتوا" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
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
                      active ? 'bg-burgundy-700 text-ivory-50 shadow-soft' : 'text-ink-700 hover:bg-ivory-200 hover:text-burgundy-700'
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
          {tab === 'products' && <ProductsManager canEdit={canEdit} initialEditId={editProductId} />}
          {tab === 'categories' && <CategoriesManager canEdit={canEdit} />}
          {tab === 'banners' && <BannersManager canEdit={canEdit} />}
          {tab === 'stories' && <StoriesManager canEdit={canEdit} />}
          {tab === 'reviews' && <ReviewsManager canEdit={canEdit} />}
          {tab === 'questions' && <QuestionsManager canEdit={canEdit} />}
          {tab === 'samples' && <SamplesManager canEdit={canEdit} />}
          {tab === 'coupons' && <CouponsManager canEdit={canEdit} />}
          {tab === 'texts' && <SiteTextsManager canEdit={canEdit} />}
        </div>
      </div>
    </div>
  );
}
