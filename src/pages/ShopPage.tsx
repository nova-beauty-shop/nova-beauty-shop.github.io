import { SlidersHorizontal, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import Link from '@/components/common/Link';
import { EmptyState, ErrorState, SkeletonGrid } from '@/components/common/StateViews';
import FilterPanel from '@/components/shop/FilterPanel';
import Pagination from '@/components/shop/Pagination';
import ProductCard from '@/components/product/ProductCard';
import { useAsync } from '@/hooks/useAsync';
import { fetchCategories, fetchProducts } from '@/lib/catalog';
import { formatNumber } from '@/lib/format';
import { navigate, useLocation } from '@/lib/navigation';
import { PAGE_SIZE, PRICE_RANGES, SORT_OPTIONS } from '@/lib/shopOptions';
import type { PriceRangeKey, SortKey } from '@/types/catalog';

type ParamUpdates = Record<string, string | null>;

export default function ShopPage() {
  const { searchParams } = useLocation();
  const categoryParam = searchParams.get('category') ?? '';
  const search = searchParams.get('q') ?? '';
  const sort = (SORT_OPTIONS.find((option) => option.value === searchParams.get('sort'))?.value ?? 'featured') as SortKey;
  const priceRange = (PRICE_RANGES.find((range) => range.value === searchParams.get('price'))?.value ?? 'all') as PriceRangeKey;
  const inStockOnly = searchParams.get('stock') === '1';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const categories = useAsync(fetchCategories, []);
  const filterKey = JSON.stringify({ categoryParam, search, sort, priceRange, inStockOnly, page });
  const results = useAsync(
    () =>
      fetchProducts({
        categorySlug: categoryParam || undefined,
        search,
        sort,
        priceRange,
        inStockOnly,
        page,
        pageSize: PAGE_SIZE,
      }),
    [filterKey]
  );

  const activeCategory = useMemo(
    () => categories.data?.find((category) => category.slug === categoryParam),
    [categories.data, categoryParam]
  );
  const totalPages = Math.max(1, Math.ceil((results.data?.total ?? 0) / PAGE_SIZE));
  const heading = search ? `نتایج جستجو برای «${search}»` : activeCategory?.name ?? 'همه محصولات';

  function updateParams(updates: ParamUpdates) {
    const next = new URLSearchParams(window.location.search);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    if (!('page' in updates)) next.delete('page');
    const query = next.toString();
    navigate(`/shop${query ? `?${query}` : ''}`);
  }

  const filterPanel = (
    <FilterPanel
      categories={categories.data ?? []}
      activeCategory={categoryParam}
      priceRange={priceRange}
      inStockOnly={inStockOnly}
      onCategoryChange={(slug) => updateParams({ category: slug || null })}
      onPriceChange={(value) => updateParams({ price: value === 'all' ? null : value })}
      onStockToggle={(value) => updateParams({ stock: value ? '1' : null })}
    />
  );

  return (
    <div className="container-nova py-12">
      <header className="mb-10 flex flex-col gap-6 border-b border-ivory-300 pb-8 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="text-sm text-ink-500">
            <Link to="/" className="hover:text-burgundy-700">خانه</Link>
            <span className="mx-2">/</span>
            <span>فروشگاه</span>
          </p>
          <h1 className="text-3xl md:text-4xl">{heading}</h1>
          {results.data && (
            <p className="text-sm text-ink-500">{formatNumber(results.data.total)} محصول</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            className="btn-outline h-11 lg:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" /> فیلترها
          </button>
          <label className="flex items-center gap-2 text-sm text-ink-700">
            مرتب‌سازی
            <select
              value={sort}
              onChange={(event) => updateParams({ sort: event.target.value === 'featured' ? null : event.target.value })}
              className="field h-11 w-auto min-w-[11rem] cursor-pointer"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      {search && (
        <div className="mb-8 flex items-center gap-2">
          <span className="rounded-full bg-blush-100 px-4 py-1.5 text-sm text-burgundy-800">
            جستجو: {search}
          </span>
          <button type="button" onClick={() => updateParams({ q: null })} aria-label="حذف جستجو" className="rounded-full p-1.5 hover:bg-ivory-200">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid gap-12 lg:grid-cols-[260px_1fr]">
        <aside className={`${filtersOpen ? 'block' : 'hidden'} lg:block`}>{filterPanel}</aside>

        <section>
          {results.loading && <SkeletonGrid count={6} />}
          {results.error && <ErrorState onRetry={results.retry} />}
          {results.data && results.data.items.length === 0 && (
            <EmptyState
              title="محصولی پیدا نشد"
              description="فیلترها یا عبارت جستجو را تغییر دهید تا نتایج بیشتری ببینید."
              action={
                <button type="button" onClick={() => navigate('/shop')} className="btn-outline">
                  پاک کردن فیلترها
                </button>
              }
            />
          )}
          {results.data && results.data.items.length > 0 && (
            <>
              <div className="grid grid-cols-2 gap-x-4 gap-y-12 xl:grid-cols-3">
                {results.data.items.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              <Pagination page={page} totalPages={totalPages} onChange={(next) => updateParams({ page: next > 1 ? String(next) : null })} />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
