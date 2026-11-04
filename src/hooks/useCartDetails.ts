import { useMemo } from 'react';
import { fetchProducts } from '@/lib/catalog';
import { useAsync } from '@/hooks/useAsync';
import type { Product } from '@/types/catalog';
import type { CartLine } from '@/context/ShopContext';

export interface ResolvedCartLine {
  line: CartLine;
  product: Product;
  variantLabel: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export function useCartDetails(cart: CartLine[]) {
  const productIds = useMemo(() => [...new Set(cart.map((line) => line.productId))], [cart]);
  const idsKey = productIds.join(',');

  const request = useAsync(
    async () => {
      const { items } = await fetchProducts({ ids: productIds, pageSize: 100 });
      return items;
    },
    [idsKey]
  );

  const lines: ResolvedCartLine[] = useMemo(() => {
    if (!request.data) return [];
    const byId = new Map(request.data.map((product) => [product.id, product]));
    return cart.flatMap((line) => {
      const product = byId.get(line.productId);
      if (!product) return [];
      const variant = product.variants.find((item) => item.id === line.variantId);
      const unitPrice = product.priceToman + (variant?.priceDelta ?? 0);
      const quantity = Math.max(1, Math.min(line.quantity, product.stock));
      return [{
        line,
        product,
        variantLabel: variant?.label ?? '',
        unitPrice,
        quantity,
        lineTotal: unitPrice * quantity,
      }];
    });
  }, [cart, request.data]);

  const unavailableCount = request.data ? cart.length - lines.length : 0;
  const subtotal = lines.reduce((sum, item) => sum + item.lineTotal, 0);

  return { ...request, lines, unavailableCount, subtotal };
}
