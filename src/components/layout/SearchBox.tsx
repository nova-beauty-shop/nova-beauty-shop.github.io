import { useEffect, useState, type FormEvent } from 'react';
import { Search, X } from 'lucide-react';
import Link from '@/components/common/Link';
import { navigate } from '@/lib/navigation';
import { fetchProducts } from '@/lib/catalog';
import { formatToman } from '@/lib/format';
import type { Product } from '@/types/catalog';

export default function SearchBox({ onNavigate }: { onNavigate?: () => void }) {
  const [term, setTerm] = useState('');
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const trimmed = term.trim();

  useEffect(() => {
    if (trimmed.length < 2) return;
    let active = true;
    const timer = window.setTimeout(() => {
      fetchProducts({ search: trimmed, pageSize: 5 })
        .then(({ items }) => {
          if (active) setSuggestions(items);
        })
        .catch(() => {
          if (active) setSuggestions([]);
        });
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [trimmed]);

  const visibleSuggestions = trimmed.length >= 2 ? suggestions : [];

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!trimmed) return;
    setOpen(false);
    navigate(`/shop?q=${encodeURIComponent(trimmed)}`);
    onNavigate?.();
  }

  return (
    <div className="relative w-full">
      <form onSubmit={handleSubmit} role="search" className="relative">
        <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" aria-hidden="true" />
        <input
          type="search"
          value={term}
          onChange={(event) => {
            setTerm(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          placeholder="جستجوی محصول، برند یا دسته‌بندی"
          aria-label="جستجوی محصولات"
          className="field h-11 ps-11 pe-10 text-sm [&::-webkit-search-cancel-button]:hidden"
        />
        {term && (
          <button
            type="button"
            onClick={() => {
              setTerm('');
              setSuggestions([]);
            }}
            aria-label="پاک کردن جستجو"
            className="absolute end-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-500 hover:text-burgundy-700"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </form>

      {open && visibleSuggestions.length > 0 && (
        <div className="absolute inset-x-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-ivory-300 bg-ivory-50 shadow-lift">
          <ul className="divide-y divide-ivory-200">
            {visibleSuggestions.map((product) => (
              <li key={product.id}>
                <Link
                  to={`/product/${product.slug}`}
                  onClick={() => {
                    setOpen(false);
                    onNavigate?.();
                  }}
                  className="flex items-center gap-3 px-4 py-3 transition hover:bg-ivory-200"
                >
                  <img src={product.images[0]} alt="" className="h-12 w-10 rounded-lg object-cover" />
                  <span className="flex-1">
                    <span className="block text-sm font-medium text-ink-900">{product.name}</span>
                    <span className="block text-xs text-ink-500">{formatToman(product.priceToman)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={handleSubmit}
            className="w-full border-t border-ivory-300 px-4 py-3 text-sm font-medium text-burgundy-700 hover:bg-ivory-200"
          >
            مشاهده همه نتایج برای «{trimmed}»
          </button>
        </div>
      )}
    </div>
  );
}
