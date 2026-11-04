import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react';
import ImageField from '@/components/admin/content/ImageField';
import { FormField, FormStatus } from '@/components/admin/settings/SettingsSection';
import { ErrorState, SkeletonGrid } from '@/components/common/StateViews';
import { useAsync } from '@/hooks/useAsync';
import { adminWriteErrorMessage } from '@/lib/adminWriteErrors';
import {
  deleteFreeSample,
  fetchFreeSamples,
  saveFreeSample,
  setFreeSampleActive,
  type AdminFreeSample,
  type FreeSampleInput,
} from '@/lib/adminSamples';
import { parseIntegerInput } from '@/lib/digits';
import { formatToman } from '@/lib/format';

const EMPTY_SAMPLE: FreeSampleInput = {
  title: '',
  description: '',
  imageUrl: '',
  minSubtotalToman: 0,
  isActive: true,
  sortOrder: 0,
};

export default function SamplesManager({ canEdit }: { canEdit: boolean }) {
  const samples = useAsync(fetchFreeSamples, []);
  const [editing, setEditing] = useState<FreeSampleInput | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(item: AdminFreeSample) {
    setError(null);
    try {
      await setFreeSampleActive(item.id, !item.isActive);
      setNotice(item.isActive ? 'نمونه غیرفعال شد.' : 'نمونه فعال شد.');
      samples.retry();
    } catch (cause) {
      setError(adminWriteErrorMessage(cause));
    }
  }

  async function remove(id: string) {
    setError(null);
    try {
      await deleteFreeSample(id);
      setNotice('نمونه حذف شد.');
      samples.retry();
    } catch (cause) {
      setError(adminWriteErrorMessage(cause));
    }
  }

  return (
    <section className="space-y-6 rounded-3xl border border-ivory-300 bg-ivory-50 p-6 shadow-soft md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl">نمونه‌های رایگان</h2>
          <p className="mt-1 text-sm text-ink-500">مشتری می‌تواند در سبد خرید یکی از نمونه‌های فعال را به صورت رایگان انتخاب کند.</p>
        </div>
        {canEdit && !editing && (
          <button type="button" onClick={() => { setNotice(null); setEditing(EMPTY_SAMPLE); }} className="btn-primary">
            <Plus className="h-4 w-4" aria-hidden="true" />
            نمونه جدید
          </button>
        )}
      </div>

      {notice && <p role="status" className="rounded-xl bg-success-100 px-4 py-3 text-sm text-success-600">{notice}</p>}
      {error && <p role="alert" className="rounded-xl bg-error-100 px-4 py-3 text-sm text-error-600">{error}</p>}

      {editing && (
        <SampleEditor
          initial={editing}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setNotice('نمونه ذخیره شد.');
            samples.retry();
          }}
        />
      )}

      {samples.loading && <SkeletonGrid count={2} />}
      {samples.error && <ErrorState onRetry={samples.retry} />}
      {samples.data && samples.data.length === 0 && (
        <p className="rounded-2xl border border-dashed border-ivory-300 p-8 text-center text-sm text-ink-500">هنوز نمونه‌ای ثبت نشده است.</p>
      )}
      {samples.data && samples.data.length > 0 && (
        <ul className="divide-y divide-ivory-300 rounded-2xl border border-ivory-300">
          {samples.data.map((item) => (
            <li key={item.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-ivory-200">
                  {item.imageUrl && <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink-900">{item.title}</p>
                  <p className="text-xs text-ink-500">
                    حداقل خرید {item.minSubtotalToman > 0 ? formatToman(item.minSubtotalToman) : 'ندارد'} · {item.isActive ? 'فعال' : 'غیرفعال'}
                  </p>
                </div>
              </div>
              {canEdit && (
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => void toggle(item)} className="btn-outline h-10 px-4 text-sm">
                    {item.isActive ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                    {item.isActive ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
                  </button>
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

function toInput(item: AdminFreeSample): FreeSampleInput {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    imageUrl: item.imageUrl,
    minSubtotalToman: item.minSubtotalToman,
    isActive: item.isActive,
    sortOrder: item.sortOrder,
  };
}

function SampleEditor({ initial, onSaved, onCancel }: { initial: FreeSampleInput; onSaved: () => void; onCancel: () => void }) {
  const [draft, setDraft] = useState({
    ...initial,
    minText: String(initial.minSubtotalToman),
    sortText: String(initial.sortOrder),
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ tone: 'error'; text: string } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const title = draft.title.trim();
    if (title.length < 2) {
      setStatus({ tone: 'error', text: 'عنوان نمونه باید حداقل ۲ نویسه باشد.' });
      return;
    }
    const minSubtotalToman = parseIntegerInput(draft.minText);
    const sortOrder = parseIntegerInput(draft.sortText);
    if (minSubtotalToman === null || sortOrder === null) {
      setStatus({ tone: 'error', text: 'مبلغ حداقل خرید و ترتیب نمایش را فقط با عدد وارد کنید.' });
      return;
    }
    setSaving(true);
    setStatus(null);
    try {
      await saveFreeSample({ ...draft, title, minSubtotalToman, sortOrder });
      onSaved();
    } catch (cause) {
      setStatus({ tone: 'error', text: adminWriteErrorMessage(cause) });
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-5 rounded-2xl bg-ivory-200/60 p-5 sm:grid-cols-2">
      <FormField id="s-title" label="عنوان نمونه">
        <input id="s-title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="field" />
      </FormField>
      <FormField id="s-min" label="حداقل مبلغ سفارش (تومان)" hint="صفر یعنی بدون حداقل خرید">
        <input id="s-min" inputMode="numeric" value={draft.minText} onChange={(e) => setDraft({ ...draft, minText: e.target.value })} className="field" />
      </FormField>
      <div className="sm:col-span-2">
        <FormField id="s-desc" label="توضیح کوتاه">
          <textarea id="s-desc" rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className="field" />
        </FormField>
      </div>
      <FormField id="s-sort" label="ترتیب نمایش">
        <input id="s-sort" inputMode="numeric" value={draft.sortText} onChange={(e) => setDraft({ ...draft, sortText: e.target.value })} className="field" />
      </FormField>
      <label className="flex items-center gap-3 self-end text-sm text-ink-900">
        <input type="checkbox" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} className="h-5 w-5 accent-burgundy-700" />
        فعال باشد
      </label>
      <div className="sm:col-span-2">
        <p className="mb-3 text-sm font-medium text-ink-900">تصویر نمونه</p>
        <ImageField id="s-image" value={draft.imageUrl} disabled={saving} onChange={(url) => setDraft({ ...draft, imageUrl: url })} />
      </div>
      <FormStatus status={status} />
      <div className="flex flex-wrap gap-3 sm:col-span-2">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'در حال ذخیره...' : 'ذخیره نمونه'}
        </button>
        <button type="button" onClick={onCancel} disabled={saving} className="btn-outline">
          انصراف
        </button>
      </div>
    </form>
  );
}
