import type { CSSProperties } from 'react';
import type { AnimationType, CardBgType, ImageFit, Product, ProductVariant, VariantKind } from '@/types/catalog';

export const CARD_BG_PRESETS = [
  { key: 'oceanus-breeze', label: 'نسیم اقیانوس' },
  { key: 'rose-silk', label: 'ابریشم رز' },
  { key: 'warm-amber', label: 'کهربای گرم' },
  { key: 'velvet-iris', label: 'زنبق مخملی' },
  { key: 'botanical-sage', label: 'مریم‌گلی گیاهی' },
  { key: 'coral-sunset', label: 'غروب مرجانی' },
] as const;

export const ANIMATION_OPTIONS: { value: AnimationType | ''; label: string }[] = [
  { value: '', label: 'بدون انیمیشن' },
  { value: 'float', label: 'شناور (Float)' },
  { value: 'zoom', label: 'زوم نرم (Zoom)' },
  { value: 'rotate3d', label: 'چرخش سه‌بعدی (3D)' },
  { value: 'pulse-glow', label: 'درخشش ضربانی (Glow)' },
];

export const DEFAULT_CARD_BG = '#F3ECE0';
export const IMAGE_SCALE_RANGE = { min: 50, max: 150 } as const;
export const IMAGE_ANGLE_RANGE = { min: -45, max: 45 } as const;

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;
const PRESET_KEYS: string[] = CARD_BG_PRESETS.map((preset) => preset.key);
const ANIMATION_CLASSES: Record<AnimationType, string> = {
  float: 'anim-float',
  zoom: 'anim-zoom',
  rotate3d: 'anim-rotate3d',
  'pulse-glow': 'anim-pulse-glow',
};

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_PATTERN.test(value);
}

export function isPresetKey(value: unknown): value is (typeof CARD_BG_PRESETS)[number]['key'] {
  return typeof value === 'string' && PRESET_KEYS.includes(value);
}

export function isHttpsUrl(value: unknown): value is string {
  return typeof value === 'string' && /^https:\/\/[^\s"'()]+$/i.test(value) && value.length <= 500;
}

export function parseCardBgType(value: unknown): CardBgType {
  return value === 'preset' || value === 'image' ? value : 'color';
}

export function parseImageFit(value: unknown): ImageFit {
  return value === 'contain' ? 'contain' : 'cover';
}

export function parseAnimationType(value: unknown): AnimationType | null {
  return value === 'float' || value === 'zoom' || value === 'rotate3d' || value === 'pulse-glow' ? value : null;
}

export function parseVariantKind(value: unknown): VariantKind {
  return value === 'color' ? 'color' : 'size';
}

export function clampNumber(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function animationClass(type: AnimationType | null): string {
  return type ? ANIMATION_CLASSES[type] : '';
}

export interface CardBackground {
  className: string;
  style: CSSProperties;
}

/**
 * Turns the stored background settings into a CSS class and inline style. Every stored value is
 * validated here, so a malformed row can never inject arbitrary CSS.
 */
export function cardBackground(type: CardBgType, value: string | null): CardBackground {
  if (type === 'preset' && isPresetKey(value)) return { className: `card-bg-${value}`, style: {} };
  if (type === 'image' && isHttpsUrl(value)) {
    return {
      className: 'bg-cover bg-center',
      style: { backgroundImage: `url("${value}")` },
    };
  }
  if (type === 'color' && isHexColor(value)) return { className: '', style: { backgroundColor: value } };
  return { className: '', style: { backgroundColor: DEFAULT_CARD_BG } };
}

export function productCardBackground(product: Pick<Product, 'cardBgType' | 'cardBgValue'>): CardBackground {
  return cardBackground(product.cardBgType, product.cardBgValue);
}

export function imageTransform(scale: number, angle: number): string | undefined {
  if (scale === 100 && angle === 0) return undefined;
  return `scale(${scale / 100}) rotate(${angle}deg)`;
}

export function groupVariants(variants: ProductVariant[]): { colors: ProductVariant[]; sizes: ProductVariant[] } {
  return {
    colors: variants.filter((item) => item.kind === 'color'),
    sizes: variants.filter((item) => item.kind !== 'color'),
  };
}

/** Readable text colour (dark or light) for a swatch of the given hex colour. */
export function contrastingInk(hex: string): string {
  if (!isHexColor(hex)) return '#231C1E';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#231C1E' : '#FDFBF7';
}
