import { CatalogError } from '@/lib/adminCatalog';
import { supabase } from '@/lib/supabase';

export type SiteTextKey =
  | 'announcement_banner'
  | 'home_bestsellers_eyebrow'
  | 'home_bestsellers_title'
  | 'home_new_eyebrow'
  | 'home_new_title'
  | 'home_skincare_eyebrow'
  | 'home_skincare_title'
  | 'trust_1_title'
  | 'trust_1_text'
  | 'trust_2_title'
  | 'trust_2_text'
  | 'trust_3_title'
  | 'trust_3_text'
  | 'trust_4_title'
  | 'trust_4_text';

export interface SiteTextDefinition {
  key: SiteTextKey;
  label: string;
  group: 'announcement' | 'home' | 'trust';
  defaultValue: string;
  hint?: string;
}

export const SITE_TEXT_DEFINITIONS: SiteTextDefinition[] = [
  {
    key: 'announcement_banner',
    label: 'نوار اعلان بالای سایت',
    group: 'announcement',
    defaultValue: 'ارسال سراسری با پیک برای سفارش‌های بالای {{freeShippingThreshold}}',
    hint: 'برای نمایش مبلغ حد ارسال رایگان از {{freeShippingThreshold}} استفاده کنید.',
  },
  { key: 'home_bestsellers_eyebrow', label: 'بخش پرفروش‌ترین‌ها: متن کوچک', group: 'home', defaultValue: 'پرفروش‌ترین‌ها' },
  { key: 'home_bestsellers_title', label: 'بخش پرفروش‌ترین‌ها: عنوان', group: 'home', defaultValue: 'انتخاب مشتریان نُوا' },
  { key: 'home_new_eyebrow', label: 'بخش تازه‌رسیده‌ها: متن کوچک', group: 'home', defaultValue: 'تازه رسیده‌ها' },
  { key: 'home_new_title', label: 'بخش تازه‌رسیده‌ها: عنوان', group: 'home', defaultValue: 'جدیدترین عطرها و مراقبت‌ها' },
  { key: 'home_skincare_eyebrow', label: 'بخش مراقبت از پوست: متن کوچک', group: 'home', defaultValue: 'ترکیب شخصی شما' },
  { key: 'home_skincare_title', label: 'بخش مراقبت از پوست: عنوان', group: 'home', defaultValue: 'محصولات منتخب مراقبت از پوست' },
  { key: 'trust_1_title', label: 'مزیت اول: عنوان', group: 'trust', defaultValue: 'اصالت کالا' },
  { key: 'trust_1_text', label: 'مزیت اول: توضیح', group: 'trust', defaultValue: 'تمام محصولات با گواهی اصالت عرضه می‌شوند' },
  { key: 'trust_2_title', label: 'مزیت دوم: عنوان', group: 'trust', defaultValue: 'ارسال سریع' },
  { key: 'trust_2_text', label: 'مزیت دوم: توضیح', group: 'trust', defaultValue: 'ارسال با پیک برای شهرهای منتخب' },
  { key: 'trust_3_title', label: 'مزیت سوم: عنوان', group: 'trust', defaultValue: 'بازگشت آسان' },
  { key: 'trust_3_text', label: 'مزیت سوم: توضیح', group: 'trust', defaultValue: 'شرایط بازگشت کالا در صفحه قوانین' },
  { key: 'trust_4_title', label: 'مزیت چهارم: عنوان', group: 'trust', defaultValue: 'بسته‌بندی لوکس' },
  { key: 'trust_4_text', label: 'مزیت چهارم: توضیح', group: 'trust', defaultValue: 'هر سفارش با بسته‌بندی هدیه ارسال می‌شود' },
];

export type SiteTexts = Record<SiteTextKey, string>;

const DEFINITION_KEYS = new Set<string>(SITE_TEXT_DEFINITIONS.map((item) => item.key));

export function defaultSiteTexts(): SiteTexts {
  return Object.fromEntries(SITE_TEXT_DEFINITIONS.map((item) => [item.key, item.defaultValue])) as SiteTexts;
}

export async function fetchSiteTextOverrides(): Promise<Partial<SiteTexts>> {
  const { data, error } = await supabase.from('site_texts').select('key, value');
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error('unexpected site texts response');
  const overrides: Partial<SiteTexts> = {};
  for (const raw of data) {
    const row = raw as { key?: unknown; value?: unknown };
    if (typeof row.key === 'string' && DEFINITION_KEYS.has(row.key) && typeof row.value === 'string') {
      overrides[row.key as SiteTextKey] = row.value;
    }
  }
  return overrides;
}

export async function saveSiteText(key: SiteTextKey, value: string): Promise<void> {
  if (!DEFINITION_KEYS.has(key)) throw new CatalogError('invalid_name');
  const trimmed = value.trim();
  if (trimmed === '' || trimmed.length > 1000) throw new CatalogError('invalid_text');
  const { error } = await supabase
    .from('site_texts')
    .upsert({ key, value: trimmed, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) throw new CatalogError('save_failed');
}

export async function resetSiteText(key: SiteTextKey): Promise<void> {
  if (!DEFINITION_KEYS.has(key)) throw new CatalogError('invalid_name');
  const { error } = await supabase.from('site_texts').delete().eq('key', key);
  if (error) throw new CatalogError('save_failed');
}
