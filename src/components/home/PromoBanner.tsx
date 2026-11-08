import QuickEditButton from '@/components/admin/QuickEditButton';
import Link from '@/components/common/Link';
import { contentEditPath } from '@/lib/adminLinks';
import type { Banner } from '@/types/catalog';

export default function PromoBanner({ banner, reverse = false }: { banner: Banner; reverse?: boolean }) {
  return (
    <section className="container-nova relative py-8">
      <QuickEditButton to={contentEditPath('banners')} label="ویرایش سریع بنر" className="end-8 top-12 sm:end-10 lg:end-14" />
      <div className={`group grid overflow-hidden rounded-3xl bg-blush-100 md:grid-cols-2 ${reverse ? 'md:[&>*:first-child]:order-2' : ''}`}>
        <div className="flex flex-col justify-center gap-5 p-8 md:p-14">
          {banner.eyebrow && <p className="eyebrow">{banner.eyebrow}</p>}
          <h2 className="text-3xl md:text-4xl">{banner.title}</h2>
          {banner.subtitle && <p className="max-w-md leading-[1.8] text-ink-700">{banner.subtitle}</p>}
          <div>
            <Link to={banner.ctaUrl} className="inline-flex items-center justify-center gap-2 rounded-full bg-white text-burgundy-900 px-5 py-2.5 text-xs sm:text-sm font-bold shadow-md hover:bg-ivory-100 transition">
              {banner.ctaLabel || 'مشاهده'}
            </Link>
          </div>
        </div>
        <div className="relative min-h-[18rem] overflow-hidden">
          <img
            src={banner.imageUrl}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition duration-1000 group-hover:scale-105"
          />
        </div>
      </div>
    </section>
  );
}
