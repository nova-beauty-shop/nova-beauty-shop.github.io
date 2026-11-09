import { OrderError, type OrderStatus, type DeliveryMethod } from '@/lib/orders';
import { supabase } from '@/lib/supabase';

export const ADMIN_ORDER_PAGE_SIZE = 20;

export const ADMIN_ORDER_STATUSES: OrderStatus[] = [
  'pending_review',
  'awaiting_payment',
  'paid',
  'processing',
  'preparing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
];

export interface AdminOrderRow {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalToman: number;
  createdAt: string;
  recipientName: string;
  phone: string;
  trackingCode: string | null;
  itemsSummary: string;
  hasPendingReceipt: boolean;
}

export interface AdminOrderQuery {
  search: string;
  status: OrderStatus | null;
  page: number;
}

export interface AdminOrderPage {
  rows: AdminOrderRow[];
  total: number;
}

export interface AdminOrderItem {
  id: string;
  productName: string;
  brand: string;
  variantLabel: string | null;
  unitPriceToman: number;
  quantity: number;
  lineTotalToman: number;
}

export interface AdminOrderPayment {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  amountToman: number;
  reviewNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  storagePath: string;
  payerName: string | null;
  cardLast4: string | null;
  bankName: string | null;
  trackingCode: string | null;
}

export interface AdminOrderEvent {
  id: string;
  fromStatus: OrderStatus;
  toStatus: OrderStatus;
  note: string | null;
  createdAt: string;
}

export interface AdminOrderDetail {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  deliveryMethod: DeliveryMethod;
  subtotalToman: number;
  deliveryFeeToman: number;
  totalToman: number;
  createdAt: string;
  updatedAt: string;
  recipientName: string;
  phone: string;
  province: string;
  city: string;
  street: string;
  postalCode: string;
  trackingCode: string | null;
  deliveryNote: string | null;
  items: AdminOrderItem[];
  payments: AdminOrderPayment[];
  events: AdminOrderEvent[];
}

type Row = Record<string, unknown>;

const ADMIN_ORDER_ERROR_MESSAGES: Record<string, string> = {
  not_authorized: 'دسترسی شما برای تغییر وضعیت سفارش کافی نیست.',
  invalid_status: 'وضعیت انتخاب‌شده معتبر نیست.',
  invalid_transition: 'تغییر از وضعیت فعلی به این وضعیت مجاز نیست.',
  tracking_code_required: 'برای ارسال سفارش، کد رهگیری را وارد کنید.',
  invalid_tracking_code: 'کد رهگیری باید بین ۳ تا ۶۰ نویسه باشد.',
  invalid_note: 'یادداشت بیش از حد طولانی است.',
  order_not_found: 'سفارش پیدا نشد.',
};

export function adminOrderErrorMessage(error: unknown): string {
  if (error instanceof OrderError) return ADMIN_ORDER_ERROR_MESSAGES[error.code] ?? 'تغییر وضعیت انجام نشد. لطفاً دوباره تلاش کنید.';
  return 'تغییر وضعیت انجام نشد. لطفاً دوباره تلاش کنید.';
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asNumber(value: unknown): number {
  return typeof value === 'number' ? value : Number(value ?? 0);
}

function asStatus(value: unknown): OrderStatus {
  return asString(value) as OrderStatus;
}

function sanitizeSearch(value: string): string {
  return value.replace(/[%_,()*\\"']/g, '').trim().slice(0, 60);
}

export async function fetchAdminOrderPage(query: AdminOrderQuery): Promise<AdminOrderPage> {
  const from = Math.max(0, query.page) * ADMIN_ORDER_PAGE_SIZE;
  let request = supabase
    .from('orders')
    .select('id, order_number, status, total_toman, created_at, recipient_name, phone, tracking_code, items:order_items(product_name, quantity), payments:payment_receipts(status)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + ADMIN_ORDER_PAGE_SIZE - 1);

  if (query.status) request = request.eq('status', query.status);
  const term = sanitizeSearch(query.search);
  if (term !== '') {
    request = request.or(`order_number.ilike.%${term}%,recipient_name.ilike.%${term}%,phone.ilike.%${term}%`);
  }

  const { data, error, count } = await request;
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error('unexpected orders response');

  return {
    total: count ?? 0,
    rows: data.map((raw) => {
      const row = raw as Row;
      return {
        id: asString(row.id),
        orderNumber: asString(row.order_number),
        status: asStatus(row.status),
        totalToman: asNumber(row.total_toman),
        createdAt: asString(row.created_at),
        recipientName: asString(row.recipient_name),
        phone: asString(row.phone),
        trackingCode: typeof row.tracking_code === "string" ? row.tracking_code : null,
        itemsSummary: Array.isArray(row.items)
          ? (row.items as Row[]).map((i) => `${asString(i.product_name)} (×${asNumber(i.quantity)})`).join("، ")
          : "",
        hasPendingReceipt: Array.isArray(row.payments)
          ? (row.payments as Row[]).some((p) => asString(p.status) === "pending")
          : false,
      };
    }),
  };
}

export async function fetchAdminOrderDetail(id: string): Promise<AdminOrderDetail | null> {
  const { data, error } = await supabase
    .from('orders')
    .select(
      'id, order_number, status, delivery_method, subtotal_toman, delivery_fee_toman, total_toman, created_at, updated_at, recipient_name, phone, province, city, street, postal_code, tracking_code, delivery_note, items:order_items(id, product_name, brand, variant_label, unit_price_toman, quantity, line_total_toman), payments:payment_receipts(id, status, amount_toman, review_note, created_at, reviewed_at, storage_path, payer_name, card_last4, bank_name, tracking_code), events:order_status_events(id, from_status, to_status, note, created_at)',
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as unknown as Row;

  const items = Array.isArray(row.items) ? (row.items as Row[]) : [];
  const payments = Array.isArray(row.payments) ? (row.payments as Row[]) : [];
  const events = Array.isArray(row.events) ? (row.events as Row[]) : [];

  return {
    id: asString(row.id),
    orderNumber: asString(row.order_number),
    status: asStatus(row.status),
    deliveryMethod: asString(row.delivery_method) as DeliveryMethod,
    subtotalToman: asNumber(row.subtotal_toman),
    deliveryFeeToman: asNumber(row.delivery_fee_toman),
    totalToman: asNumber(row.total_toman),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
    recipientName: asString(row.recipient_name),
    phone: asString(row.phone),
    province: asString(row.province),
    city: asString(row.city),
    street: asString(row.street),
    postalCode: asString(row.postal_code),
    trackingCode: typeof row.tracking_code === 'string' ? row.tracking_code : null,
    deliveryNote: typeof row.delivery_note === 'string' ? row.delivery_note : null,
    items: items.map((item) => ({
      id: asString(item.id),
      productName: asString(item.product_name),
      brand: asString(item.brand),
      variantLabel: typeof item.variant_label === 'string' ? item.variant_label : null,
      unitPriceToman: asNumber(item.unit_price_toman),
      quantity: asNumber(item.quantity),
      lineTotalToman: asNumber(item.line_total_toman),
    })),
    payments: payments.map((payment) => ({
      id: asString(payment.id),
      status: asString(payment.status) as AdminOrderPayment['status'],
      amountToman: asNumber(payment.amount_toman),
      reviewNote: typeof payment.review_note === 'string' ? payment.review_note : null,
      createdAt: asString(payment.created_at),
      reviewedAt: typeof payment.reviewed_at === 'string' ? payment.reviewed_at : null,
      storagePath: asString(payment.storage_path),
      payerName: typeof payment.payer_name === 'string' ? payment.payer_name : null,
      cardLast4: typeof payment.card_last4 === 'string' ? payment.card_last4 : null,
      bankName: typeof payment.bank_name === 'string' ? payment.bank_name : null,
      trackingCode: typeof payment.tracking_code === 'string' ? payment.tracking_code : null,
    })),
    events: events
      .map((event) => ({
        id: asString(event.id),
        fromStatus: asStatus(event.from_status),
        toStatus: asStatus(event.to_status),
        note: typeof event.note === 'string' ? event.note : null,
        createdAt: asString(event.created_at),
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  note: string,
  trackingCode: string,
): Promise<void> {
  const { error } = await supabase.rpc('admin_update_order_status', {
    p_order_id: orderId,
    p_new_status: status,
    p_note: note.trim() === '' ? null : note.trim(),
    p_tracking_code: trackingCode.trim() === '' ? null : trackingCode.trim(),
  });
  if (error) throw new OrderError(error.message.trim());
}

export const NEXT_ORDER_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  awaiting_payment: ['cancelled'],
  pending_review: ['cancelled'],
  paid: ['processing', 'cancelled', 'refunded'],
  processing: ['preparing', 'cancelled', 'refunded'],
  preparing: ['shipped', 'cancelled', 'refunded'],
  shipped: ['delivered', 'refunded'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
};

export async function fetchAdminPendingCounts(): Promise<{ pendingOrders: number; pendingReceipts: number }> {
  const [ordersRes, receiptsRes] = await Promise.all([
    supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["pending_review", "paid", "processing", "preparing"]),
    supabase.from("payment_receipts").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);
  return {
    pendingOrders: ordersRes.count ?? 0,
    pendingReceipts: receiptsRes.count ?? 0,
  };
}

export async function advanceOrderStatusTo(
  orderId: string,
  currentStatus: OrderStatus,
  targetStatus: OrderStatus,
  note: string,
  trackingCode: string,
): Promise<void> {
  const flow: OrderStatus[] = ["paid", "processing", "preparing", "shipped", "delivered"];
  const startIdx = flow.indexOf(currentStatus);
  const endIdx = flow.indexOf(targetStatus);
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    for (let i = startIdx + 1; i <= endIdx; i++) {
      const step = flow[i];
      const isLast = i === endIdx;
      await updateOrderStatus(
        orderId,
        step,
        isLast ? note : "",
        step === "shipped" ? (trackingCode.trim() || "ارسال به مشتری") : "",
      );
    }
  } else {
    await updateOrderStatus(orderId, targetStatus, note, trackingCode);
  }
}
