import { useEffect, useMemo, useRef, useState } from 'react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import ProductForm from '@/components/admin/content/ProductForm';
import { ErrorState, SkeletonGrid } from '@/components/common/StateViews';
import { useAsync } from '@/hooks/useAsync';
import {
  catalogErrorMessage,
  deleteProduct,
  fetchAdminCategories,
  fetchAdminProductDetail,
  fetchAdminProducts,
  setProductActive,
  type ProductInput,
} from '@/lib/adminCatalog';
import { formatToman } from '@/lib/format';

type View = { kind: 'list' } | { kind: 'form'; input: ProductInput | null };

export default function ProductsManager({ canEdit, initialEditId = null }: { canEdit: boolean; initialEditId?: string | null }) {
  const products = useAsync(fetchAdminProducts, []);
  const categories = useAsync(fetchAdminCategories, []);
  const [view, setView] = useState<View>({ kind: 'list' });
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!products.data) return [];
    if (!term) return products.data;
    return products.data.filter((item) => item.name.toLowerCase().includes(term) || item.brand.toLowerCase().includes(term));
  }, [products.data, query]);

  async function openEdit(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const detail = await fetchAdminProductDetail(id);
      if (!detail) {
        setError('این محصول پیدا نشد. فهرست را به‌روز کنید.');
        return;
      }
      setView({ kind: 'form', input: detail.input });
    } catch {
      setError('بارگذاری محصول انجام نشد. لطفاً دوباره تلاش کنید.');
    } finally {
      setBusyId(null);
    }
  }

  // Opened from a storefront "quick edit" link: jump straight into that product's form, once.
  const autoOpened = useRef<string | null>(null);
  useEffect(() => {
    if (!initialEditId || autoOpened.current === initialEditId) return;
    autoOpened.current = initialEditId;
    void openEdit(initialEditId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEditId]);

  async function toggleActive(id: string, isActive: boolean) {
    setBusyId(id);
    setError(null);
    try {
      await setProductActive(id, !isActive);
      products.retry();
    } catch (cause) {
      setError(catalogErrorMessage(cause));
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await deleteProduct(id);
      setConfirmId(null);
      setNotice('محصول حذف شد.');
      products.retry();
    } catch (cause) {
      setError(catalogErrorMessage(cause));
    } finally {
      setBusyId(null);
    }
  }

  if (view.kind === 'form') {
    return (
      <section className="space-y-8 rounded-3xl border border-ivory-300 bg-ivory-50 p-6 shadow-soft md:p-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl">{view.input ? 'ویرایش محصول' : 'افزودن محصول جدید'}</h2>
        </div>
        {categories.loading && <SkeletonGrid count={1} />}
        {categories.error && <ErrorState onRetry={categories.retry} />}
        {categories.data && (
          <ProductForm
            initial={view.input}
            categories={categories.data}
            canEdit={canEdit}
            onSaved={() => {
              setView({ kind: 'list' });
              setNotice('محصول با موفقیت ذخیره شد.');
              products.retry();
            }}
            onCancel={() => setView({ kind: 'list' })}
          />
        )}
      </section>
    );
  }

  return (
    <section className="space-y-6 rounded-3xl border border-ivory-300 bg-ivory-50 p-6 shadow-soft md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" aria-hidden="true" />
          <input
            type="search"
            aria-label="جستجوی محصول"
            placeholder="جستجوی نام یا برند"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="field ps-10"
          />
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => {
              setNotice(null);
              setView({ kind: 'form', input: null });
            }}
            className="btn-primary"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            محصول جدید
          </button>
        )}
      </div>

      {notice && (
        <p role="status" className="rounded-xl bg-success-100 px-4 py-3 text-sm text-success-600">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-error-100 px-4 py-3 text-sm text-error-600">
          {error}
        </p>
      )}

      {products.loading && <SkeletonGrid count={2} />}
      {products.error && <ErrorState onRetry={products.retry} />}
      {products.data && filtered.length === 0 && (
        <p className="rounded-2xl bg-ivory-200/60 p-8 text-center text-sm text-ink-500">محصولی با این مشخصات پیدا نشد.</p>
      )}

      {products.data && filtered.length > 0 && (
        <ul className="divide-y divide-ivory-300 rounded-2xl border border-ivory-300">
          {filtered.map((item) => {
            const image = item.images[0];
            const confirming = confirmId === item.id;
            return (
              <li key={item.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-ivory-200">
                    {image && <img src={image} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <p className="truncate font-medium text-ink-900">{item.name}</p>
                    <p className="truncate text-xs text-ink-500">
                      {item.categoryName} · {formatToman(item.priceToman)} · موجودی {item.stock}
                    </p>
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs ${
                        item.isActive ? 'bg-success-100 text-success-600' : 'bg-ivory-200 text-ink-500'
                      }`}
                    >
                      {item.isActive ? 'منتشر شده' : 'پیش‌نویس'}
                    </span>
                  </div>
                </div>

                {confirming ? (
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => void remove(item.id)} disabled={busyId === item.id} className="btn-primary h-10 px-4 text-sm">
                      تأیید حذف
                    </button>
                    <button type="button" onClick={() => setConfirmId(null)} className="btn-outline h-10 px-4 text-sm">
                      انصراف
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => void toggleActive(item.id, item.isActive)}
                        disabled={busyId === item.id}
                        className="btn-outline h-10 px-4 text-sm"
                      >
                        {item.isActive ? 'پیش‌نویس کردن' : 'انتشار'}
                      </button>
                    )}
                    <button type="button" onClick={() => void openEdit(item.id)} disabled={busyId === item.id} className="btn-outline h-10 px-4 text-sm">
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                      {canEdit ? 'ویرایش' : 'مشاهده'}
                    </button>
                    {canEdit && (
                      <button type="button" onClick={() => setConfirmId(item.id)} disabled={busyId === item.id} className="btn-outline h-10 px-4 text-sm text-error-600">
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        حذف
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
