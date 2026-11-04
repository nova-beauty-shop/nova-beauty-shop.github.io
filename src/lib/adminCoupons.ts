import { AdminWriteError, toAdminWriteError } from '@/lib/adminWriteErrors';
import { supabase } from '@/lib/supabase';

export type CouponDiscountType = 'percent' | 'amount';

export interface AdminCoupon {
  id: string;
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  minSubtotalToman: number;
  maxUses: number | null;
  usedCount: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
}

export interface CouponInput {
  id?: string;
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  minSubtotalToman: number;
  maxUses: number | null;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
}

type Row = Record<string, unknown>;

const COUPON_COLUMNS = 'id, code, discount_type, discount_value, min_subtotal_toman, max_uses, used_count, starts_at, ends_at, is_active';

function asNumber(value: unknown): number {
  return Number(value ?? 0);
}

function asNullableNumber(value: unknown): number | null {
  return value === null || value === undefined ? null : Number(value);
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

export async function fetchCoupons(): Promise<AdminCoupon[]> {
  const { data, error } = await supabase.from('coupons').select(COUPON_COLUMNS).order('created_at', { ascending: false });
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error('unexpected coupons response');
  return data.map((raw) => {
    const row = raw as Row;
    return {
      id: String(row.id),
      code: String(row.code),
      discountType: row.discount_type === 'amount' ? 'amount' : 'percent',
      discountValue: asNumber(row.discount_value),
      minSubtotalToman: asNumber(row.min_subtotal_toman),
      maxUses: asNullableNumber(row.max_uses),
      usedCount: asNumber(row.used_count),
      startsAt: asNullableString(row.starts_at),
      endsAt: asNullableString(row.ends_at),
      isActive: row.is_active === true,
    };
  });
}

export async function saveCoupon(input: CouponInput): Promise<void> {
  const payload = {
    code: input.code.trim().toUpperCase(),
    discount_type: input.discountType,
    discount_value: input.discountValue,
    min_subtotal_toman: input.minSubtotalToman,
    max_uses: input.maxUses,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    is_active: input.isActive,
  };
  const request = input.id
    ? supabase.from('coupons').update(payload).eq('id', input.id)
    : supabase.from('coupons').insert(payload);
  const { error } = await request;
  if (error) throw toAdminWriteError(error);
}

export async function setCouponActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from('coupons').update({ is_active: isActive }).eq('id', id);
  if (error) throw toAdminWriteError(error);
}

export async function deleteCoupon(id: string): Promise<void> {
  const { error } = await supabase.from('coupons').delete().eq('id', id);
  if (error) throw toAdminWriteError(error);
}

export { AdminWriteError };
