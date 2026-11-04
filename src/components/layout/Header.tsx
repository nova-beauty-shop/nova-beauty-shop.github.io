import { useState } from 'react';
import { Heart, Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import Link from '@/components/common/Link';
import SearchBox from '@/components/layout/SearchBox';
import { useAuth } from '@/hooks/useAuth';
import { useShop } from '@/hooks/useShop';
import { useLocation } from '@/lib/navigation';

// A cropped, optimised copy of /Rose-Gold_Nova_Beauty_Logo.png (the original is a 1.8 MB square).
const LOGO_SRC = '/Rose-Gold_Nova_Beauty_Logo-header.webp';

const NAV_ITEMS = [
  { label: 'فروشگاه', to: '/shop' },
  { label: 'مراقبت از پوست', to: '/shop?category=skincare' },
  { label: 'آرایش', to: '/shop?category=makeup' },
  { label: 'عطر', to: '/shop?category=fragrance' },
  { label: 'مو و بدن', to: '/shop?category=hair-and-body' },
  { label: 'جدیدترین‌ها', to: '/shop?sort=newest' },
];

interface HeaderProps {
  onOpenCart: () => void;
}

export default function Header({ onOpenCart }: HeaderProps) {
  const { cartCount, wishlist } = useShop();
  const { user } = useAuth();
  const { pathname, searchParams } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  function isActive(to: string) {
    const [path, query] = to.split('?');
    if (pathname !== path) return false;
    if (!query) return true;
    const [key, value] = query.split('=');
    return searchParams.get(key) === value;
  }

  return (
    <header className="sticky top-0 z-30 border-b border-ivory-300 bg-ivory-100/90 backdrop-blur-md">
      <div className="container-nova flex h-16 sm:h-20 items-center gap-2 sm:gap-4 lg:gap-6">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="باز کردن منو"
          className="rounded-full p-2 text-ink-900 hover:bg-ivory-200 lg:hidden"
        >
          <Menu className="h-6 w-6" />
        </button>

        <Link to="/" className="flex shrink-0 items-center" aria-label="نُوا شاپ، صفحه اصلی">
          <img
            src={LOGO_SRC}
            alt="نُوا شاپ"
            width={640}
            height={264}
            decoding="async"
            className="h-10 w-auto max-w-[112px] object-contain mix-blend-multiply sm:h-14 sm:max-w-none md:h-16"
          />
        </Link>

        <nav aria-label="منوی اصلی" className="hidden flex-1 items-center justify-center gap-7 lg:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              aria-current={isActive(item.to) ? 'page' : undefined}
              className={`relative py-2 text-sm transition hover:text-burgundy-700 after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-right after:scale-x-0 after:bg-burgundy-700 after:transition-transform after:duration-300 hover:after:scale-x-100 ${
                isActive(item.to) ? 'font-medium text-burgundy-700 after:scale-x-100' : 'text-ink-700'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ms-auto flex shrink-0 items-center gap-0 sm:gap-1 lg:ms-0">
          <div className="hidden w-64 xl:block">
            <SearchBox />
          </div>
          <button
            type="button"
            onClick={() => setSearchOpen((open) => !open)}
            aria-label="جستجو"
            className="rounded-full p-2 text-ink-900 hover:bg-ivory-200 xl:hidden"
          >
            <Search className="h-5 w-5" />
          </button>
          <Link
            to={user ? '/account' : '/login'}
            aria-label={user ? 'حساب کاربری' : 'ورود به حساب'}
            className="rounded-full p-2 text-ink-900 hover:bg-ivory-200"
          >
            <User className="h-5 w-5" />
          </Link>
          <Link
            to="/wishlist"
            aria-label={`علاقه‌مندی‌ها (${wishlist.length.toLocaleString('fa-IR')})`}
            className="relative rounded-full p-2 text-ink-900 hover:bg-ivory-200"
          >
            <Heart className="h-5 w-5" />
            {wishlist.length > 0 && <CountBadge value={wishlist.length} />}
          </Link>
          <button
            type="button"
            onClick={onOpenCart}
            aria-label={`سبد خرید (${cartCount.toLocaleString('fa-IR')})`}
            className="relative rounded-full p-2 text-ink-900 hover:bg-ivory-200"
          >
            <ShoppingBag className="h-5 w-5" />
            {cartCount > 0 && <CountBadge value={cartCount} animate />}
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="container-nova pb-4 xl:hidden">
          <SearchBox onNavigate={() => setSearchOpen(false)} />
        </div>
      )}

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="بستن منو" onClick={() => setMenuOpen(false)} className="absolute inset-0 bg-ink-900/40" />
          <div className="absolute inset-y-0 right-0 flex w-80 max-w-[85vw] animate-slide-in-right flex-col bg-ivory-50 p-6 shadow-lift">
            <div className="flex items-center justify-between">
              <span className="font-bold text-burgundy-800">منوی نُوا</span>
              <button type="button" onClick={() => setMenuOpen(false)} aria-label="بستن منو" className="rounded-full p-2 hover:bg-ivory-200">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav aria-label="منوی موبایل" className="mt-8 flex flex-col">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className="border-b border-ivory-300 py-4 text-base text-ink-900"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}

function CountBadge({ value, animate = false }: { value: number; animate?: boolean }) {
  return (
    <span
      key={value}
      className={`absolute -end-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-burgundy-700 px-1 text-[11px] font-medium text-ivory-50 ${
        animate ? 'animate-bag-pop' : ''
      }`}
    >
      {value.toLocaleString('fa-IR')}
    </span>
  );
}
