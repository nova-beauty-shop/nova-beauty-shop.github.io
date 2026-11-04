import { PRODUCT_COLUMNS, mapProduct, parseVariants, type ProductRow } from '@/lib/catalog';
import {
  IMAGE_ANGLE_RANGE,
  IMAGE_SCALE_RANGE,
  isHexColor,
  isHttpsUrl,
  isPresetKey,
  parseAnimationType,
  parseCardBgType,
  parseImageFit,
} from '@/lib/productStyle';
import { supabase } from '@/lib/supabase';
import type { AnimationType, CardBgType, ImageFit, Product, VariantKind } from '@/types/catalog';

export const CATALOG_BUCKET = 'catalog-media';
export const CATALOG_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const CATALOG_IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export class CatalogError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

const CATALOG_ERROR_MESSAGES: Record<string, string> = {
  invalid_name: 'نام باید بین ۲ تا ۱۲۰ نویسه باشد.',
  invalid_slug: 'آدرس یکتا فقط می‌تواند شامل حروف انگلیسی کوچک، رقم و خط تیره باشد.',
  invalid_price: 'قیمت باید عددی صحیح و بزرگ‌تر یا مساوی صفر باشد.',
  invalid_stock: 'موجودی باید عددی صحیح و بزرگ‌تر یا مساوی صفر باشد.',
  invalid_cost: 'قیمت تمام‌شده باید عددی صحیح و بزرگ‌تر یا مساوی صفر باشد.',
  invalid_image: 'آدرس تصویر باید با https شروع شود.',
  invalid_text: 'یکی از متن‌ها بیش از حد طولانی است.',
  invalid_file: 'فقط تصویر JPG، PNG یا WebP تا ۵ مگابایت مجاز است.',
  invalid_sort: 'ترتیب نمایش باید عددی صحیح و مثبت باشد.',
  invalid_rating: 'امتیاز باید عددی بین ۱ تا ۵ باشد.',
  invalid_placement: 'محل نمایش بنر معتبر نیست.',
  slug_taken: 'این آدرس یکتا قبلاً استفاده شده است.',
  has_products: 'این دسته‌بندی محصول دارد. ابتدا محصولات آن را جابه‌جا کنید.',
  invalid_media: 'نوع رسانه معتبر نیست.',
  invalid_variant: 'گزینه‌های رنگ و حجم معتبر نیستند. نام هر گزینه الزامی است و نام‌ها نباید تکراری باشند.',
  invalid_color: 'رنگ باید به‌صورت کد هگزادسیمال مثل #C08A8D وارد شود.',
  invalid_card_bg: 'پس‌زمینه کادر محصول معتبر نیست. رنگ، تم یا آدرس https تصویر را بررسی کنید.',
  invalid_image_style: 'مقدار بزرگ‌نمایی یا زاویه تصویر خارج از بازه مجاز است.',
  invalid_animation: 'نوع انیمیشن معتبر نیست.',
  invalid_offer: 'برای پیشنهاد شگفت‌انگیز، تاریخ و ساعت پایان معتبر را وارد کنید.',
};

export function catalogErrorMessage(error: unknown): string {
  if (error instanceof CatalogError) return CATALOG_ERROR_MESSAGES[error.code] ?? 'ذخیره انجام نشد. لطفاً دوباره تلاش کنید.';
  return 'ذخیره انجام نشد. لطفاً دوباره تلاش کنید.';
}

export interface VariantInput {
  id: string;
  kind: VariantKind;
  label: string;
  /** Hex colour for colour options, empty string for size options. */
  colorHex: string;
  priceDelta: number;
}

export const MAX_VARIANTS = 12;

export interface ProductInput {
  id?: string;
  name: string;
  slug: string;
  brand: string;
  categoryId: string;
  shortDescription: string;
  description: string;
  ingredients: string;
  usageInstructions: string;
  priceToman: number;
  compareAtToman: number | null;
  costPriceToman: number;
  stock: number;
  images: string[];
  isBestseller: boolean;
  isNew: boolean;
  isActive: boolean;
  variants: VariantInput[];
  cardBgType: CardBgType;
  /** Hex colour, preset key or https image address, depending on `cardBgType`. */
  cardBgValue: string;
  imageFit: ImageFit;
  imageScale: number;
  imageAngle: number;
  animationType: AnimationType | null;
  isAmazingOffer: boolean;
  /** ISO timestamp, only used while `isAmazingOffer` is on. */
  offerEndsAt: string | null;
}

export interface CategoryInput {
  id?: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  sortOrder: number;
  isActive: boolean;
}

export interface BannerInput {
  id?: string;
  title: string;
  placement: 'hero' | 'promo';
  eyebrow: string;
  subtitle: string;
  ctaLabel: string;
  ctaUrl: string;
  imageUrl: string;
  sortOrder: number;
  isActive: boolean;
}

export interface AdminReview {
  id: string;
  productId: string;
  productName: string;
  authorName: string;
  rating: number;
  body: string;
  isPublished: boolean;
  createdAt: string;
}

export interface StoryInput {
  id?: string;
  title: string;
  mediaType: 'image' | 'video';
  mediaUrl: string;
  linkUrl: string;
  sortOrder: number;
  isActive: boolean;
}

export interface AdminStory extends StoryInput {
  id: string;
}

export interface AdminBanner extends BannerInput {
  id: string;
}

export interface AdminCategory extends CategoryInput {
  id: string;
}

type Row = Record<string, unknown>;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_IMAGES = 8;

function requireText(value: string, min: number, max: number, code: string): string {
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) throw new CatalogError(code);
  return trimmed;
}

function optionalText(value: string, max: number): string {
  const trimmed = value.trim();
  if (trimmed.length > max) throw new CatalogError('invalid_text');
  return trimmed;
}

function requireInt(value: number, min: number, max: number, code: string): number {
  if (!Number.isInteger(value) || value < min || value > max) throw new CatalogError(code);
  return value;
}

function validateHttpsUrl(value: string, required = false): string {
  const trimmed = value.trim();
  if (trimmed === '' && !required) return '';
  if (!/^https:\/\/[^\s]+$/i.test(trimmed) || trimmed.length > 500) throw new CatalogError('invalid_image');
  return trimmed;
}

function validateSlug(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (trimmed.length < 2 || trimmed.length > 80 || !SLUG_PATTERN.test(trimmed)) throw new CatalogError('invalid_slug');
  return trimmed;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function mapWriteError(error: { message: string; code?: string }): CatalogError {
  if (error.code === '23505') return new CatalogError('slug_taken');
  if (error.code === '23503') return new CatalogError('has_products');
  return new CatalogError('save_failed');
}

export type AdminProduct = Product & { isActive: boolean };

export async function fetchAdminProducts(): Promise<AdminProduct[]> {
  const { data, error } = await supabase
    .from('products')
    .select(`${PRODUCT_COLUMNS}, is_active`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error('unexpected products response');
  return data.map((raw) => {
    const row = raw as unknown as ProductRow & { is_active: boolean };
    return { ...mapProduct(row), isActive: row.is_active === true };
  });
}

export async function fetchAdminProductDetail(id: string): Promise<{ input: ProductInput } | null> {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, slug, brand, category_id, short_description, description, ingredients, usage_instructions, price_toman, compare_at_toman, stock, images, variants, is_bestseller, is_new, is_active, card_bg_type, card_bg_value, image_fit, image_scale, image_angle, animation_type, is_amazing_offer, offer_ends_at')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as Row;
  const { data: costRow, error: costError } = await supabase
    .from('product_costs')
    .select('cost_price_toman')
    .eq('product_id', id)
    .maybeSingle();
  if (costError) throw costError;
  return {
    input: {
      id,
      name: asString(row.name),
      slug: asString(row.slug),
      brand: asString(row.brand),
      categoryId: asString(row.category_id),
      shortDescription: asString(row.short_description),
      description: asString(row.description),
      ingredients: asString(row.ingredients),
      usageInstructions: asString(row.usage_instructions),
      priceToman: Number(row.price_toman),
      compareAtToman: row.compare_at_toman === null ? null : Number(row.compare_at_toman),
      costPriceToman: costRow ? Number(costRow.cost_price_toman) : 0,
      stock: Number(row.stock),
      images: Array.isArray(row.images) ? row.images.filter((item): item is string => typeof item === 'string') : [],
      isBestseller: row.is_bestseller === true,
      isNew: row.is_new === true,
      isActive: row.is_active === true,
      variants: parseVariants(row.variants).map((variant) => ({
        id: variant.id,
        kind: variant.kind,
        label: variant.label,
        colorHex: variant.colorHex ?? '',
        priceDelta: variant.priceDelta,
      })),
      cardBgType: parseCardBgType(row.card_bg_type),
      cardBgValue: typeof row.card_bg_value === 'string' ? row.card_bg_value : '',
      imageFit: parseImageFit(row.image_fit),
      imageScale: Number(row.image_scale ?? 100),
      imageAngle: Number(row.image_angle ?? 0),
      animationType: parseAnimationType(row.animation_type),
      isAmazingOffer: row.is_amazing_offer === true,
      offerEndsAt: typeof row.offer_ends_at === 'string' ? row.offer_ends_at : null,
    },
  };
}

const VARIANT_ID_PATTERN = /^[A-Za-z0-9_-]{1,40}$/;

export function validateVariants(variants: VariantInput[]): Record<string, unknown>[] {
  if (variants.length > MAX_VARIANTS) throw new CatalogError('invalid_variant');
  const seenIds = new Set<string>();
  const seenLabels = new Set<string>();
  return variants.map((variant) => {
    const label = variant.label.trim();
    const labelKey = `${variant.kind}:${label.toLowerCase()}`;
    if (!VARIANT_ID_PATTERN.test(variant.id) || seenIds.has(variant.id)) throw new CatalogError('invalid_variant');
    if (label.length < 1 || label.length > 40 || seenLabels.has(labelKey)) throw new CatalogError('invalid_variant');
    if (variant.kind !== 'color' && variant.kind !== 'size') throw new CatalogError('invalid_variant');
    seenIds.add(variant.id);
    seenLabels.add(labelKey);
    const entry: Record<string, unknown> = {
      id: variant.id,
      label,
      price_delta: requireInt(variant.priceDelta, 0, 1_000_000_000, 'invalid_price'),
      kind: variant.kind,
    };
    if (variant.kind === 'color') {
      if (!isHexColor(variant.colorHex)) throw new CatalogError('invalid_color');
      entry.color_hex = variant.colorHex.toUpperCase();
    }
    return entry;
  });
}

export function validateCardBackground(type: CardBgType, value: string): string {
  if (type === 'color') {
    if (!isHexColor(value)) throw new CatalogError('invalid_color');
    return value.toUpperCase();
  }
  if (type === 'preset') {
    if (!isPresetKey(value)) throw new CatalogError('invalid_card_bg');
    return value;
  }
  if (!isHttpsUrl(value)) throw new CatalogError('invalid_card_bg');
  return value;
}


export async function saveProduct(input: ProductInput): Promise<void> {
  const costPrice = requireInt(input.costPriceToman, 0, 1_000_000_000, 'invalid_cost');
  if (input.animationType !== null && parseAnimationType(input.animationType) === null) {
    throw new CatalogError('invalid_animation');
  }
  let offerEndsAt: string | null = null;
  if (input.isAmazingOffer) {
    const parsed = input.offerEndsAt ? new Date(input.offerEndsAt) : null;
    if (!parsed || Number.isNaN(parsed.getTime())) throw new CatalogError('invalid_offer');
    offerEndsAt = parsed.toISOString();
  }
  const payload = {
    name: requireText(input.name, 2, 120, 'invalid_name'),
    slug: validateSlug(input.slug),
    brand: optionalText(input.brand, 80),
    category_id: input.categoryId,
    short_description: optionalText(input.shortDescription, 300),
    description: optionalText(input.description, 5000),
    ingredients: optionalText(input.ingredients, 3000),
    usage_instructions: optionalText(input.usageInstructions, 3000),
    price_toman: requireInt(input.priceToman, 0, 1_000_000_000, 'invalid_price'),
    compare_at_toman:
      input.compareAtToman === null ? null : requireInt(input.compareAtToman, 0, 1_000_000_000, 'invalid_price'),
    stock: requireInt(input.stock, 0, 1_000_000, 'invalid_stock'),
    images: input.images.map((url) => validateHttpsUrl(url)).filter((url) => url !== '').slice(0, MAX_IMAGES),
    is_bestseller: input.isBestseller,
    is_new: input.isNew,
    is_active: input.isActive,
    variants: validateVariants(input.variants),
    card_bg_type: input.cardBgType,
    card_bg_value: validateCardBackground(input.cardBgType, input.cardBgValue),
    image_fit: parseImageFit(input.imageFit),
    image_scale: requireInt(input.imageScale, IMAGE_SCALE_RANGE.min, IMAGE_SCALE_RANGE.max, 'invalid_image_style'),
    image_angle: requireInt(input.imageAngle, IMAGE_ANGLE_RANGE.min, IMAGE_ANGLE_RANGE.max, 'invalid_image_style'),
    animation_type: input.animationType,
    is_amazing_offer: input.isAmazingOffer,
    offer_ends_at: offerEndsAt,
  };
  let productId = input.id;
  if (input.id) {
    const { error } = await supabase.from('products').update(payload).eq('id', input.id);
    if (error) throw mapWriteError(error);
  } else {
    const { data, error } = await supabase.from('products').insert(payload).select('id').single();
    if (error) throw mapWriteError(error);
    productId = data.id;
  }

  const { error: costError } = await supabase.from('product_costs').upsert({
    product_id: productId,
    cost_price_toman: costPrice,
    updated_at: new Date().toISOString(),
  });
  if (costError) throw mapWriteError(costError);
}

export async function setProductActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from('products').update({ is_active: isActive }).eq('id', id);
  if (error) throw mapWriteError(error);
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw mapWriteError(error);
}

export async function fetchAdminCategories(): Promise<AdminCategory[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, slug, name, description, image_url, sort_order, is_active')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error('unexpected categories response');
  return data.map((raw) => {
    const row = raw as Row;
    return {
      id: asString(row.id),
      slug: asString(row.slug),
      name: asString(row.name),
      description: asString(row.description),
      imageUrl: asString(row.image_url),
      sortOrder: Number(row.sort_order),
      isActive: row.is_active === true,
    };
  });
}

export async function saveCategory(input: CategoryInput): Promise<void> {
  const payload = {
    name: requireText(input.name, 2, 80, 'invalid_name'),
    slug: validateSlug(input.slug),
    description: optionalText(input.description, 500),
    image_url: validateHttpsUrl(input.imageUrl),
    sort_order: requireInt(input.sortOrder, 0, 10_000, 'invalid_sort'),
    is_active: input.isActive,
  };
  const request = input.id
    ? supabase.from('categories').update(payload).eq('id', input.id)
    : supabase.from('categories').insert(payload);
  const { error } = await request;
  if (error) throw mapWriteError(error);
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw mapWriteError(error);
}

export async function fetchAdminBanners(): Promise<AdminBanner[]> {
  const { data, error } = await supabase
    .from('banners')
    .select('id, title, placement, eyebrow, subtitle, cta_label, cta_url, image_url, sort_order, is_active')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error('unexpected banners response');
  return data.map((raw) => {
    const row = raw as Row;
    return {
      id: asString(row.id),
      title: asString(row.title),
      placement: row.placement === 'hero' ? 'hero' : 'promo',
      eyebrow: asString(row.eyebrow),
      subtitle: asString(row.subtitle),
      ctaLabel: asString(row.cta_label),
      ctaUrl: asString(row.cta_url),
      imageUrl: asString(row.image_url),
      sortOrder: Number(row.sort_order),
      isActive: row.is_active === true,
    };
  });
}

export async function saveBanner(input: BannerInput): Promise<void> {
  if (input.placement !== 'hero' && input.placement !== 'promo') throw new CatalogError('invalid_placement');
  const payload = {
    title: requireText(input.title, 2, 120, 'invalid_name'),
    placement: input.placement,
    eyebrow: optionalText(input.eyebrow, 80),
    subtitle: optionalText(input.subtitle, 300),
    cta_label: optionalText(input.ctaLabel, 40),
    cta_url: optionalText(input.ctaUrl, 300),
    image_url: validateHttpsUrl(input.imageUrl),
    sort_order: requireInt(input.sortOrder, 0, 10_000, 'invalid_sort'),
    is_active: input.isActive,
  };
  const request = input.id
    ? supabase.from('banners').update(payload).eq('id', input.id)
    : supabase.from('banners').insert(payload);
  const { error } = await request;
  if (error) throw mapWriteError(error);
}

export async function setBannerActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from('banners').update({ is_active: isActive }).eq('id', id);
  if (error) throw mapWriteError(error);
}

/** Rewrites `sort_order` so the given banner ids appear in exactly this order (10, 20, 30...). */
export async function reorderBanners(orderedIds: string[]): Promise<void> {
  const results = await Promise.all(
    orderedIds.map((id, index) => supabase.from('banners').update({ sort_order: (index + 1) * 10 }).eq('id', id)),
  );
  const failed = results.find((result) => result.error);
  if (failed?.error) throw mapWriteError(failed.error);
}

export async function deleteBanner(id: string): Promise<void> {
  const { error } = await supabase.from('banners').delete().eq('id', id);
  if (error) throw mapWriteError(error);
}

export async function fetchAdminReviews(): Promise<AdminReview[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('id, product_id, author_name, rating, body, is_published, created_at, product:products(name)')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error('unexpected reviews response');
  return data.map((raw) => {
    const row = raw as Row;
    const product = (Array.isArray(row.product) ? row.product[0] : row.product) as Row | null | undefined;
    return {
      id: asString(row.id),
      productId: asString(row.product_id),
      productName: asString(product?.name),
      authorName: asString(row.author_name),
      rating: Number(row.rating),
      body: asString(row.body),
      isPublished: row.is_published === true,
      createdAt: asString(row.created_at),
    };
  });
}

export async function setReviewPublished(id: string, isPublished: boolean): Promise<void> {
  const { error } = await supabase.from('reviews').update({ is_published: isPublished }).eq('id', id);
  if (error) throw mapWriteError(error);
}

export async function fetchAdminStories(): Promise<AdminStory[]> {
  const { data, error } = await supabase
    .from('stories')
    .select('id, title, media_type, media_url, link_url, sort_order, is_active')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error('unexpected stories response');
  return data.map((raw) => {
    const row = raw as Row;
    return {
      id: asString(row.id),
      title: asString(row.title),
      mediaType: row.media_type === 'video' ? 'video' : 'image',
      mediaUrl: asString(row.media_url),
      linkUrl: asString(row.link_url),
      sortOrder: Number(row.sort_order),
      isActive: row.is_active === true,
    };
  });
}

export async function saveStory(input: StoryInput): Promise<void> {
  if (input.mediaType !== 'image' && input.mediaType !== 'video') throw new CatalogError('invalid_media');
  const payload = {
    title: requireText(input.title, 2, 80, 'invalid_name'),
    media_type: input.mediaType,
    media_url: validateHttpsUrl(input.mediaUrl, true),
    link_url: optionalText(input.linkUrl, 300),
    sort_order: requireInt(input.sortOrder, 0, 10_000, 'invalid_sort'),
    is_active: input.isActive,
  };
  const request = input.id
    ? supabase.from('stories').update(payload).eq('id', input.id)
    : supabase.from('stories').insert(payload);
  const { error } = await request;
  if (error) throw mapWriteError(error);
}

export async function deleteStory(id: string): Promise<void> {
  const { error } = await supabase.from('stories').delete().eq('id', id);
  if (error) throw mapWriteError(error);
}

export async function uploadCatalogImage(file: File): Promise<string> {
  const extension = CATALOG_IMAGE_EXTENSIONS[file.type];
  if (!extension || file.size > CATALOG_IMAGE_MAX_BYTES) throw new CatalogError('invalid_file');

  const path = `${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(CATALOG_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new CatalogError('upload_failed');

  const { data } = supabase.storage.from(CATALOG_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
