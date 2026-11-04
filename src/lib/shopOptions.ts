import type { PriceRangeKey, SortKey } from '@/types/catalog';

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'featured', label: 'پیشنهاد نوا' },
  { value: 'newest', label: 'جدیدترین‌ها' },
  { value: 'bestselling', label: 'پرفروش‌ترین‌ها' },
  { value: 'rating', label: 'بیشترین امتیاز' },
  { value: 'price-asc', label: 'ارزان‌ترین' },
  { value: 'price-desc', label: 'گران‌ترین' },
];

export const PRICE_RANGES: { value: PriceRangeKey; label: string; min?: number; max?: number }[] = [
  { value: 'all', label: 'همه قیمت‌ها' },
  { value: 'under-1m', label: 'زیر ۱ میلیون تومان', max: 999_999 },
  { value: '1m-3m', label: '۱ تا ۳ میلیون تومان', min: 1_000_000, max: 2_999_999 },
  { value: '3m-5m', label: '۳ تا ۵ میلیون تومان', min: 3_000_000, max: 4_999_999 },
  { value: 'over-5m', label: 'بالای ۵ میلیون تومان', min: 5_000_000 },
];

export const PAGE_SIZE = 9;
