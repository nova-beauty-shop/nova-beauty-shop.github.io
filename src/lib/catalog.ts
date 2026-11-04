import {
  clampNumber,
  IMAGE_ANGLE_RANGE,
  IMAGE_SCALE_RANGE,
  isHexColor,
  parseAnimationType,
  parseCardBgType,
  parseImageFit,
  parseVariantKind,
} from '@/lib/productStyle';
import { PAGE_SIZE, PRICE_RANGES } from '@/lib/shopOptions';
import { supabase } from '@/lib/supabase';
import type {
  Banner,
  Category,
  PriceRangeKey,
  Product,
  ProductQuestion,
  ProductVariant,
  Review,
  SortKey,
  Story,
} from '@/types/catalog';

export const PRODUCT_COLUMNS =
  'id, slug, name, brand, category_id, short_description, description, ingredients, usage_instructions, price_toman, compare_at_toman, stock, rating, review_count, images, variants, is_bestseller, is_new, created_at, card_bg_type, card_bg_value, image_fit, image_scale, image_angle, animation_type, is_amazing_offer, offer_ends_at, category:categories!inner(slug, name)';

export interface ProductRow {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category_id: string;
  short_description: string;
  description: string;
  ingredients: string;
  usage_instructions: string;
  price_toman: number;
  compare_at_toman: number | null;
  stock: number;
  rating: number | string;
  review_count: number;
  images: string[];
  variants: unknown;
  is_bestseller: boolean;
  is_new: boolean;
  created_at: string;
  card_bg_type: string | null;
  card_bg_value: string | null;
  image_fit: string | null;
  image_scale: number | null;
  image_angle: number | null;
  animation_type: string | null;
  is_amazing_offer: boolean | null;
  offer_ends_at: string | null;
  category: { slug: string; name: string };
}

export interface ProductQuery {
  categorySlug?: string;
  search?: string;
  sort?: SortKey;
  priceRange?: PriceRangeKey;
  inStockOnly?: boolean;
  bestsellersOnly?: boolean;
  newOnly?: boolean;
  excludeId?: string;
  ids?: string[];
  page?: number;
  pageSize?: number;
}

export function parseVariants(raw: unknown): ProductVariant[] {
  if (!Array.isArray(raw)) return [];
  const variants: ProductVariant[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const entry = item as { id?: unknown; label?: unknown; price_delta?: unknown; kind?: unknown; color_hex?: unknown };
    if (typeof entry.id !== 'string' || typeof entry.label !== 'string') continue;
    const colorHex = isHexColor(entry.color_hex) ? entry.color_hex : null;
    variants.push({
      id: entry.id,
      label: entry.label,
      priceDelta: Number(entry.price_delta) || 0,
      kind: colorHex ? 'color' : parseVariantKind(entry.kind),
      colorHex,
    });
  }
  return variants;
}

export function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brand,
    categoryId: row.category_id,
    categorySlug: row.category.slug,
    categoryName: row.category.name,
    shortDescription: row.short_description,
    description: row.description,
    ingredients: row.ingredients,
    usageInstructions: row.usage_instructions,
    priceToman: Number(row.price_toman),
    compareAtToman: row.compare_at_toman === null ? null : Number(row.compare_at_toman),
    stock: Number(row.stock),
    rating: Number(row.rating),
    reviewCount: Number(row.review_count),
    images: row.images ?? [],
    variants: parseVariants(row.variants),
    isBestseller: row.is_bestseller,
    isNew: row.is_new,
    createdAt: row.created_at,
    cardBgType: parseCardBgType(row.card_bg_type),
    cardBgValue: row.card_bg_value ?? null,
    imageFit: parseImageFit(row.image_fit),
    imageScale: clampNumber(Number(row.image_scale ?? 100), IMAGE_SCALE_RANGE.min, IMAGE_SCALE_RANGE.max, 100),
    imageAngle: clampNumber(Number(row.image_angle ?? 0), IMAGE_ANGLE_RANGE.min, IMAGE_ANGLE_RANGE.max, 0),
    animationType: parseAnimationType(row.animation_type),
    isAmazingOffer: row.is_amazing_offer === true,
    offerEndsAt: row.offer_ends_at ?? null,
  };
}

function requireData<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  if (data === null) throw new Error('No data returned');
  return data;
}

function sanitizeSearch(term: string | undefined): string {
  return (term ?? '').replace(/[%_,()*\\"']/g, ' ').trim().slice(0, 80);
}

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, slug, name, description, image_url')
    .order('sort_order', { ascending: true });
  const rows = requireData(data, error);
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    imageUrl: row.image_url,
  }));
}

export async function fetchProducts(query: ProductQuery): Promise<{ items: Product[]; total: number }> {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? PAGE_SIZE;
  const from = (page - 1) * pageSize;

  if (query.ids && query.ids.length === 0) return { items: [], total: 0 };

  let request = supabase.from('products').select(PRODUCT_COLUMNS, { count: 'exact' });

  if (query.categorySlug) request = request.eq('category.slug', query.categorySlug);

  const term = sanitizeSearch(query.search);
  if (term) request = request.or(`name.ilike.*${term}*,brand.ilike.*${term}*`);

  const range = PRICE_RANGES.find((item) => item.value === query.priceRange);
  if (range?.min !== undefined) request = request.gte('price_toman', range.min);
  if (range?.max !== undefined) request = request.lte('price_toman', range.max);

  if (query.inStockOnly) request = request.gt('stock', 0);
  if (query.bestsellersOnly) request = request.eq('is_bestseller', true);
  if (query.newOnly) request = request.eq('is_new', true);
  if (query.excludeId) request = request.neq('id', query.excludeId);
  if (query.ids) request = request.in('id', query.ids);

  switch (query.sort) {
    case 'newest':
      request = request.order('created_at', { ascending: false });
      break;
    case 'price-asc':
      request = request.order('price_toman', { ascending: true });
      break;
    case 'price-desc':
      request = request.order('price_toman', { ascending: false });
      break;
    case 'rating':
      request = request.order('rating', { ascending: false }).order('review_count', { ascending: false });
      break;
    case 'bestselling':
      request = request.order('is_bestseller', { ascending: false }).order('review_count', { ascending: false });
      break;
    default:
      request = request.order('is_bestseller', { ascending: false }).order('created_at', { ascending: false });
  }

  const { data, error, count } = await request.range(from, from + pageSize - 1);
  const rows = requireData(data as unknown as ProductRow[] | null, error);
  return { items: rows.map(mapProduct), total: count ?? rows.length };
}

export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_COLUMNS)
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapProduct(data as unknown as ProductRow) : null;
}

export async function fetchReviews(productId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('id, author_name, rating, body, created_at, pros, cons')
    .eq('product_id', productId)
    .order('created_at', { ascending: false });
  const rows = requireData(data, error);
  return rows.map((row) => ({
    id: row.id,
    authorName: row.author_name,
    rating: row.rating,
    body: row.body,
    createdAt: row.created_at,
    pros: cleanPoints(row.pros),
    cons: cleanPoints(row.cons),
  }));
}

function cleanPoints(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item !== '')
    .slice(0, 6);
}

export const QUESTION_MIN_LENGTH = 5;
export const QUESTION_MAX_LENGTH = 500;

export async function fetchProductQuestions(productId: string): Promise<ProductQuestion[]> {
  const { data, error } = await supabase
    .from('product_questions')
    .select('id, question, answer, answered_at, created_at')
    .eq('product_id', productId)
    .eq('is_published', true)
    .order('created_at', { ascending: false });
  const rows = requireData(data, error);
  return rows.map((row) => ({
    id: row.id,
    question: row.question,
    answer: typeof row.answer === 'string' ? row.answer : '',
    answeredAt: row.answered_at ?? null,
    createdAt: row.created_at,
  }));
}

export async function askProductQuestion(productId: string, question: string): Promise<void> {
  const text = question.trim();
  if (text.length < QUESTION_MIN_LENGTH || text.length > QUESTION_MAX_LENGTH) throw new Error('invalid_question');
  const { error } = await supabase.from('product_questions').insert({ product_id: productId, question: text });
  if (error) throw new Error(error.message);
}

export async function fetchStories(): Promise<Story[]> {
  const { data, error } = await supabase
    .from('stories')
    .select('id, title, media_type, media_url, link_url')
    .order('sort_order', { ascending: true });
  const rows = requireData(data, error);
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    mediaType: row.media_type === 'video' ? 'video' : 'image',
    mediaUrl: row.media_url,
    linkUrl: row.link_url,
  }));
}

export async function fetchBanners(): Promise<Banner[]> {
  const { data, error } = await supabase
    .from('banners')
    .select('id, title, placement, eyebrow, subtitle, cta_label, cta_url, image_url')
    .order('sort_order', { ascending: true });
  const rows = requireData(data, error);
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    placement: row.placement === 'hero' ? 'hero' : 'promo',
    eyebrow: row.eyebrow,
    subtitle: row.subtitle,
    ctaLabel: row.cta_label,
    ctaUrl: row.cta_url,
    imageUrl: row.image_url,
  }));
}

export interface PricePoint {
  price: number;
  compareAt: number | null;
  recordedAt: string;
}

/** Recorded price changes of a product, oldest first. */
export async function fetchPriceHistory(productId: string): Promise<PricePoint[]> {
  const { data, error } = await supabase
    .from('product_price_history')
    .select('price_toman, compare_at_toman, recorded_at')
    .eq('product_id', productId)
    .order('recorded_at', { ascending: true })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    price: Number(row.price_toman),
    compareAt: row.compare_at_toman === null ? null : Number(row.compare_at_toman),
    recordedAt: String(row.recorded_at),
  }));
}
