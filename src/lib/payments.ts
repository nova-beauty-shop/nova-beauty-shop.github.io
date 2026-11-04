import { supabase } from '@/lib/supabase';
import type { OrderStatus } from '@/lib/orders';

export const RECEIPT_BUCKET = 'payment-receipts';
export const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;
export const RECEIPT_MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export class PaymentError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

export type ReceiptStatus = 'pending' | 'approved' | 'rejected';

export interface PaymentSettings {
  cardPaymentEnabled: boolean;
  bankName: string;
  cardNumber: string;
  accountHolder: string;
  accountNumber: string;
  iban: string;
  instructions: string;
  paymentNotice: string;
}

export interface Receipt {
  id: string;
  orderId: string;
  storagePath: string;
  amountToman: number;
  status: ReceiptStatus;
  reviewNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  payerName: string | null;
  cardLast4: string | null;
  bankName: string | null;
  trackingCode: string | null;
}

export interface ReceiptDetails {
  payerName: string;
  cardLast4: string;
  bankName: string;
  trackingCode: string;
}

export interface ReceiptRecord extends Receipt {
  orderNumber: string;
  recipientName: string;
  orderStatus: OrderStatus | '';
}

type Row = Record<string, unknown>;

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asNumber(value: unknown): number {
  return typeof value === 'number' ? value : Number(value ?? 0);
}

function toReceipt(row: Row): Receipt {
  return {
    id: asString(row.id),
    orderId: asString(row.order_id),
    storagePath: asString(row.storage_path),
    amountToman: asNumber(row.amount_toman),
    status: asString(row.status) as ReceiptStatus,
    reviewNote: typeof row.review_note === 'string' ? row.review_note : null,
    createdAt: asString(row.created_at),
    reviewedAt: typeof row.reviewed_at === 'string' ? row.reviewed_at : null,
    payerName: typeof row.payer_name === 'string' ? row.payer_name : null,
    cardLast4: typeof row.card_last4 === 'string' ? row.card_last4 : null,
    bankName: typeof row.bank_name === 'string' ? row.bank_name : null,
    trackingCode: typeof row.tracking_code === 'string' ? row.tracking_code : null,
  };
}

const RECEIPT_COLUMNS =
  'id, order_id, storage_path, amount_toman, status, review_note, created_at, reviewed_at, payer_name, card_last4, bank_name, tracking_code';

export async function fetchPaymentSettings(): Promise<PaymentSettings | null> {
  const { data, error } = await supabase
    .from('payment_settings')
    .select('card_payment_enabled, bank_name, card_number, account_holder, account_number, iban, instructions, payment_notice')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as Row;
  return {
    cardPaymentEnabled: row.card_payment_enabled === true,
    bankName: asString(row.bank_name),
    cardNumber: asString(row.card_number),
    accountHolder: asString(row.account_holder),
    accountNumber: asString(row.account_number),
    iban: asString(row.iban),
    instructions: asString(row.instructions),
    paymentNotice: asString(row.payment_notice),
  };
}

export async function fetchOrderReceipts(orderId: string): Promise<Receipt[]> {
  const { data, error } = await supabase
    .from('payment_receipts')
    .select(RECEIPT_COLUMNS)
    .eq('order_id', orderId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error('unexpected receipts response');
  return data.map((row) => toReceipt(row as Row));
}

export async function uploadReceipt(orderId: string, userId: string, file: File, details: ReceiptDetails): Promise<void> {
  const extension = RECEIPT_MIME_EXTENSIONS[file.type];
  if (!extension) throw new Error('unsupported_file_type');
  if (file.size > RECEIPT_MAX_BYTES) throw new Error('file_too_large');

  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from(RECEIPT_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) throw uploadError;

  const { error } = await supabase.rpc('submit_card_receipt', {
    p_order_id: orderId,
    p_storage_path: path,
    p_payer_name: details.payerName,
    p_card_last4: details.cardLast4,
    p_bank_name: details.bankName,
    p_tracking_code: details.trackingCode,
  });
  if (error) {
    await supabase.storage.from(RECEIPT_BUCKET).remove([path]);
    throw new PaymentError(error.message.trim());
  }
}

export async function startOnlinePayment(orderId: string, provider: string, installments: 1 | 4): Promise<void> {
  const { error } = await supabase.rpc('start_online_payment', {
    p_order_id: orderId,
    p_provider: provider,
    p_installments: installments,
  });
  if (error) throw new PaymentError(error.message.trim());
}

export async function completeOnlinePayment(orderId: string): Promise<string> {
  const { data, error } = await supabase.rpc('complete_online_payment', { p_order_id: orderId });
  if (error) throw new PaymentError(error.message.trim());
  if (typeof data !== 'string' || data.length === 0) throw new PaymentError('unexpected_response');
  return data;
}

export async function fetchIsAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_admin');
  if (error) throw error;
  return data === true;
}

export async function fetchReceiptRecords(status: ReceiptStatus | null): Promise<ReceiptRecord[]> {
  let query = supabase
    .from('payment_receipts')
    .select(`${RECEIPT_COLUMNS}, order:orders(order_number, recipient_name, status)`);
  if (status) query = query.eq('status', status);
  const { data, error } = await query.order('created_at', { ascending: status === 'pending' }).limit(200);
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error('unexpected receipts response');
  return data.map((raw) => {
    const row = raw as Row;
    const order = (Array.isArray(row.order) ? row.order[0] : row.order) as Row | null | undefined;
    return {
      ...toReceipt(row),
      orderNumber: asString(order?.order_number),
      recipientName: asString(order?.recipient_name),
      orderStatus: asString(order?.status) as OrderStatus | '',
    };
  });
}

export async function createReceiptUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from(RECEIPT_BUCKET).createSignedUrl(storagePath, 300);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error('unexpected signed url response');
  return data.signedUrl;
}

export async function reviewReceipt(receiptId: string, approve: boolean, note: string): Promise<void> {
  const { error } = await supabase.rpc('review_card_receipt', {
    p_receipt_id: receiptId,
    p_approve: approve,
    p_note: note.trim() || null,
  });
  if (error) throw new PaymentError(error.message.trim());
}
