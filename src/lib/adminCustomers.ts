import { supabase } from '@/lib/supabase';
import type { OrderStatus } from '@/lib/orders';

export const ADMIN_CUSTOMER_PAGE_SIZE = 20;

export interface AdminCustomerRow {
  id: string;
  name: string;
  phone: string | null;
  email: string;
  blocked: boolean;
  createdAt: string;
  orderCount: number;
  totalSpentToman: number;
}

export interface AdminCustomerPage {
  rows: AdminCustomerRow[];
  total: number;
}

export interface AdminCustomerDetail extends AdminCustomerRow {
  note: string;
}

export interface AdminCustomerOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalToman: number;
  createdAt: string;
}

type Row = Record<string, unknown>;

const CUSTOMER_ERROR_MESSAGES: Record<string, string> = {
  not_authorized: 'دسترسی شما برای این کار کافی نیست.',
  invalid_note: 'یادداشت بیش از حد طولانی است.',
  customer_not_found: 'مشتری پیدا نشد.',
};

export function adminCustomerErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'message' in error ? String(error.message).trim() : '';
  return CUSTOMER_ERROR_MESSAGES[code] ?? 'عملیات انجام نشد. لطفاً دوباره تلاش کنید.';
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asNumber(value: unknown): number {
  return typeof value === 'number' ? value : Number(value ?? 0);
}

function sanitizeSearch(value: string): string {
  return value.replace(/[%_\\]/g, '').trim().slice(0, 60);
}

function toCustomerRow(row: Row): AdminCustomerRow {
  return {
    id: asString(row.customer_id),
    name: asString(row.customer_name),
    phone: typeof row.customer_phone === 'string' ? row.customer_phone : null,
    email: asString(row.customer_email),
    blocked: row.customer_blocked === true,
    createdAt: asString(row.customer_created_at),
    orderCount: asNumber(row.order_count),
    totalSpentToman: asNumber(row.total_spent),
  };
}

export async function fetchAdminCustomerPage(search: string, page: number): Promise<AdminCustomerPage> {
  const { data, error } = await supabase.rpc('admin_list_customers', {
    p_search: sanitizeSearch(search),
    p_offset: Math.max(0, page) * ADMIN_CUSTOMER_PAGE_SIZE,
    p_limit: ADMIN_CUSTOMER_PAGE_SIZE,
  });
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error('unexpected customers response');
  const rows = (data as Row[]).map(toCustomerRow);
  const total = data.length > 0 ? asNumber((data[0] as Row).total_count) : 0;
  return { rows, total };
}

export async function fetchAdminCustomer(id: string): Promise<AdminCustomerDetail | null> {
  const { data, error } = await supabase.rpc('admin_get_customer', { p_customer_id: id });
  if (error) throw error;
  if (!Array.isArray(data) || data.length === 0) return null;
  const row = data[0] as Row;
  return { ...toCustomerRow(row), note: asString(row.customer_note) };
}

export async function fetchCustomerOrders(customerId: string): Promise<AdminCustomerOrder[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_number, status, total_toman, created_at')
    .eq('user_id', customerId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error('unexpected orders response');
  return data.map((raw) => {
    const row = raw as Row;
    return {
      id: asString(row.id),
      orderNumber: asString(row.order_number),
      status: asString(row.status) as OrderStatus,
      totalToman: asNumber(row.total_toman),
      createdAt: asString(row.created_at),
    };
  });
}

export async function updateAdminCustomer(customerId: string, blocked: boolean, note: string): Promise<void> {
  const trimmed = note.trim();
  const { error } = await supabase.rpc('admin_update_customer', {
    p_customer_id: customerId,
    p_blocked: blocked,
    p_note: trimmed === '' ? null : trimmed,
  });
  if (error) throw error;
}
