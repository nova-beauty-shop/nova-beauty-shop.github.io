import { supabase } from '@/lib/supabase';

export interface PaymentGateway {
  provider: string;
  label: string;
  mode: 'sandbox' | 'live';
}

export class GatewayError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

const GATEWAY_ERROR_MESSAGES: Record<string, string> = {
  not_authorized: 'فقط مالک فروشگاه می‌تواند تنظیمات درگاه را تغییر دهد.',
  invalid_mode: 'حالت انتخاب‌شده معتبر نیست.',
  gateway_not_found: 'درگاه مورد نظر پیدا نشد.',
};

export function gatewayErrorMessage(error: unknown): string {
  const code = error instanceof GatewayError ? error.code : '';
  return GATEWAY_ERROR_MESSAGES[code] ?? 'ذخیره تنظیمات انجام نشد. لطفاً دوباره تلاش کنید.';
}

export async function fetchPaymentGateways(): Promise<PaymentGateway[]> {
  const { data, error } = await supabase.from('payment_gateways').select('provider, label, mode').order('label');
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error('unexpected gateways response');
  return data.map((raw) => {
    const row = raw as Record<string, unknown>;
    return {
      provider: typeof row.provider === 'string' ? row.provider : '',
      label: typeof row.label === 'string' ? row.label : '',
      mode: row.mode === 'live' ? 'live' : 'sandbox',
    };
  });
}

export async function updatePaymentGatewayMode(provider: string, mode: 'sandbox' | 'live'): Promise<void> {
  const { error } = await supabase.rpc('admin_update_payment_gateway', { p_provider: provider, p_mode: mode });
  if (error) throw new GatewayError(String(error.message).trim());
}
