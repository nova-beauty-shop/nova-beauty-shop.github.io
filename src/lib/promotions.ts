import { supabase } from '@/lib/supabase';

export interface FreeSample {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  minSubtotalToman: number;
}

export interface CouponPreview {
  code: string;
  discountToman: number;
}

export class PromotionError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

type Row = Record<string, unknown>;

export async function fetchActiveFreeSamples(): Promise<FreeSample[]> {
  const { data, error } = await supabase
    .from('free_samples')
    .select('id, title, description, image_url, min_subtotal_toman')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
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
    };
  });
}

export async function validateCoupon(code: string, subtotalToman: number): Promise<CouponPreview> {
  const { data, error } = await supabase.rpc('validate_coupon', {
    p_code: code.trim(),
    p_subtotal: subtotalToman,
  });
  if (error) throw new PromotionError(error.message.trim());
  const result = data as Row | null;
  if (!result || typeof result.code !== 'string' || typeof result.discount_toman !== 'number') {
    throw new PromotionError('unexpected_response');
  }
  return { code: result.code, discountToman: result.discount_toman };
}
