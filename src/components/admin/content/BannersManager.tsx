import { useMemo, useState, type FormEvent } from 'react';
import { ChevronDown, ChevronUp, Eye, EyeOff, Images, Pencil, Plus, Trash2 } from 'lucide-react';
import ImageField from '@/components/admin/content/ImageField';
import { FormField, FormStatus } from '@/components/admin/settings/SettingsSection';
import { ErrorState, SkeletonGrid } from '@/components/common/StateViews';
import { useAsync } from '@/hooks/useAsync';
import {
  catalogErrorMessage,
  deleteBanner,
  fetchAdminBanners,
  reorderBanners,
  saveBanner,
  setBannerActive,
  type AdminBanner,
  type BannerInput,
} from '@/lib/adminCatalog';
import { HERO_SLIDE_SECONDS } from '@/components/home/HeroSection';
import { parseIntegerInput } from '@/lib/digits';

const PLACEMENT_LABELS: Record<BannerInput['placement'], string> = {
  hero: 'اسلاید بالای سایت',
  promo: 'بنر تبلیغاتی',
};

const EMPTY_BANNER: BannerInput = {
  title: '',
  placement: 'promo',
  eyebrow: '',
  subtitle: '',
  ctaLabel: '',
  ctaUrl: '',
  imageUrl: '',
  sortOrder: 0,
  isActive: true,
};

export default function BannersManager({ canEdit }: { canEdit: boolean }) {
  const banners = useAsync(fetchAdminBanners, []);
  const [editing, setEditing] = useState<BannerInput | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const slides = useMemo(() => banners.data?.filter((item) => item.placement === 'hero') ?? [], [banners.data]);
  const promos = useMemo(() => banners.data?.filter((item) => item.placement === 'promo') ?? [], [banners.data]);
  const activeSlides = slides.filter((item) => item.isActive).length;

  async function run(id: string, action: () => Promise<void>, success: string | null) {
    setBusyId(id);
    setError(null);
    setNotice(null);
    try {
      await action();
      if (success) setNotice(success);
      banners.retry();
    } catch (cause) {
      setError(catalogErrorMessage(cause));
    } finally {
      setBusyId(null);
    }
  }

  function move(id: string, direction: -1 | 1) {
    const ids = slides.map((item) => item.id);
    const from = ids.indexOf(id);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= ids.length) return;
    [ids[from], ids[to]] = [ids[to], ids[from]];
    void run(id, () => reorderBanners(ids), null);
  }

  function startNew(placement: BannerInput['placement']) {
    setNotice(null);
    const group = placement === 'hero' ? slides : promos;
    const nextOrder = group.reduce((highest, item) => Math.max(highest, item.sortOrder), 0) + 10;
    setEditing({ ...EMPTY_BANNER, placement, sortOrder: nextOrder, ctaUrl: '/shop' });
  }

  return (
    <section className="space-y-8 rounded-3xl border border-ivory-300 bg-ivory-50 p-6 shadow-soft md:p-8">
      <div className="space-y-2">
        <h2 className="text-xl">بنرها و اسلایدر صفحه نخست</h2>
        <p className="text-sm leading-[1.8] text-ink-500">
          اسلایدهای بالای سایت هر {HERO_SLIDE_SECONDS.toLocaleString('fa-IR')} ثانیه به‌صورت خودکار عوض می‌شوند و ترتیب آن‌ها همان ترتیب فهرست زیر است.
        </p>
      </div>

      {notice && <p role="status" className="rounded-xl bg-success-100 px-4 py-3 text-sm text-success-600">{notice}</p>}
      {error && <p role="alert" className="rounded-xl bg-error-100 px-4 py-3 text-sm text-error-600">{error}</p>}

      {editing && (
        <BannerEditor
          key={editing.id ?? 'new'}
          initial={editing}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setNotice('بنر ذخیره شد.');
            banners.retry();
          }}
        />
      )}

      {banners.loading && <SkeletonGrid count={2} />}
      {banners.error && <ErrorState onRetry={banners.retry} />}

      {banners.data && (
        <>
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="flex items-center gap-2 text-base font-medium">
                <Images className="h-5 w-5 text-rose-600" aria-hidden="true" />
                اسلایدهای بالای سایت
                <span className="text-sm font-normal text-ink-500">
                  ({activeSlides.toLocaleString('fa-IR')} فعال از {slides.length.toLocaleString('fa-IR')})
                </span>
              </h3>
              {canEdit && !editing && (
                <button type="button" onClick={() => startNew('hero')} className="inline-flex items-center justify-center gap-2 rounded-full bg-white text-burgundy-900 px-5 py-2.5 text-xs sm:text-sm font-bold shadow-md hover:bg-ivory-100 transition">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  افزودن اسلاید
                </button>
              )}
            </div>

            {activeSlides === 0 && (
              <p role="status" className="rounded-xl bg-warning-100 px-4 py-3 text-sm text-warning-600">
                هیچ اسلاید فعالی وجود ندارد؛ تا یک اسلاید فعال اضافه نکنید، بالای صفحه نخست خالی می‌ماند.
              </p>
            )}

            <BannerList
              items={slides}
              canEdit={canEdit}
              busyId={busyId}
              sortable
              emptyText="هنوز اسلایدی اضافه نشده است."
              onEdit={(item) => { setNotice(null); setEditing(item); }}
              onDelete={(item) => void run(item.id, () => deleteBanner(item.id), 'اسلاید حذف شد.')}
              onToggle={(item) => void run(item.id, () => setBannerActive(item.id, !item.isActive), null)}
              onMove={move}
            />
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-base font-medium">بنرهای تبلیغاتی</h3>
              {canEdit && !editing && (
                <button type="button" onClick={() => startNew('promo')} className="btn-outline h-10 px-5 text-sm">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  بنر تبلیغاتی جدید
                </button>
              )}
            </div>
            <BannerList
              items={promos}
              canEdit={canEdit}
              busyId={busyId}
              emptyText="هنوز بنر تبلیغاتی ثبت نشده است."
              onEdit={(item) => { setNotice(null); setEditing(item); }}
              onDelete={(item) => void run(item.id, () => deleteBanner(item.id), 'بنر حذف شد.')}
              onToggle={(item) => void run(item.id, () => setBannerActive(item.id, !item.isActive), null)}
              onMove={move}
            />
          </div>
        </>
      )}
    </section>
  );
}

function BannerList({
  items,
  canEdit,
  busyId,
  sortable = false,
  emptyText,
  onEdit,
  onDelete,
  onToggle,
  onMove,
}: {
  items: AdminBanner[];
  canEdit: boolean;
  busyId: string | null;
  sortable?: boolean;
  emptyText: string;
  onEdit: (item: AdminBanner) => void;
  onDelete: (item: AdminBanner) => void;
  onToggle: (item: AdminBanner) => void;
  onMove: (id: string, direction: -1 | 1) => void;
}) {
  if (items.length === 0) {
    return <p className="rounded-2xl border border-dashed border-ivory-300 px-4 py-6 text-center text-sm text-ink-500">{emptyText}</p>;
  }
  return (
    <ul className="divide-y divide-ivory-300 rounded-2xl border border-ivory-300">
      {items.map((item, index) => {
        const busy = busyId === item.id;
        return (
          <li key={item.id} className={`flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between ${item.isActive ? '' : 'bg-ivory-200/40'}`}>
            <div className="flex min-w-0 items-center gap-4">
              {sortable && (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-burgundy-700 text-sm font-medium text-ivory-50">
                  {(index + 1).toLocaleString('fa-IR')}
                </span>
              )}
              <div className="h-14 w-24 shrink-0 overflow-hidden rounded-xl bg-ivory-200">
                {item.imageUrl && <img src={item.imageUrl} alt="" className={`h-full w-full object-cover ${item.isActive ? '' : 'opacity-50'}`} />}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium text-ink-900">{item.title}</p>
                <p className="truncate text-xs text-ink-500">
                  {item.eyebrow ? `${item.eyebrow} · ` : ''}
                  {item.isActive ? 'فعال' : 'غیرفعال'}
                </p>
              </div>
            </div>
            {canEdit && (
              <div className="flex flex-wrap gap-2">
                {sortable && (
                  <>
                    <button type="button" disabled={busy || index === 0} onClick={() => onMove(item.id, -1)} aria-label={`بالا بردن «${item.title}»`} className="btn-outline h-10 px-3">
                      <ChevronUp className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button type="button" disabled={busy || index === items.length - 1} onClick={() => onMove(item.id, 1)} aria-label={`پایین بردن «${item.title}»`} className="btn-outline h-10 px-3">
                      <ChevronDown className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </>
                )}
                <button type="button" disabled={busy} onClick={() => onToggle(item)} aria-pressed={item.isActive} className="btn-outline h-10 px-4 text-sm">
                  {item.isActive ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                  {item.isActive ? 'مخفی کردن' : 'نمایش'}
                </button>
                <button type="button" disabled={busy} onClick={() => onEdit(item)} className="btn-outline h-10 px-4 text-sm">
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  ویرایش
                </button>
                <button type="button" disabled={busy} onClick={() => onDelete(item)} className="btn-outline h-10 px-4 text-sm text-error-600">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  حذف
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function BannerEditor({ initial, onSaved, onCancel }: { initial: BannerInput; onSaved: () => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<BannerInput & { sortText: string }>({ ...initial, sortText: String(initial.sortOrder) });
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
    if (draft.placement === 'hero' && draft.imageUrl.trim() === '') {
      setStatus({ tone: 'error', text: 'برای اسلاید بالای سایت انتخاب تصویر الزامی است.' });
      return;
    }
    setSaving(true);
    setStatus(null);
    try {
      await saveBanner({ ...draft, sortOrder });
      onSaved();
    } catch (cause) {
      setStatus({ tone: 'error', text: catalogErrorMessage(cause) });
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-5 rounded-2xl bg-ivory-200/60 p-5 sm:grid-cols-2">
      <FormField id="b-title" label="عنوان بنر">
        <input id="b-title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="field" />
      </FormField>
      <FormField id="b-placement" label="محل نمایش">
        <select id="b-placement" value={draft.placement} onChange={(e) => setDraft({ ...draft, placement: e.target.value as BannerInput['placement'] })} className="field">
          {(Object.keys(PLACEMENT_LABELS) as BannerInput['placement'][]).map((key) => (
            <option key={key} value={key}>
              {PLACEMENT_LABELS[key]}
            </option>
          ))}
        </select>
      </FormField>
      <FormField id="b-eyebrow" label="متن کوچک بالای عنوان">
        <input id="b-eyebrow" value={draft.eyebrow} onChange={(e) => setDraft({ ...draft, eyebrow: e.target.value })} className="field" />
      </FormField>
      <FormField id="b-subtitle" label="متن توضیحی">
        <input id="b-subtitle" value={draft.subtitle} onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })} className="field" />
      </FormField>
      <FormField id="b-cta" label="متن دکمه">
        <input id="b-cta" value={draft.ctaLabel} onChange={(e) => setDraft({ ...draft, ctaLabel: e.target.value })} className="field" />
      </FormField>
      <FormField id="b-url" label="آدرس دکمه" hint="مثال: /shop یا /product/نام-محصول">
        <input id="b-url" dir="ltr" value={draft.ctaUrl} onChange={(e) => setDraft({ ...draft, ctaUrl: e.target.value })} className="field text-start" />
      </FormField>
      <FormField id="b-sort" label="ترتیب نمایش">
        <input id="b-sort" inputMode="numeric" value={draft.sortText} onChange={(e) => setDraft({ ...draft, sortText: e.target.value })} className="field" />
      </FormField>
      <label className="flex items-center gap-3 self-end text-sm text-ink-900">
        <input type="checkbox" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} className="h-5 w-5 accent-burgundy-700" />
        نمایش در سایت
      </label>
      <div className="sm:col-span-2">
        <p className="mb-1 text-sm font-medium text-ink-900">تصویر بنر</p>
        <p className="mb-3 text-xs leading-[1.7] text-ink-500">برای اسلایدر بالای سایت تصویر افقی و باکیفیت (حداقل ۱۶۰۰ پیکسل عرض) پیشنهاد می‌شود.</p>
        <ImageField id="b-image" value={draft.imageUrl} disabled={saving} onChange={(url) => setDraft({ ...draft, imageUrl: url })} />
      </div>
      <FormStatus status={status} />
      <div className="flex flex-wrap gap-3 sm:col-span-2">
        <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-full bg-white text-burgundy-900 px-5 py-2.5 text-xs sm:text-sm font-bold shadow-md hover:bg-ivory-100 transition">
          {saving ? 'در حال ذخیره...' : draft.placement === 'hero' ? 'ذخیره اسلاید' : 'ذخیره بنر'}
        </button>
        <button type="button" onClick={onCancel} disabled={saving} className="btn-outline">
          انصراف
        </button>
      </div>
    </form>
  );
}
