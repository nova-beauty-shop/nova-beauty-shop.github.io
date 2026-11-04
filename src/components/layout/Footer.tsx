import { Flower2 } from 'lucide-react';
import Link from '@/components/common/Link';

const SHOP_LINKS = [
  { label: 'مراقبت از پوست', to: '/shop?category=skincare' },
  { label: 'آرایش', to: '/shop?category=makeup' },
  { label: 'عطر و ادکلن', to: '/shop?category=fragrance' },
  { label: 'مو و بدن', to: '/shop?category=hair-and-body' },
];

const HELP_LINKS = [
  { label: 'سوالات متداول', to: '/faq' },
  { label: 'ارسال و تحویل', to: '/shipping' },
  { label: 'بازگشت کالا', to: '/returns' },
  { label: 'تماس با ما', to: '/contact' },
  { label: 'حریم خصوصی', to: '/privacy' },
  { label: 'قوانین و مقررات', to: '/terms' },
];

const ACCOUNT_LINKS = [
  { label: 'فروشگاه', to: '/shop' },
  { label: 'جدیدترین‌ها', to: '/shop?sort=newest' },
  { label: 'پرفروش‌ترین‌ها', to: '/shop?sort=bestselling' },
  { label: 'علاقه‌مندی‌ها', to: '/wishlist' },
  { label: 'سبد خرید', to: '/cart' },
];

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-ivory-300 bg-burgundy-900 text-ivory-200">
      <div className="container-nova grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-5">
          <div className="flex items-center gap-2.5">
            <Flower2 className="h-7 w-7 text-gold-400" strokeWidth={1.5} aria-hidden="true" />
            <span className="text-lg font-bold text-ivory-50">نُوا شاپ</span>
          </div>
          <p className="max-w-xs text-sm leading-[1.8] text-ivory-300">
            مجموعه‌ای منتخب از لوازم آرایش، مراقبت پوست، عطر و مراقبت مو، با محصولات اصل و بسته‌بندی لوکس.
          </p>
        </div>

        <FooterColumn title="دسته‌بندی‌ها" links={SHOP_LINKS} />
        <FooterColumn title="نُوا" links={ACCOUNT_LINKS} />
        <FooterColumn title="راهنما" links={HELP_LINKS} />
      </div>
      <div className="border-t border-burgundy-800">
        <div className="container-nova flex flex-col items-center justify-between gap-2 py-6 text-xs text-ivory-400 sm:flex-row">
          <span>تمامی حقوق این وب‌سایت برای نُوا شاپ محفوظ است.</span>
          <span className="tracking-[0.2em]">NOVA SHOP</span>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { label: string; to: string }[] }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-ivory-50">{title}</h3>
      <ul className="space-y-2.5 text-sm">
        {links.map((link) => (
          <li key={link.to + link.label}>
            <Link to={link.to} className="text-ivory-300 transition hover:text-gold-400">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
