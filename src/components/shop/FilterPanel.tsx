import type { Category, PriceRangeKey } from '@/types/catalog';
import { PRICE_RANGES } from '@/lib/shopOptions';

interface FilterPanelProps {
  categories: Category[];
  activeCategory: string;
  priceRange: PriceRangeKey;
  inStockOnly: boolean;
  onCategoryChange: (slug: string) => void;
  onPriceChange: (value: PriceRangeKey) => void;
  onStockToggle: (value: boolean) => void;
}

export default function FilterPanel({
  categories,
  activeCategory,
  priceRange,
  inStockOnly,
  onCategoryChange,
  onPriceChange,
  onStockToggle,
}: FilterPanelProps) {
  return (
    <div className="space-y-8">
      <fieldset className="space-y-3">
        <legend className="mb-3 text-sm font-medium text-ink-900">دسته‌بندی</legend>
        <ul className="space-y-1">
          <FilterOption label="همه محصولات" active={activeCategory === ''} onSelect={() => onCategoryChange('')} />
          {categories.map((category) => (
            <FilterOption
              key={category.id}
              label={category.name}
              active={activeCategory === category.slug}
              onSelect={() => onCategoryChange(category.slug)}
            />
          ))}
        </ul>
      </fieldset>

      <div className="space-y-3">
        <label htmlFor="price-range" className="block text-sm font-medium text-ink-900">
          محدوده قیمت
        </label>
        <select
          id="price-range"
          value={priceRange}
          onChange={(event) => onPriceChange(event.target.value as PriceRangeKey)}
          className="field"
        >
          {PRICE_RANGES.map((range) => (
            <option key={range.value} value={range.value}>
              {range.label}
            </option>
          ))}
        </select>
      </div>

      <label className="flex cursor-pointer items-center justify-between gap-4 text-sm text-ink-900">
        فقط کالاهای موجود
        <input
          type="checkbox"
          checked={inStockOnly}
          onChange={(event) => onStockToggle(event.target.checked)}
          className="h-5 w-5 rounded border-ink-300 accent-burgundy-700"
        />
      </label>
    </div>
  );
}

function FilterOption({ label, active, onSelect }: { label: string; active: boolean; onSelect: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={active}
        className={`w-full rounded-xl px-3 py-2 text-start text-sm transition ${
          active ? 'bg-burgundy-700 text-ivory-50' : 'text-ink-700 hover:bg-ivory-200 hover:text-ink-900'
        }`}
      >
        {label}
      </button>
    </li>
  );
}
