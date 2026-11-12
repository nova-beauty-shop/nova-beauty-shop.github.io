import { supabase } from '@/lib/supabase';

export type DeliveryMethod = 'courier' | 'post';

export type OrderStatus =
  | 'awaiting_payment'
  | 'pending_review'
  | 'paid'
  | 'processing'
  | 'preparing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export interface OrderItem {
  id: string;
  productName: string;
  brand: string;
  variantLabel: string | null;
  unitPriceToman: number;
  quantity: number;
  lineTotalToman: number;
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  deliveryMethod: DeliveryMethod;
  subtotalToman: number;
  deliveryFeeToman: number;
  totalToman: number;
  createdAt: string;
}

export interface OrderDetail extends OrderSummary {
  recipientName: string;
  phone: string;
  province: string;
  city: string;
  street: string;
  postalCode: string;
  items: OrderItem[];
  paymentProvider: string | null;
  paymentInstallments: 1 | 4 | null;
  paymentReference: string | null;
}

export interface PlaceOrderInput {
  addressId: string;
  deliveryMethod: DeliveryMethod;
  items: { productId: string; variantId: string; quantity: number }[];
  idempotencyKey: string;
  deliverySlot: string | null;
  couponCode: string | null;
  freeSampleId: string | null;
}

export class OrderError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

const ORDER_SELECT =
  'id, order_number, status, delivery_method, subtotal_toman, delivery_fee_toman, total_toman, created_at, recipient_name, phone, province, city, street, postal_code, payment_provider, payment_installments, payment_reference, items:order_items(id, product_name, brand, variant_label, unit_price_toman, quantity, line_total_toman)';

type Row = Record<string, unknown>;

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asNumber(value: unknown): number {
  return typeof value === 'number' ? value : Number(value ?? 0);
}

function toSummary(row: Row): OrderSummary {
  return {
    id: asString(row.id),
    orderNumber: asString(row.order_number),
    status: asString(row.status) as OrderStatus,
    deliveryMethod: asString(row.delivery_method) as DeliveryMethod,
    subtotalToman: asNumber(row.subtotal_toman),
    deliveryFeeToman: asNumber(row.delivery_fee_toman),
    totalToman: asNumber(row.total_toman),
    createdAt: asString(row.created_at),
  };
}

function toDetail(row: Row): OrderDetail {
  const rawItems = Array.isArray(row.items) ? (row.items as Row[]) : [];
  return {
    ...toSummary(row),
    recipientName: asString(row.recipient_name),
    phone: asString(row.phone),
    province: asString(row.province),
    city: asString(row.city),
    street: asString(row.street),
    postalCode: asString(row.postal_code),
    paymentProvider: typeof row.payment_provider === 'string' ? row.payment_provider : null,
    paymentInstallments: row.payment_installments === 4 ? 4 : row.payment_installments === 1 ? 1 : null,
    paymentReference: typeof row.payment_reference === 'string' ? row.payment_reference : null,
    items: rawItems.map((item) => ({
      id: asString(item.id),
      productName: asString(item.product_name),
      brand: asString(item.brand),
      variantLabel: typeof item.variant_label === 'string' ? item.variant_label : null,
      unitPriceToman: asNumber(item.unit_price_toman),
      quantity: asNumber(item.quantity),
      lineTotalToman: asNumber(item.line_total_toman),
    })),
  };
}

export async function placeOrder(input: PlaceOrderInput): Promise<string> {
  const { data, error } = await supabase.rpc('place_order_v2', {
    p_address_id: input.addressId,
    p_delivery_method: input.deliveryMethod || "post",
    p_items: input.items.map((item) => ({
      product_id: item.productId,
      variant_id: item.variantId,
      quantity: item.quantity,
    })),
    p_idempotency_key: input.idempotencyKey,
    p_delivery_slot: input.deliverySlot ?? null,
    p_coupon_code: input.couponCode,
    p_free_sample_id: input.freeSampleId,
  });

  if (error) {
    console.error('place order failed', error);
    throw new OrderError(error.message.trim());
  }
  if (typeof data !== 'string') throw new OrderError('unexpected_response');
  return data;
}

export async function fetchOrders(): Promise<OrderSummary[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_number, status, delivery_method, subtotal_toman, delivery_fee_toman, total_toman, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error('unexpected orders response');
  return data.map((row) => toSummary(row as Row));
}

export async function fetchOrder(id: string): Promise<OrderDetail | null> {
  const { data, error } = await supabase.from('orders').select(ORDER_SELECT).eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return toDetail(data as unknown as Row);
}

export const fetchUserOrders = fetchOrders;
