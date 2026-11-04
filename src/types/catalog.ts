export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  imageUrl: string;
}

export type VariantKind = 'color' | 'size';

export interface ProductVariant {
  id: string;
  label: string;
  priceDelta: number;
  kind: VariantKind;
  /** Only set for colour variants, always a 6 digit hex such as #C08A8D. */
  colorHex: string | null;
}

export type CardBgType = 'color' | 'preset' | 'image';
export type ImageFit = 'cover' | 'contain';
export type AnimationType = 'float' | 'zoom' | 'rotate3d' | 'pulse-glow';

export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  shortDescription: string;
  description: string;
  ingredients: string;
  usageInstructions: string;
  priceToman: number;
  compareAtToman: number | null;
  stock: number;
  rating: number;
  reviewCount: number;
  images: string[];
  variants: ProductVariant[];
  isBestseller: boolean;
  isNew: boolean;
  createdAt: string;
  cardBgType: CardBgType;
  cardBgValue: string | null;
  imageFit: ImageFit;
  imageScale: number;
  imageAngle: number;
  animationType: AnimationType | null;
  isAmazingOffer: boolean;
  offerEndsAt: string | null;
}

export interface Review {
  id: string;
  authorName: string;
  rating: number;
  body: string;
  createdAt: string;
  pros: string[];
  cons: string[];
}

export interface ProductQuestion {
  id: string;
  question: string;
  answer: string;
  answeredAt: string | null;
  createdAt: string;
}

export interface Story {
  id: string;
  title: string;
  mediaType: 'image' | 'video';
  mediaUrl: string;
  linkUrl: string | null;
}

export interface Banner {
  id: string;
  title: string;
  placement: 'hero' | 'promo';
  eyebrow: string;
  subtitle: string;
  ctaLabel: string;
  ctaUrl: string;
  imageUrl: string;
}

export type SortKey = 'featured' | 'newest' | 'price-asc' | 'price-desc' | 'rating' | 'bestselling';

export type PriceRangeKey = 'all' | 'under-1m' | '1m-3m' | '3m-5m' | 'over-5m';
