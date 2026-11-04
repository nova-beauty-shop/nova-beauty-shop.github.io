import { Palette, Plus, Ruler, Trash2 } from 'lucide-react';
import { MAX_VARIANTS } from '@/lib/adminCatalog';
import { DEFAULT_CARD_BG, isHexColor } from '@/lib/productStyle';
import type { VariantKind } from '@/types/catalog';

export interface VariantDraft {
  id: string;
  kind: VariantKind;
  label: string;
  colorHex: string;
  priceDelta: string;
}

export function newVariantDraft(kind: VariantKind): VariantDraft {
  return {
    id: `v-${crypto.randomUUID().slice(0, 8)}`,
    kind,
    label: '',
    colorHex: kind === 'color' ? '#C08A8D' : '',
    priceDelta: '0',
  };
}

export default function VariantsEditor({
  variants,
  onChange,
  disabled,
}: {
  variants: VariantDraft[];
  onChange: (next: VariantDraft[]) => void;
  disabled: boolean;
}) {
  function update(id: string, partial: Partial<VariantDraft>) {
    onChange(variants.map((item) => (item.id === id ? { ...item, ...partial } : item)));
  }

  function changeKind(item: VariantDraft, kind: VariantKind) {
    update(item.id, { kind, colorHex: kind === 'color' ? item.colorHex || '#C08A8D' : '' });
  }

  const full = variants.length >= MAX_VARIANTS;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-medium text-ink-900">تنوع رنگ و حجم (اختیاری)</p>
        <p className="text-xs leading-[1.7] text-ink-500">
          مشتری در صفحه محصول فقط یک گزینه را انتخاب می‌کند. «افزایش قیمت» به قیمت پایه محصول اضافه می‌شود (برای گزینه بدون اختلاف قیمت صفر بگذارید).
        </p>
      </div>

      {variants.length === 0 && (
        <p className="rounded-2xl border border-dashed border-ivory-300 px-4 py-5 text-center text-sm text-ink-500">
          این محصول گزینه‌ای ندارد.
        </p>
      )}

      <ul className="space-y-3">
        {variants.map((item, index) => {
          const hexValid = isHexColor(item.colorHex);
          return (
            <li key={item.id} className="grid gap-3 rounded-2xl bg-ivory-200/60 p-4 sm:grid-cols-[9rem_minmax(0,1fr)_minmax(0,11rem)_auto] sm:items-end">
              <div className="space-y-2">
                <label htmlFor={`v-kind-${item.id}`} className="block text-xs font-medium text-ink-700">نوع گزینه</label>
                <select
                  id={`v-kind-${item.id}`}
                  value={item.kind}
                  disabled={disabled}
                  onChange={(event) => changeKind(item, event.target.value === 'color' ? 'color' : 'size')}
                  className="field"
                >
                  <option value="color">رنگ</option>
                  <option value="size">حجم / اندازه</option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor={`v-label-${item.id}`} className="block text-xs font-medium text-ink-700">
                  {item.kind === 'color' ? 'نام رنگ' : 'حجم یا اندازه'}
                </label>
                <div className="flex items-center gap-2">
                  {item.kind === 'color' && (
                    <input
                      type="color"
                      aria-label={`رنگ گزینه ${(index + 1).toLocaleString('fa-IR')}`}
                      value={hexValid ? item.colorHex : DEFAULT_CARD_BG}
                      disabled={disabled}
                      onChange={(event) => update(item.id, { colorHex: event.target.value.toUpperCase() })}
                      className="h-11 w-12 shrink-0 cursor-pointer rounded-xl border border-ink-300 bg-ivory-50 p-1"
                    />
                  )}
                  <input
                    id={`v-label-${item.id}`}
                    value={item.label}
                    disabled={disabled}
                    maxLength={40}
                    placeholder={item.kind === 'color' ? 'مثلاً رزگلد' : 'مثلاً ۵۰ میلی‌لیتر'}
                    onChange={(event) => update(item.id, { label: event.target.value })}
                    className="field"
                  />
                </div>
                {item.kind === 'color' && !hexValid && <p className="text-xs text-error-600">رنگ معتبر انتخاب کنید.</p>}
              </div>

              <div className="space-y-2">
                <label htmlFor={`v-delta-${item.id}`} className="block text-xs font-medium text-ink-700">افزایش قیمت (تومان)</label>
                <input
                  id={`v-delta-${item.id}`}
                  inputMode="numeric"
                  value={item.priceDelta}
                  disabled={disabled}
                  onChange={(event) => update(item.id, { priceDelta: event.target.value })}
                  className="field"
                />
              </div>

              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(variants.filter((entry) => entry.id !== item.id))}
                aria-label={`حذف گزینه ${(index + 1).toLocaleString('fa-IR')}`}
                className="btn-outline h-11 px-3 text-error-600"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={disabled || full} onClick={() => onChange([...variants, newVariantDraft('color')])} className="btn-outline h-10 px-4 text-sm">
          <Palette className="h-4 w-4" aria-hidden="true" />
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          افزودن رنگ
        </button>
        <button type="button" disabled={disabled || full} onClick={() => onChange([...variants, newVariantDraft('size')])} className="btn-outline h-10 px-4 text-sm">
          <Ruler className="h-4 w-4" aria-hidden="true" />
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          افزودن حجم / اندازه
        </button>
        {full && <p className="self-center text-xs text-ink-500">حداکثر {MAX_VARIANTS.toLocaleString('fa-IR')} گزینه مجاز است.</p>}
      </div>
    </div>
  );
}
