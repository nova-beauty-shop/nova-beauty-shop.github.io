import { useState, type FormEvent } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import ImageField from '@/components/admin/content/ImageField';
import { FormField, FormStatus } from '@/components/admin/settings/SettingsSection';
import { ErrorState, SkeletonGrid } from '@/components/common/StateViews';
import { useAsync } from '@/hooks/useAsync';
import {
  catalogErrorMessage,
  deleteStory,
  fetchAdminStories,
  saveStory,
  type StoryInput,
} from '@/lib/adminCatalog';
import { parseIntegerInput } from '@/lib/digits';

const EMPTY_STORY: StoryInput = {
  title: '',
  mediaType: 'image',
  mediaUrl: '',
  linkUrl: '',
  sortOrder: 0,
  isActive: true,
};

export default function StoriesManager({ canEdit }: { canEdit: boolean }) {
  const stories = useAsync(fetchAdminStories, []);
  const [editing, setEditing] = useState<StoryInput | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function remove(id: string) {
    setError(null);
    try {
      await deleteStory(id);
      setNotice('استوری حذف شد.');
      stories.retry();
    } catch (cause) {
      setError(catalogErrorMessage(cause));
    }
  }

  return (
    <section className="space-y-6 rounded-3xl border border-ivory-300 bg-ivory-50 p-6 shadow-soft md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h2 className="text-xl">استوری‌ها</h2>
          <p className="text-sm text-ink-500">حلقه‌های بالای صفحه نخست؛ هر استوری می‌تواند تصویر یا ویدیو باشد.</p>
        </div>
        {canEdit && !editing && (
          <button type="button" onClick={() => { setNotice(null); setEditing(EMPTY_STORY); }} className="btn-primary">
            <Plus className="h-4 w-4" aria-hidden="true" />
            استوری جدید
          </button>
        )}
      </div>

      {notice && <p role="status" className="rounded-xl bg-success-100 px-4 py-3 text-sm text-success-600">{notice}</p>}
      {error && <p role="alert" className="rounded-xl bg-error-100 px-4 py-3 text-sm text-error-600">{error}</p>}

      {editing && (
        <StoryEditor
          initial={editing}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setNotice('استوری ذخیره شد.');
            stories.retry();
          }}
        />
      )}

      {stories.loading && <SkeletonGrid count={2} />}
      {stories.error && <ErrorState onRetry={stories.retry} />}
      {stories.data && stories.data.length === 0 && (
        <p className="rounded-2xl bg-ivory-200/60 p-8 text-center text-sm text-ink-500">هنوز استوری‌ای ثبت نشده است.</p>
      )}
      {stories.data && stories.data.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {stories.data.map((item) => (
            <li key={item.id} className="overflow-hidden rounded-2xl border border-ivory-300 bg-ivory-50">
              <div className="relative aspect-[9/16] max-h-56 w-full bg-ivory-200">
                {item.mediaType === 'image' && item.mediaUrl && (
                  <img src={item.mediaUrl} alt="" className="h-full w-full object-cover" />
                )}
                {item.mediaType === 'video' && (
                  <div className="flex h-full items-center justify-center text-sm text-ink-500">ویدیو</div>
                )}
                <span className={`absolute end-2 top-2 rounded-full px-2.5 py-0.5 text-xs ${item.isActive ? 'bg-success-100 text-success-600' : 'bg-ivory-50 text-ink-500'}`}>
                  {item.isActive ? 'فعال' : 'غیرفعال'}
                </span>
              </div>
              <div className="space-y-3 p-4">
                <p className="truncate font-medium text-ink-900">{item.title}</p>
                {canEdit && (
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setNotice(null); setEditing(item); }} className="btn-outline h-9 flex-1 px-3 text-sm">
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                      ویرایش
                    </button>
                    <button type="button" onClick={() => void remove(item.id)} className="btn-outline h-9 px-3 text-sm text-error-600" aria-label="حذف استوری">
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function StoryEditor({ initial, onSaved, onCancel }: { initial: StoryInput; onSaved: () => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<StoryInput & { sortText: string }>({ ...initial, sortText: String(initial.sortOrder) });
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
      await saveStory({ ...draft, sortOrder });
      onSaved();
    } catch (cause) {
      setStatus({ tone: 'error', text: catalogErrorMessage(cause) });
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-5 rounded-2xl bg-ivory-200/60 p-5 sm:grid-cols-2">
      <FormField id="s-title" label="عنوان استوری">
        <input id="s-title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="field" />
      </FormField>
      <FormField id="s-type" label="نوع رسانه">
        <select id="s-type" value={draft.mediaType} onChange={(e) => setDraft({ ...draft, mediaType: e.target.value as StoryInput['mediaType'] })} className="field">
          <option value="image">تصویر</option>
          <option value="video">ویدیو</option>
        </select>
      </FormField>
      <FormField id="s-link" label="آدرس لینک هنگام کلیک" hint="مثال: /shop">
        <input id="s-link" dir="ltr" value={draft.linkUrl} onChange={(e) => setDraft({ ...draft, linkUrl: e.target.value })} className="field text-start" />
      </FormField>
      <FormField id="s-sort" label="ترتیب نمایش">
        <input id="s-sort" inputMode="numeric" value={draft.sortText} onChange={(e) => setDraft({ ...draft, sortText: e.target.value })} className="field" />
      </FormField>
      <label className="flex items-center gap-3 text-sm text-ink-900">
        <input type="checkbox" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} className="h-5 w-5 accent-burgundy-700" />
        نمایش در سایت
      </label>
      <div className="sm:col-span-2">
        <p className="mb-3 text-sm font-medium text-ink-900">{draft.mediaType === 'image' ? 'تصویر استوری' : 'آدرس ویدیو (https)'}</p>
        {draft.mediaType === 'image' ? (
          <ImageField id="s-media" value={draft.mediaUrl} disabled={saving} onChange={(url) => setDraft({ ...draft, mediaUrl: url })} />
        ) : (
          <input
            id="s-media"
            type="url"
            dir="ltr"
            placeholder="https://..."
            value={draft.mediaUrl}
            disabled={saving}
            onChange={(e) => setDraft({ ...draft, mediaUrl: e.target.value.trim() })}
            className="field text-start"
          />
        )}
      </div>
      <FormStatus status={status} />
      <div className="flex flex-wrap gap-3 sm:col-span-2">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'در حال ذخیره...' : 'ذخیره استوری'}
        </button>
        <button type="button" onClick={onCancel} disabled={saving} className="btn-outline">
          انصراف
        </button>
      </div>
    </form>
  );
}
