import { toAdminWriteError } from '@/lib/adminWriteErrors';
import { supabase } from '@/lib/supabase';

export interface AdminFreeSample {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  minSubtotalToman: number;
  isActive: boolean;
  sortOrder: number;
}

export interface FreeSampleInput {
  id?: string;
  title: string;
  description: string;
  imageUrl: string;
  minSubtotalToman: number;
  isActive: boolean;
  sortOrder: number;
}

type Row = Record<string, unknown>;

const SAMPLE_COLUMNS = 'id, title, description, image_url, min_subtotal_toman, is_active, sort_order';

export async function fetchFreeSamples(): Promise<AdminFreeSample[]> {
  const { data, error } = await supabase.from('free_samples').select(SAMPLE_COLUMNS).order('sort_order', { ascending: true });
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error('unexpected free samples response');
  return data.map((raw) => {
    const row = raw as Row;
    return {
      id: String(row.id),
      title: String(row.title ?? ''),
      description: String(row.description ?? ''),
      imageUrl: String(row.image_url ?? ''),
      minSubtotalToman: Number(row.min_subtotal_toman ?? 0),
      isActive: row.is_active === true,
      sortOrder: Number(row.sort_order ?? 0),
    };
  });
}

export async function saveFreeSample(input: FreeSampleInput): Promise<void> {
  const payload = {
    title: input.title.trim(),
    description: input.description.trim(),
    image_url: input.imageUrl.trim(),
    min_subtotal_toman: input.minSubtotalToman,
    is_active: input.isActive,
    sort_order: input.sortOrder,
  };
  const request = input.id
    ? supabase.from('free_samples').update(payload).eq('id', input.id)
    : supabase.from('free_samples').insert(payload);
  const { error } = await request;
  if (error) throw toAdminWriteError(error);
}

export async function setFreeSampleActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from('free_samples').update({ is_active: isActive }).eq('id', id);
  if (error) throw toAdminWriteError(error);
}

export async function deleteFreeSample(id: string): Promise<void> {
  const { error } = await supabase.from('free_samples').delete().eq('id', id);
  if (error) throw toAdminWriteError(error);
}
