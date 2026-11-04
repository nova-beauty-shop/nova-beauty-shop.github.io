import QuickEditButton from '@/components/admin/QuickEditButton';
import Link from '@/components/common/Link';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { contentEditPath } from '@/lib/adminLinks';
import { useAsync } from '@/hooks/useAsync';
import { fetchCategories } from '@/lib/catalog';

export default function CategoryGrid() {
  const categories = useAsync(fetchCategories, []);
  const { canQuickEdit } = useAdminAccess();
  if (categories.error || categories.loading || !categories.data?.length) {
    // Admins still get the edit button when there are no categories yet, so they can add the first one.
    if (!canQuickEdit || categories.loading) return null;
    return (
      <section className="container-nova relative py-16">
        <p className="rounded-2xl border border-dashed border-ink-300 px-6 py-10 text-center text-sm text-ink-500">
          هنوز دسته‌بندی‌ای ثبت نشده است.
        </p>
        <QuickEditButton to={contentEditPath('categories')} label="ویرایش سریع دسته‌بندی‌ها" className="end-4 top-20 sm:end-6 lg:end-10" />
      </section>
    );
  }

  return (
    <section className="container-nova relative py-16">
      <QuickEditButton to={contentEditPath('categories')} label="ویرایش سریع دسته‌بندی‌ها" className="end-4 top-16 sm:end-6 lg:end-10" />
      <div className="mb-10 flex flex-col gap-2">
        <p className="eyebrow">دسته‌بندی‌ها</p>
        <h2 className="text-3xl md:text-4xl">هر آنچه برای زیبایی روزانه‌تان لازم دارید</h2>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {categories.data.map((category) => (
          <Link
            key={category.id}
            to={`/shop?category=${category.slug}`}
            className="group relative flex aspect-[4/5] overflow-hidden rounded-2xl bg-ivory-300"
          >
            <img
              src={category.imageUrl}
              alt=""
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-burgundy-900/90 via-burgundy-900/20 to-transparent" />
            <div className="relative mt-auto space-y-2 p-6 text-ivory-50">
              <h3 className="text-xl text-ivory-50">{category.name}</h3>
              <p className="text-sm leading-relaxed text-ivory-200 opacity-90">{category.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
