import AdminQuickBar from '@/components/admin/AdminQuickBar';
import QuickEditButton from '@/components/admin/QuickEditButton';
import CompareToggleButton from '@/components/product/CompareToggleButton';
import ProductBuyBox from '@/components/product/ProductBuyBox';
import ProductGallery from '@/components/product/ProductGallery';
import ProductTabs from '@/components/product/ProductTabs';
import ProductSection from '@/components/home/ProductSection';
import Link from '@/components/common/Link';
import { ErrorState, SkeletonGrid } from '@/components/common/StateViews';
import { useAsync } from '@/hooks/useAsync';
import { contentEditPath } from '@/lib/adminLinks';
import { fetchProductBySlug } from '@/lib/catalog';
import Stars from '@/components/common/Stars';
import type { Product } from '@/types/catalog';

export default function ProductPage({ slug }: { slug: string }) {
  const request = useAsync(() => fetchProductBySlug(slug), [slug]);

  if (request.loading) {
    return (
      <div className="container-nova py-12">
        <SkeletonGrid count={2} />
      </div>
    );
  }
  if (request.error) {
    return (
      <div className="container-nova py-12">
        <ErrorState onRetry={request.retry} />
      </div>
    );
  }
  if (!request.data) {
    return (
      <div className="container-nova flex flex-col items-center gap-6 py-24 text-center">
        <h1 className="text-3xl">محصول مورد نظر پیدا نشد</h1>
        <p className="text-ink-500">ممکن است این محصول حذف شده باشد یا آدرس آن تغییر کرده باشد.</p>
        <Link to="/shop" className="btn-primary">
          بازگشت به فروشگاه
        </Link>
      </div>
    );
  }

  return <ProductDetail key={request.data.id} product={request.data} />;
}

function ProductDetail({ product }: { product: Product }) {
  return (
    <>
      <div className="container-nova py-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <nav aria-label="مسیر صفحه" className="text-sm text-ink-500">
            <Link to="/" className="hover:text-burgundy-700">خانه</Link>
            <span className="mx-2">/</span>
            <Link to={`/shop?category=${product.categorySlug}`} className="hover:text-burgundy-700">
              {product.categoryName}
            </Link>
            <span className="mx-2">/</span>
            <span className="text-ink-900">{product.name}</span>
          </nav>
          <QuickEditButton inline to={contentEditPath('products', { edit: product.id })} label="ویرایش سریع محصول" />
        </div>

        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <ProductGallery images={product.images} name={product.name} />
          <div className="flex flex-col gap-5">
            <ProductBuyBox product={product} />
            <CompareToggleButton variant="full" productId={product.id} productName={product.name} />
          </div>
        </div>

        <div className="mt-20">
          <ProductTabs product={product} />
        </div>

        <div className="mt-6 flex items-center gap-3 text-sm text-ink-500">
          <Stars value={product.rating} />
          <span>امتیاز میانگین {product.rating.toLocaleString('fa-IR')} از ۵</span>
        </div>
      </div>

      <ProductSection
        eyebrow="ممکن است بپسندید"
        title="محصولات مرتبط"
        query={{ categorySlug: product.categorySlug, excludeId: product.id, pageSize: 4 }}
        viewAllTo={`/shop?category=${product.categorySlug}`}
      />

      <AdminQuickBar
        links={[
          { label: 'ویرایش این محصول', to: contentEditPath('products', { edit: product.id }) },
          { label: 'همه محصولات', to: contentEditPath('products') },
          { label: 'نظرات', to: contentEditPath('reviews') },
          { label: 'پرسش و پاسخ', to: contentEditPath('questions') },
          { label: 'سفارش‌ها', to: '/admin/orders' },
        ]}
      />
    </>
  );
}
