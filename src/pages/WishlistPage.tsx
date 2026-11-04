import Link from '@/components/common/Link';
import ProductCard from '@/components/product/ProductCard';
import { EmptyState, ErrorState, SkeletonGrid } from '@/components/common/StateViews';
import { useAsync } from '@/hooks/useAsync';
import { useShop } from '@/hooks/useShop';
import { fetchProducts } from '@/lib/catalog';

export default function WishlistPage() {
  const { wishlist } = useShop();
  const idsKey = wishlist.join(',');
  const request = useAsync(async () => {
    const { items } = await fetchProducts({ ids: wishlist, pageSize: 100 });
    return items;
  }, [idsKey]);

  return (
    <div className="container-nova py-12">
      <h1 className="mb-10 text-3xl md:text-4xl">علاقه‌مندی‌ها</h1>
      {request.loading && <SkeletonGrid count={3} />}
      {request.error && <ErrorState onRetry={request.retry} />}
      {request.data && request.data.length === 0 && (
        <EmptyState
          title="لیست علاقه‌مندی‌های شما خالی است"
          description="با زدن قلب روی هر محصول، آن را برای خرید بعدی ذخیره کنید."
          action={
            <Link to="/shop" className="btn-primary">
              مشاهده فروشگاه
            </Link>
          }
        />
      )}
      {request.data && request.data.length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-12 lg:grid-cols-3">
          {request.data.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
