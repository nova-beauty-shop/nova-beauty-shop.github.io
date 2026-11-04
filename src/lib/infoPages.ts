import { INFO_PAGES, INFO_PAGE_ORDER } from '@/content/infoPages';
import { supabase } from '@/lib/supabase';
import type { InfoPage, InfoPageSlug, InfoSection } from '@/types/info';

export type InfoPageStatus = 'draft' | 'published';

export interface InfoPageContent {
  slug: InfoPageSlug;
  title: string;
  lead: string;
  sections: InfoSection[];
  seoTitle: string;
  seoDescription: string;
}

export interface AdminInfoPageSummary {
  slug: InfoPageSlug;
  navLabel: string;
  status: InfoPageStatus | 'default';
  updatedAt: string | null;
}

export interface SaveInfoPageInput extends InfoPageContent {
  status: InfoPageStatus;
}

export const INFO_PAGE_ERROR_MESSAGE = 'ذخیره صفحه انجام نشد. لطفاً دوباره تلاش کنید.';

type Row = Record<string, unknown>;

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function parseSections(value: unknown): InfoSection[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is InfoSection => typeof item === 'object' && item !== null && typeof (item as Row).heading === 'string');
}

function rowToContent(slug: InfoPageSlug, row: Row): InfoPageContent {
  return {
    slug,
    title: asString(row.title),
    lead: asString(row.lead),
    sections: parseSections(row.sections),
    seoTitle: asString(row.seo_title),
    seoDescription: asString(row.seo_description),
  };
}

export function defaultInfoPageContent(slug: InfoPageSlug): InfoPageContent {
  const page: InfoPage = INFO_PAGES[slug];
  return {
    slug,
    title: page.title,
    lead: page.lead,
    sections: page.sections,
    seoTitle: page.title,
    seoDescription: page.lead,
  };
}

export async function fetchPublishedInfoPage(slug: InfoPageSlug): Promise<InfoPageContent | null> {
  const { data, error } = await supabase
    .from('info_pages')
    .select('title, lead, sections, seo_title, seo_description')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return rowToContent(slug, data as Row);
}

export async function fetchAdminInfoPageSummaries(): Promise<AdminInfoPageSummary[]> {
  const { data, error } = await supabase.from('info_pages').select('slug, status, updated_at');
  if (error) throw error;
  const rows = Array.isArray(data) ? (data as Row[]) : [];
  return INFO_PAGE_ORDER.map((slug) => {
    const row = rows.find((item) => item.slug === slug);
    return {
      slug,
      navLabel: INFO_PAGES[slug].navLabel,
      status: row ? (asString(row.status) === 'published' ? 'published' : 'draft') : 'default',
      updatedAt: row ? asString(row.updated_at) : null,
    };
  });
}

export async function fetchAdminInfoPage(slug: InfoPageSlug): Promise<{ content: InfoPageContent; status: InfoPageStatus }> {
  const { data, error } = await supabase
    .from('info_pages')
    .select('title, lead, sections, seo_title, seo_description, status')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { content: defaultInfoPageContent(slug), status: 'draft' };
  const row = data as Row;
  return {
    content: rowToContent(slug, row),
    status: asString(row.status) === 'published' ? 'published' : 'draft',
  };
}

export async function saveInfoPage(input: SaveInfoPageInput): Promise<void> {
  const { error } = await supabase.rpc('admin_upsert_info_page', {
    p_slug: input.slug,
    p_title: input.title,
    p_lead: input.lead,
    p_sections: input.sections,
    p_seo_title: input.seoTitle,
    p_seo_description: input.seoDescription,
    p_status: input.status,
  });
  if (error) throw error;
}
