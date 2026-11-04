import Link from '@/components/common/Link';
import ProductCard from '@/components/product/ProductCard';
import { SkeletonGrid, ErrorState } from '@/components/common/StateViews';
import { useAsync } from '@/hooks/useAsync';
import { fetchProducts, type ProductQuery } from '@/lib/catalog';

export default function ProductSection({
  eyebrow,
  title,
  query,
  viewAllTo,
}: {
  eyebrow: string;
  title: string;
  query: ProductQuery;
  viewAllTo: string;
}) {
  const products = useAsync(() => fetchProducts(query).then((result) => result.items), [JSON.stringify(query)]);

  return (
    <section className="container-nova py-16">
      <div className="mb-10 flex items-end justify-between gap-6">
        <div className="flex flex-col gap-2">
          <p className="eyebrow">{eyebrow}</p>
          <h2 className="text-3xl md:text-4xl">{title}</h2>
        </div>
        <Link to={viewAllTo} className="hidden text-sm font-medium text-burgundy-700 underline-offset-8 hover:underline md:inline">
          مشاهده همه
        </Link>
      </div>
      {products.loading && <SkeletonGrid count={3} />}
      {products.error && <ErrorState onRetry={products.retry} />}
      {products.data && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-12 lg:grid-cols-4">
          {products.data.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}
