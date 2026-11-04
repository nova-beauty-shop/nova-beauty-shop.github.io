import { supabase } from '@/lib/supabase';
import { formatToman } from '@/lib/format';
import type { DeliveryMethod } from '@/lib/orders';

export interface StoreSettings {
  storeName: string;
  supportPhone: string;
  supportEmail: string;
  address: string;
  courierFeeToman: number;
  courierFreeThresholdToman: number;
  postFeeToman: number;
}

type Row = Record<string, unknown>;

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) throw new Error('unexpected store settings response');
  return parsed;
}

export async function fetchStoreSettings(): Promise<StoreSettings> {
  const { data, error } = await supabase
    .from('store_settings')
    .select('store_name, support_phone, support_email, address, courier_fee_toman, courier_free_threshold_toman, post_fee_toman')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('store settings missing');
  const row = data as Row;
  return {
    storeName: asString(row.store_name),
    supportPhone: asString(row.support_phone),
    supportEmail: asString(row.support_email),
    address: asString(row.address),
    courierFeeToman: asNumber(row.courier_fee_toman),
    courierFreeThresholdToman: asNumber(row.courier_free_threshold_toman),
    postFeeToman: asNumber(row.post_fee_toman),
  };
}

export function estimateDeliveryFee(method: DeliveryMethod, subtotalToman: number, settings: StoreSettings): number {
  if (method === 'post') return settings.postFeeToman;
  return subtotalToman >= settings.courierFreeThresholdToman ? 0 : settings.courierFeeToman;
}

export function fillStoreTokens(text: string, settings: StoreSettings): string {
  return text
    .split('{{freeShippingThreshold}}').join(formatToman(settings.courierFreeThresholdToman))
    .split('{{supportPhone}}').join(settings.supportPhone || 'به‌زودی')
    .split('{{supportEmail}}').join(settings.supportEmail || 'به‌زودی');
}
