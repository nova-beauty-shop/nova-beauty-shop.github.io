import { useMemo } from 'react';
import { ShieldCheck, Truck, RotateCcw, Gem } from 'lucide-react';
import AdminQuickBar from '@/components/admin/AdminQuickBar';
import QuickEditButton from '@/components/admin/QuickEditButton';
import CategoryGrid from '@/components/home/CategoryGrid';
import HeroSection from '@/components/home/HeroSection';
import ProductSection from '@/components/home/ProductSection';
import PromoBanner from '@/components/home/PromoBanner';
import StoryRail from '@/components/home/StoryRail';
import { useAsync } from '@/hooks/useAsync';
import { useSiteTexts } from '@/hooks/useSiteTexts';
import { contentEditPath } from '@/lib/adminLinks';
import { fetchBanners } from '@/lib/catalog';

export default function HomePage() {
  const banners = useAsync(fetchBanners, []);
  const texts = useSiteTexts();
  const heroSlides = useMemo(() => banners.data?.filter((item) => item.placement === 'hero') ?? [], [banners.data]);
  const promos = useMemo(() => banners.data?.filter((item) => item.placement === 'promo') ?? [], [banners.data]);
  const trustItems = [
    { icon: ShieldCheck, title: texts.trust_1_title, text: texts.trust_1_text },
    { icon: Truck, title: texts.trust_2_title, text: texts.trust_2_text },
    { icon: RotateCcw, title: texts.trust_3_title, text: texts.trust_3_text },
    { icon: Gem, title: texts.trust_4_title, text: texts.trust_4_text },
  ];

  return (
    <>
      <div className="relative">
        {heroSlides.length > 0 ? (
          <HeroSection banners={heroSlides} />
        ) : (
          <div className="container-nova py-24">{banners.loading ? <div className="skeleton h-[560px] w-full" /> : null}</div>
        )}
        <QuickEditButton to={contentEditPath('banners')} label="ویرایش سریع اسلایدر" tone="dark" className="end-4 top-4 sm:end-6 lg:end-10" />
      </div>

      <StoryRail />
      <CategoryGrid />

      <ProductSection
        eyebrow={texts.home_bestsellers_eyebrow}
        title={texts.home_bestsellers_title}
        query={{ bestsellersOnly: true, pageSize: 4, sort: 'bestselling' }}
        viewAllTo="/shop?sort=bestselling"
      />

      {promos[0] && <PromoBanner banner={promos[0]} />}

      <ProductSection
        eyebrow={texts.home_new_eyebrow}
        title={texts.home_new_title}
        query={{ newOnly: true, pageSize: 4, sort: 'newest' }}
        viewAllTo="/shop?sort=newest"
      />

      {promos[1] && <PromoBanner banner={promos[1]} reverse />}

      <section className="container-nova py-16">
        <ul className="grid gap-8 border-y border-ivory-300 py-10 sm:grid-cols-2 lg:grid-cols-4">
          {trustItems.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-4">
              <Icon className="mt-1 h-6 w-6 flex-none text-rose-600" strokeWidth={1.5} aria-hidden="true" />
              <div className="space-y-1">
                <h3 className="text-base font-medium">{title}</h3>
                <p className="text-sm leading-relaxed text-ink-500">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <ProductSection
        eyebrow={texts.home_skincare_eyebrow}
        title={texts.home_skincare_title}
        query={{ categorySlug: 'skincare', pageSize: 4 }}
        viewAllTo="/shop?category=skincare"
      />

      <AdminQuickBar
        links={[
          { label: 'اسلایدر و بنرها', to: contentEditPath('banners') },
          { label: 'استوری‌ها', to: contentEditPath('stories') },
          { label: 'دسته‌بندی‌ها', to: contentEditPath('categories') },
          { label: 'محصولات', to: contentEditPath('products') },
          { label: 'نوشته‌های سایت', to: contentEditPath('texts') },
          { label: 'سفارش‌ها', to: '/admin/orders' },
        ]}
      />
    </>
  );
}
