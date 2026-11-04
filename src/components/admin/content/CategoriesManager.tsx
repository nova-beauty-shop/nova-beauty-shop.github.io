import { useState, type FormEvent } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import ImageField from '@/components/admin/content/ImageField';
import { FormField, FormStatus } from '@/components/admin/settings/SettingsSection';
import { ErrorState, SkeletonGrid } from '@/components/common/StateViews';
import { useAsync } from '@/hooks/useAsync';
import {
  catalogErrorMessage,
  deleteCategory,
  fetchAdminCategories,
  saveCategory,
  type AdminCategory,
  type CategoryInput,
} from '@/lib/adminCatalog';
import { parseIntegerInput } from '@/lib/digits';

const EMPTY_CATEGORY: CategoryInput = { name: '', slug: '', description: '', imageUrl: '', sortOrder: 0, isActive: true };

export default function CategoriesManager({ canEdit }: { canEdit: boolean }) {
  const categories = useAsync(fetchAdminCategories, []);
  const [editing, setEditing] = useState<CategoryInput | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function remove(id: string) {
    setError(null);
    try {
      await deleteCategory(id);
      setNotice('دسته‌بندی حذف شد.');
      categories.retry();
    } catch (cause) {
      setError(catalogErrorMessage(cause));
    }
  }

  return (
    <section className="space-y-6 rounded-3xl border border-ivory-300 bg-ivory-50 p-6 shadow-soft md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl">دسته‌بندی‌ها</h2>
        {canEdit && !editing && (
          <button type="button" onClick={() => { setNotice(null); setEditing(EMPTY_CATEGORY); }} className="btn-primary">
            <Plus className="h-4 w-4" aria-hidden="true" />
            دسته‌بندی جدید
          </button>
        )}
      </div>

      {notice && <p role="status" className="rounded-xl bg-success-100 px-4 py-3 text-sm text-success-600">{notice}</p>}
      {error && <p role="alert" className="rounded-xl bg-error-100 px-4 py-3 text-sm text-error-600">{error}</p>}

      {editing && (
        <CategoryEditor
          initial={editing}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setNotice('دسته‌بندی ذخیره شد.');
            categories.retry();
          }}
        />
      )}

      {categories.loading && <SkeletonGrid count={2} />}
      {categories.error && <ErrorState onRetry={categories.retry} />}
      {categories.data && (
        <ul className="divide-y divide-ivory-300 rounded-2xl border border-ivory-300">
          {categories.data.map((item) => (
            <li key={item.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-ivory-200">
                  {item.imageUrl && <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-ink-900">{item.name}</p>
                  <p className="text-xs text-ink-500" dir="ltr">
                    {item.slug} · ترتیب {item.sortOrder} · {item.isActive ? 'فعال' : 'غیرفعال'}
                  </p>
                </div>
              </div>
              {canEdit && (
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => { setNotice(null); setEditing(toInput(item)); }} className="btn-outline h-10 px-4 text-sm">
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    ویرایش
                  </button>
                  <button type="button" onClick={() => void remove(item.id)} className="btn-outline h-10 px-4 text-sm text-error-600">
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    حذف
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function toInput(item: AdminCategory): CategoryInput {
  return { id: item.id, name: item.name, slug: item.slug, description: item.description, imageUrl: item.imageUrl, sortOrder: item.sortOrder, isActive: item.isActive };
}

function CategoryEditor({ initial, onSaved, onCancel }: { initial: CategoryInput; onSaved: () => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<CategoryInput & { sortText: string }>({ ...initial, sortText: String(initial.sortOrder) });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ tone: 'error'; text: string } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const sortOrder = parseIntegerInput(draft.sortText);
    if (sortOrder === null) {
      setStatus({ tone: 'error', text: 'ترتیب نمایش را فقط با عدد وارد کنید.' });
      return;
    }
    setSaving(true);
    setStatus(null);
    try {
      await saveCategory({ ...draft, sortOrder });
      onSaved();
    } catch (cause) {
      setStatus({ tone: 'error', text: catalogErrorMessage(cause) });
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-5 rounded-2xl bg-ivory-200/60 p-5 sm:grid-cols-2">
      <FormField id="c-name" label="نام دسته‌بندی">
        <input id="c-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="field" />
      </FormField>
      <FormField id="c-slug" label="آدرس یکتا (انگلیسی)">
        <input id="c-slug" dir="ltr" value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} className="field text-start" />
      </FormField>
      <FormField id="c-desc" label="توضیح کوتاه" className="sm:col-span-2">
        <textarea id="c-desc" rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className="field" />
      </FormField>
      <FormField id="c-sort" label="ترتیب نمایش">
        <input id="c-sort" inputMode="numeric" value={draft.sortText} onChange={(e) => setDraft({ ...draft, sortText: e.target.value })} className="field" />
      </FormField>
      <label className="flex items-center gap-3 self-end text-sm text-ink-900">
        <input type="checkbox" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} className="h-5 w-5 accent-burgundy-700" />
        نمایش در فروشگاه
      </label>
      <div className="sm:col-span-2">
        <p className="mb-3 text-sm font-medium text-ink-900">تصویر دسته‌بندی</p>
        <ImageField id="c-image" value={draft.imageUrl} disabled={saving} onChange={(url) => setDraft({ ...draft, imageUrl: url })} />
      </div>
      <FormStatus status={status} />
      <div className="flex flex-wrap gap-3 sm:col-span-2">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'در حال ذخیره...' : 'ذخیره دسته‌بندی'}
        </button>
        <button type="button" onClick={onCancel} disabled={saving} className="btn-outline">
          انصراف
        </button>
      </div>
    </form>
  );
}
