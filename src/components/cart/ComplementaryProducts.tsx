import { useEffect, useState } from 'react';
import { Check, Plus } from 'lucide-react';
import Link from '@/components/common/Link';
import { useAsync } from '@/hooks/useAsync';
import { useShop } from '@/hooks/useShop';
import { fetchProducts } from '@/lib/catalog';
import { formatToman } from '@/lib/format';
import type { Product } from '@/types/catalog';

/**
 * Suggests popular in-stock products that go well with what is in the cart: items that are not already in the cart or
 * the save-for-later list, from other categories first.
 */
export default function ComplementaryProducts({
  categoryIds,
  excludeIds,
  limit = 4,
  compact = false,
  onNavigate,
}: {
  categoryIds: string[];
  excludeIds: string[];
  limit?: number;
  /** Always two columns, for the narrow cart drawer. */
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const { addToCart, savedForLater } = useShop();
  const request = useAsync(() => fetchProducts({ sort: 'bestselling', inStockOnly: true, pageSize: 24 }).then((result) => result.items), []);

  const taken = new Set([...excludeIds, ...savedForLater.map((line) => line.productId)]);
  const owned = new Set(categoryIds);
  const candidates = (request.data ?? []).filter((product) => !taken.has(product.id));
  const suggestions = [...candidates.filter((p) => !owned.has(p.categoryId)), ...candidates.filter((p) => owned.has(p.categoryId))].slice(0, limit);

  if (request.loading || request.error || suggestions.length === 0) return null;

  return (
    <section aria-label="کالاهای مکمل" className="space-y-4">
      <h3 className="text-base font-medium">مکمل سبد خرید شما</h3>
      <ul className={`grid grid-cols-2 gap-4 ${compact ? '' : 'sm:grid-cols-4'}`}>
        {suggestions.map((product) => (
          <SuggestionCard key={product.id} product={product} onAdd={() => addToCart({ productId: product.id, variantId: product.variants[0]?.id ?? 'default', quantity: 1 }, product.stock)} onNavigate={onNavigate} />
        ))}
      </ul>
    </section>
  );
}

function SuggestionCard({ product, onAdd, onNavigate }: { product: Product; onAdd: () => void; onNavigate?: () => void }) {
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const timer = window.setTimeout(() => setAdded(false), 1600);
    return () => window.clearTimeout(timer);
  }, [added]);

  return (
    <li className="space-y-2">
      <Link to={`/product/${product.slug}`} onClick={onNavigate} className="block overflow-hidden rounded-xl bg-ivory-200">
        <img src={product.images[0]} alt={product.name} loading="lazy" className="aspect-[3/4] w-full object-cover" />
      </Link>
      <Link to={`/product/${product.slug}`} onClick={onNavigate} className="line-clamp-2 block text-xs font-medium leading-snug hover:text-burgundy-700">
        {product.name}
      </Link>
      <p className="text-xs text-ink-700">{formatToman(product.priceToman)}</p>
      <button
        type="button"
        onClick={() => {
          onAdd();
          setAdded(true);
        }}
        className="btn-outline h-9 w-full px-3 text-xs"
      >
        {added ? (
          <>
            <Check className="h-3.5 w-3.5" aria-hidden="true" /> اضافه شد
          </>
        ) : (
          <>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" /> افزودن
          </>
        )}
      </button>
    </li>
  );
}
