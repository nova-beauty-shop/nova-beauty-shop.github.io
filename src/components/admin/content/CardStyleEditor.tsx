import { RotateCcw } from 'lucide-react';
import ImageField from '@/components/admin/content/ImageField';
import ProductCardMedia from '@/components/product/ProductCardMedia';
import {
  ANIMATION_OPTIONS,
  CARD_BG_PRESETS,
  DEFAULT_CARD_BG,
  IMAGE_ANGLE_RANGE,
  IMAGE_SCALE_RANGE,
  isHexColor,
  parseAnimationType,
} from '@/lib/productStyle';
import type { AnimationType, CardBgType, ImageFit } from '@/types/catalog';

export interface CardStyleDraft {
  cardBgType: CardBgType;
  cardBgValue: string;
  imageFit: ImageFit;
  imageScale: number;
  imageAngle: number;
  animationType: AnimationType | '';
}

export const DEFAULT_CARD_STYLE: CardStyleDraft = {
  cardBgType: 'color',
  cardBgValue: DEFAULT_CARD_BG,
  imageFit: 'cover',
  imageScale: 100,
  imageAngle: 0,
  animationType: '',
};

const BG_TYPES: { value: CardBgType; label: string }[] = [
  { value: 'color', label: 'رنگ ساده' },
  { value: 'preset', label: 'تم گرادینت' },
  { value: 'image', label: 'تصویر' },
];

const FITS: { value: ImageFit; label: string; hint: string }[] = [
  { value: 'cover', label: 'پر کردن کادر', hint: 'تصویر کل کادر را می‌پوشاند (ممکن است لبه‌ها بریده شود).' },
  { value: 'contain', label: 'نمایش کامل محصول', hint: 'کل محصول دیده می‌شود؛ برای PNG بدون پس‌زمینه ایده‌آل است.' },
];

const COLOR_SUGGESTIONS = ['#F3ECE0', '#F9EBE9', '#EFE3D0', '#E6DFDC', '#DCEFF2', '#E4EBDD', '#EADFF3', '#FFFFFF'];

export default function CardStyleEditor({
  value,
  onChange,
  previewImages,
  disabled,
}: {
  value: CardStyleDraft;
  onChange: (next: CardStyleDraft) => void;
  previewImages: string[];
  disabled: boolean;
}) {
  function patch(partial: Partial<CardStyleDraft>) {
    onChange({ ...value, ...partial });
  }

  function chooseType(type: CardBgType) {
    if (type === value.cardBgType) return;
    const fallback: Record<CardBgType, string> = {
      color: DEFAULT_CARD_BG,
      preset: CARD_BG_PRESETS[0].key,
      image: '',
    };
    patch({ cardBgType: type, cardBgValue: fallback[type] });
  }

  const hexValid = isHexColor(value.cardBgValue);
  const fit = FITS.find((item) => item.value === value.imageFit) ?? FITS[0];
  const previewCover = previewImages.find((url) => url.trim() !== '');

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_220px]">
      <div className="space-y-6">
        <fieldset className="space-y-3" disabled={disabled}>
          <legend className="text-sm font-medium text-ink-900">پس‌زمینه کادر محصول</legend>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="نوع پس‌زمینه">
            {BG_TYPES.map((item) => (
              <button
                key={item.value}
                type="button"
                role="radio"
                aria-checked={value.cardBgType === item.value}
                onClick={() => chooseType(item.value)}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  value.cardBgType === item.value
                    ? 'border-burgundy-700 bg-burgundy-700 text-ivory-50'
                    : 'border-ink-300 text-ink-700 hover:border-burgundy-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {value.cardBgType === 'color' && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  aria-label="انتخاب رنگ پس‌زمینه"
                  value={hexValid ? value.cardBgValue : DEFAULT_CARD_BG}
                  onChange={(event) => patch({ cardBgValue: event.target.value.toUpperCase() })}
                  className="h-11 w-14 cursor-pointer rounded-xl border border-ink-300 bg-ivory-50 p-1"
                />
                <input
                  dir="ltr"
                  aria-label="کد رنگ"
                  placeholder="#F3ECE0"
                  value={value.cardBgValue}
                  onChange={(event) => patch({ cardBgValue: event.target.value.trim() })}
                  className="field max-w-[10rem] text-start"
                />
              </div>
              {!hexValid && <p className="text-xs text-error-600">کد رنگ باید به شکل #RRGGBB باشد.</p>}
              <div className="flex flex-wrap gap-2" aria-label="رنگ‌های پیشنهادی">
                {COLOR_SUGGESTIONS.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    aria-label={`رنگ ${hex}`}
                    onClick={() => patch({ cardBgValue: hex })}
                    style={{ backgroundColor: hex }}
                    className={`h-8 w-8 rounded-full border transition hover:scale-110 ${
                      value.cardBgValue.toUpperCase() === hex ? 'border-burgundy-700 ring-2 ring-burgundy-700/30' : 'border-ink-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {value.cardBgType === 'preset' && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {CARD_BG_PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  aria-pressed={value.cardBgValue === preset.key}
                  onClick={() => patch({ cardBgValue: preset.key })}
                  className={`overflow-hidden rounded-2xl border text-start transition ${
                    value.cardBgValue === preset.key ? 'border-burgundy-700 ring-2 ring-burgundy-700/25' : 'border-ivory-300 hover:border-burgundy-700'
                  }`}
                >
                  <span className={`block h-14 w-full card-bg-${preset.key}`} />
                  <span className="block px-3 py-2 text-xs text-ink-700">{preset.label}</span>
                </button>
              ))}
            </div>
          )}

          {value.cardBgType === 'image' && (
            <ImageField id="p-card-bg-image" value={value.cardBgValue} disabled={disabled} onChange={(url) => patch({ cardBgValue: url })} />
          )}
        </fieldset>

        <fieldset className="space-y-3" disabled={disabled}>
          <legend className="text-sm font-medium text-ink-900">نمایش عکس محصول</legend>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="نحوه قرارگیری عکس">
            {FITS.map((item) => (
              <button
                key={item.value}
                type="button"
                role="radio"
                aria-checked={value.imageFit === item.value}
                onClick={() => patch({ imageFit: item.value })}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  value.imageFit === item.value
                    ? 'border-burgundy-700 bg-burgundy-700 text-ivory-50'
                    : 'border-ink-300 text-ink-700 hover:border-burgundy-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <p className="text-xs leading-[1.7] text-ink-500">{fit.hint}</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="p-img-scale" className="flex items-center justify-between text-sm text-ink-900">
                <span>بزرگ‌نمایی عکس</span>
                <span className="tabular-nums text-ink-500">{`${value.imageScale.toLocaleString('fa-IR')}٪`}</span>
              </label>
              <input
                id="p-img-scale"
                type="range"
                min={IMAGE_SCALE_RANGE.min}
                max={IMAGE_SCALE_RANGE.max}
                step={5}
                value={value.imageScale}
                onChange={(event) => patch({ imageScale: Number(event.target.value) })}
                className="w-full accent-burgundy-700"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="p-img-angle" className="flex items-center justify-between text-sm text-ink-900">
                <span>زاویه چرخش</span>
                <span className="tabular-nums text-ink-500" dir="ltr">{`${value.imageAngle.toLocaleString('fa-IR')}°`}</span>
              </label>
              <input
                id="p-img-angle"
                type="range"
                min={IMAGE_ANGLE_RANGE.min}
                max={IMAGE_ANGLE_RANGE.max}
                step={1}
                value={value.imageAngle}
                onChange={(event) => patch({ imageAngle: Number(event.target.value) })}
                className="w-full accent-burgundy-700"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => patch({ imageScale: 100, imageAngle: 0 })}
            className="inline-flex items-center gap-2 text-sm text-burgundy-700 underline-offset-4 hover:underline"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            بازنشانی اندازه و زاویه
          </button>
        </fieldset>

        <div className="space-y-2">
          <label htmlFor="p-animation" className="block text-sm font-medium text-ink-900">
            انیمیشن عکس
          </label>
          <select
            id="p-animation"
            value={value.animationType}
            disabled={disabled}
            onChange={(event) => patch({ animationType: parseAnimationType(event.target.value) ?? '' })}
            className="field"
          >
            {ANIMATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2 lg:sticky lg:top-24 lg:self-start">
        <p className="text-sm font-medium text-ink-900">پیش‌نمایش زنده</p>
        <div className="group relative aspect-[3/4] w-full max-w-[220px] overflow-hidden rounded-2xl shadow-soft">
          <ProductCardMedia
            cover={previewCover}
            alt="پیش‌نمایش کادر محصول"
            interactive={false}
            style={{
              cardBgType: value.cardBgType,
              cardBgValue: value.cardBgValue || null,
              imageFit: value.imageFit,
              imageScale: value.imageScale,
              imageAngle: value.imageAngle,
              animationType: value.animationType === '' ? null : value.animationType,
            }}
          />
          {!previewCover && (
            <p className="absolute inset-0 flex items-center justify-center px-4 text-center text-xs text-ink-500">
              برای دیدن پیش‌نمایش، یک تصویر محصول اضافه کنید.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
