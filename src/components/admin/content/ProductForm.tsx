import { useState, type FormEvent } from 'react';
import { Plus, Trash2, Zap } from 'lucide-react';
import CardStyleEditor, { DEFAULT_CARD_STYLE, type CardStyleDraft } from '@/components/admin/content/CardStyleEditor';
import ImageField from '@/components/admin/content/ImageField';
import VariantsEditor, { type VariantDraft } from '@/components/admin/content/VariantsEditor';
import { FormField, FormStatus } from '@/components/admin/settings/SettingsSection';
import { catalogErrorMessage, saveProduct, type AdminCategory, type ProductInput } from '@/lib/adminCatalog';
import { parseIntegerInput } from '@/lib/digits';
import { parseAnimationType } from '@/lib/productStyle';

const MAX_IMAGES = 8;

interface ProductDraft {
  name: string;
  slug: string;
  brand: string;
  categoryId: string;
  shortDescription: string;
  description: string;
  ingredients: string;
  usageInstructions: string;
  price: string;
  compareAt: string;
  costPrice: string;
  stock: string;
  images: string[];
  isBestseller: boolean;
  isNew: boolean;
  isActive: boolean;
  style: CardStyleDraft;
  variants: VariantDraft[];
  isAmazingOffer: boolean;
  /** Value of a `datetime-local` input (device time zone). */
  offerEndsLocal: string;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function toLocalInput(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function isoToLocalInput(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : toLocalInput(date);
}

function localInputToIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

const OFFER_SHORTCUTS = [
  { label: '۲۴ ساعت دیگر', hours: 24 },
  { label: '۳ روز دیگر', hours: 72 },
  { label: '۷ روز دیگر', hours: 168 },
];

export default function ProductForm({
  initial,
  categories,
  canEdit,
  onSaved,
  onCancel,
}: {
  initial: ProductInput | null;
  categories: AdminCategory[];
  canEdit: boolean;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<ProductDraft>(() => toDraft(initial, categories));
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  function update<K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !canEdit) return;
    const price = parseIntegerInput(draft.price);
    const stock = parseIntegerInput(draft.stock);
    const compareAt = draft.compareAt.trim() === '' ? null : parseIntegerInput(draft.compareAt);
    const costPrice = parseIntegerInput(draft.costPrice);
    if (price === null || stock === null || costPrice === null || (draft.compareAt.trim() !== '' && compareAt === null)) {
      setStatus({ tone: 'error', text: 'قیمت‌ها و موجودی را فقط با عدد وارد کنید.' });
      return;
    }
    const variants: ProductInput['variants'] = [];
    for (const item of draft.variants) {
      const priceDelta = item.priceDelta.trim() === '' ? 0 : parseIntegerInput(item.priceDelta);
      if (priceDelta === null) {
        setStatus({ tone: 'error', text: 'افزایش قیمت گزینه‌ها را فقط با عدد وارد کنید.' });
        return;
      }
      variants.push({ id: item.id, kind: item.kind, label: item.label, colorHex: item.colorHex, priceDelta });
    }
    const offerEndsAt = localInputToIso(draft.offerEndsLocal);
    if (draft.isAmazingOffer && !offerEndsAt) {
      setStatus({ tone: 'error', text: 'برای پیشنهاد شگفت‌انگیز، تاریخ و ساعت پایان را مشخص کنید.' });
      return;
    }
    setSaving(true);
    setStatus(null);
    try {
      await saveProduct({
        id: initial?.id,
        name: draft.name,
        slug: draft.slug,
        brand: draft.brand,
        categoryId: draft.categoryId,
        shortDescription: draft.shortDescription,
        description: draft.description,
        ingredients: draft.ingredients,
        usageInstructions: draft.usageInstructions,
        priceToman: price,
        compareAtToman: compareAt,
        costPriceToman: costPrice,
        stock,
        images: draft.images,
        isBestseller: draft.isBestseller,
        isNew: draft.isNew,
        isActive: draft.isActive,
        variants,
        cardBgType: draft.style.cardBgType,
        cardBgValue: draft.style.cardBgValue,
        imageFit: draft.style.imageFit,
        imageScale: draft.style.imageScale,
        imageAngle: draft.style.imageAngle,
        animationType: parseAnimationType(draft.style.animationType),
        isAmazingOffer: draft.isAmazingOffer,
        offerEndsAt,
      });
      onSaved();
    } catch (cause) {
      setStatus({ tone: 'error', text: catalogErrorMessage(cause) });
      setSaving(false);
    }
  }

  const disabled = !canEdit || saving;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="p-name" label="نام محصول">
          <input id="p-name" value={draft.name} disabled={disabled} onChange={(e) => update('name', e.target.value)} className="field" />
        </FormField>
        <FormField id="p-slug" label="آدرس یکتا (انگلیسی)" hint="مثال: nova-hydrating-serum">
          <input id="p-slug" dir="ltr" value={draft.slug} disabled={disabled} onChange={(e) => update('slug', e.target.value)} className="field text-start" />
        </FormField>
        <FormField id="p-brand" label="برند">
          <input id="p-brand" value={draft.brand} disabled={disabled} onChange={(e) => update('brand', e.target.value)} className="field" />
        </FormField>
        <FormField id="p-category" label="دسته‌بندی">
          <select id="p-category" value={draft.categoryId} disabled={disabled} onChange={(e) => update('categoryId', e.target.value)} className="field">
            <option value="">انتخاب کنید</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField id="p-price" label="قیمت (تومان)">
          <input id="p-price" inputMode="numeric" value={draft.price} disabled={disabled} onChange={(e) => update('price', e.target.value)} className="field" />
        </FormField>
        <FormField id="p-compare" label="قیمت قبل از تخفیف (اختیاری)">
          <input id="p-compare" inputMode="numeric" value={draft.compareAt} disabled={disabled} onChange={(e) => update('compareAt', e.target.value)} className="field" />
        </FormField>
        <FormField id="p-cost" label="قیمت تمام‌شده (تومان)" hint="فقط برای مدیر نمایش داده می‌شود و در محاسبه سود استفاده می‌شود.">
          <input id="p-cost" inputMode="numeric" value={draft.costPrice} disabled={disabled} onChange={(e) => update('costPrice', e.target.value)} className="field" />
        </FormField>
        <FormField id="p-stock" label="موجودی">
          <input id="p-stock" inputMode="numeric" value={draft.stock} disabled={disabled} onChange={(e) => update('stock', e.target.value)} className="field" />
        </FormField>
      </div>

      <div className="grid gap-5">
        <FormField id="p-short" label="توضیح کوتاه">
          <input id="p-short" value={draft.shortDescription} disabled={disabled} onChange={(e) => update('shortDescription', e.target.value)} className="field" />
        </FormField>
        <FormField id="p-desc" label="توضیحات کامل">
          <textarea id="p-desc" rows={4} value={draft.description} disabled={disabled} onChange={(e) => update('description', e.target.value)} className="field" />
        </FormField>
        <FormField id="p-ingredients" label="ترکیبات">
          <textarea id="p-ingredients" rows={3} value={draft.ingredients} disabled={disabled} onChange={(e) => update('ingredients', e.target.value)} className="field" />
        </FormField>
        <FormField id="p-usage" label="نحوه مصرف">
          <textarea id="p-usage" rows={3} value={draft.usageInstructions} disabled={disabled} onChange={(e) => update('usageInstructions', e.target.value)} className="field" />
        </FormField>
      </div>

      <div className="space-y-4">
        <p className="text-sm font-medium text-ink-900">تصاویر محصول (حداکثر {MAX_IMAGES} تصویر)</p>
        {draft.images.map((url, index) => (
          <div key={index} className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <ImageField
                id={`p-image-${index}`}
                value={url}
                disabled={disabled}
                allowBackgroundRemoval
                onChange={(next) => setDraft((current) => ({ ...current, images: current.images.map((item, i) => (i === index ? next : item)) }))}
              />
            </div>
            <button
              type="button"
              disabled={disabled}
              onClick={() => update('images', draft.images.filter((_, i) => i !== index))}
              aria-label="حذف این تصویر"
              className="btn-outline h-10 px-3 text-error-600"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ))}
        {draft.images.length < MAX_IMAGES && (
          <button type="button" disabled={disabled} onClick={() => update('images', [...draft.images, ''])} className="btn-outline h-10 px-4 text-sm">
            <Plus className="h-4 w-4" aria-hidden="true" />
            افزودن تصویر
          </button>
        )}
      </div>

      <section className="space-y-5 rounded-2xl border border-ivory-300 p-5">
        <h3 className="text-base font-medium">ظاهر کادر محصول در فروشگاه</h3>
        <CardStyleEditor
          value={draft.style}
          onChange={(next) => update('style', next)}
          previewImages={draft.images}
          disabled={disabled}
        />
      </section>

      <section className="rounded-2xl border border-ivory-300 p-5">
        <VariantsEditor variants={draft.variants} onChange={(next) => update('variants', next)} disabled={disabled} />
      </section>

      <section className="space-y-4 rounded-2xl border border-ivory-300 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-base font-medium">
            <Zap className="h-5 w-5 text-gold-500" aria-hidden="true" />
            پیشنهاد شگفت‌انگیز
          </h3>
          <Toggle label="فعال" checked={draft.isAmazingOffer} disabled={disabled} onChange={(v) => update('isAmazingOffer', v)} />
        </div>
        {draft.isAmazingOffer && (
          <div className="space-y-3">
            <FormField id="p-offer-end" label="پایان پیشنهاد" hint="بر اساس ساعت دستگاه شما ثبت می‌شود. پس از این زمان، شمارنده از کارت محصول حذف می‌شود.">
              <input
                id="p-offer-end"
                type="datetime-local"
                dir="ltr"
                value={draft.offerEndsLocal}
                disabled={disabled}
                onChange={(e) => update('offerEndsLocal', e.target.value)}
                className="field max-w-xs text-start"
              />
            </FormField>
            <div className="flex flex-wrap gap-2">
              {OFFER_SHORTCUTS.map((shortcut) => (
                <button
                  key={shortcut.hours}
                  type="button"
                  disabled={disabled}
                  onClick={() => update('offerEndsLocal', toLocalInput(new Date(Date.now() + shortcut.hours * 3600 * 1000)))}
                  className="btn-outline h-9 px-4 text-xs"
                >
                  {shortcut.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="flex flex-wrap gap-6">
        <Toggle label="پرفروش" checked={draft.isBestseller} disabled={disabled} onChange={(v) => update('isBestseller', v)} />
        <Toggle label="جدید" checked={draft.isNew} disabled={disabled} onChange={(v) => update('isNew', v)} />
        <Toggle label="نمایش در فروشگاه" checked={draft.isActive} disabled={disabled} onChange={(v) => update('isActive', v)} />
      </div>

      <FormStatus status={status} />

      <div className="flex flex-wrap gap-3">
        {canEdit && (
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'در حال ذخیره...' : 'ذخیره محصول'}
          </button>
        )}
        <button type="button" onClick={onCancel} disabled={saving} className="btn-outline">
          انصراف
        </button>
      </div>
    </form>
  );
}

function Toggle({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className={`flex items-center gap-3 text-sm text-ink-900 ${disabled ? 'opacity-60' : 'cursor-pointer'}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 accent-burgundy-700" />
      {label}
    </label>
  );
}

function toDraft(initial: ProductInput | null, categories: AdminCategory[]): ProductDraft {
  return {
    name: initial?.name ?? '',
    slug: initial?.slug ?? '',
    brand: initial?.brand ?? '',
    categoryId: initial?.categoryId ?? categories[0]?.id ?? '',
    shortDescription: initial?.shortDescription ?? '',
    description: initial?.description ?? '',
    ingredients: initial?.ingredients ?? '',
    usageInstructions: initial?.usageInstructions ?? '',
    price: initial ? String(initial.priceToman) : '',
    compareAt: initial?.compareAtToman != null ? String(initial.compareAtToman) : '',
    costPrice: initial ? String(initial.costPriceToman) : '0',
    stock: initial ? String(initial.stock) : '0',
    images: initial?.images ?? [],
    isBestseller: initial?.isBestseller ?? false,
    isNew: initial?.isNew ?? true,
    isActive: initial?.isActive ?? true,
    style: initial
      ? {
          cardBgType: initial.cardBgType,
          cardBgValue: initial.cardBgValue || DEFAULT_CARD_STYLE.cardBgValue,
          imageFit: initial.imageFit,
          imageScale: initial.imageScale,
          imageAngle: initial.imageAngle,
          animationType: initial.animationType ?? '',
        }
      : DEFAULT_CARD_STYLE,
    variants: (initial?.variants ?? []).map((item) => ({
      id: item.id,
      kind: item.kind,
      label: item.label,
      colorHex: item.colorHex,
      priceDelta: String(item.priceDelta),
    })),
    isAmazingOffer: initial?.isAmazingOffer ?? false,
    offerEndsLocal: isoToLocalInput(initial?.offerEndsAt ?? null),
  };
}
