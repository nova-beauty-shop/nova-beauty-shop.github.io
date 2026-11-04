// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createTestCustomer, HAS_ADMIN_CREDENTIALS, signInAdmin, type TestCustomer } from './helpers';

const PAYMENT_BUCKET = 'payment-receipts';

interface Sellable {
  id: string;
  stock: number;
  variantId: string | null;
}

async function currentStock(client: SupabaseClient, productId: string): Promise<number> {
  const { data, error } = await client.from('products').select('stock').eq('id', productId).single();
  if (error) throw error;
  return data.stock;
}

async function placeTestOrder(customer: TestCustomer, product: Sellable, quantity: number): Promise<string> {
  const { data: address, error: addressError } = await customer.client
    .from('addresses')
    .insert({
      recipient_name: 'QA Tester',
      phone: '09123456789',
      province: 'Tehran',
      city: 'Tehran',
      street: 'Test street 42',
      postal_code: '1234567890',
    })
    .select('id')
    .single();
  if (addressError) throw addressError;

  const { data: orderId, error } = await customer.client.rpc('place_order', {
    p_address_id: address.id,
    p_delivery_method: 'post',
    p_items: [{ product_id: product.id, variant_id: product.variantId, quantity }],
    p_idempotency_key: `qa-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  });
  if (error) throw error;
  return String(orderId);
}

async function uploadAndSubmitReceipt(customer: TestCustomer, orderId: string): Promise<string> {
  const path = `${customer.userId}/${crypto.randomUUID()}.jpg`;
  const blob = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], { type: 'image/jpeg' });
  const upload = await customer.client.storage.from(PAYMENT_BUCKET).upload(path, blob, { contentType: 'image/jpeg' });
  if (upload.error) throw upload.error;
  const { error } = await customer.client.rpc('submit_card_receipt', { p_order_id: orderId, p_storage_path: path });
  if (error) throw error;
  return path;
}

describe.skipIf(!HAS_ADMIN_CREDENTIALS)('admin workflows (requires TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD)', () => {
  let admin: SupabaseClient;
  let customer: TestCustomer;
  let product: Sellable;
  const createdOrders: string[] = [];
  let originalPaymentSettings: { card_payment_enabled: boolean; instructions: string; payment_notice: string } | null = null;

  beforeAll(async () => {
    admin = await signInAdmin();
    customer = await createTestCustomer();
    const { data: anonProduct } = await customer.client
      .from('products')
      .select('id, stock, variants')
      .eq('is_active', true)
      .gte('stock', 3)
      .limit(1);
    const picked = anonProduct?.[0];
    if (!picked) throw new Error('no sellable product for admin tests');
    const variants = Array.isArray(picked.variants) ? picked.variants : [];
    product = {
      id: picked.id,
      stock: picked.stock,
      variantId: variants.length > 0 ? String((variants[0] as { id: string }).id) : null,
    };
    const { data } = await admin
      .from('payment_settings')
      .select('card_payment_enabled, instructions, payment_notice')
      .eq('id', 1)
      .single();
    originalPaymentSettings = data;
  });

  afterAll(async () => {
    for (const orderId of createdOrders) {
      await admin.rpc('admin_update_order_status', {
        p_order_id: orderId,
        p_new_status: 'cancelled',
        p_note: 'QA cleanup',
        p_tracking_code: null,
      });
    }
    if (originalPaymentSettings) {
      await admin.rpc('admin_update_payment_settings', {
        p_enabled: originalPaymentSettings.card_payment_enabled,
        p_instructions: originalPaymentSettings.instructions,
        p_notice: originalPaymentSettings.payment_notice,
      });
    }
  });

  it('identifies the signed-in user as an admin with a role', async () => {
    const { data, error } = await admin.rpc('admin_me');
    expect(error).toBeNull();
    expect(['owner', 'manager', 'reviewer']).toContain((data as { role: string }).role);
  });

  it('places an order, reserves stock, and restores it when cancelled', async () => {
    const before = await currentStock(admin, product.id);
    const orderId = await placeTestOrder(customer, product, 2);
    createdOrders.push(orderId);
    expect(await currentStock(admin, product.id)).toBe(before - 2);

    const { error } = await admin.rpc('admin_update_order_status', {
      p_order_id: orderId,
      p_new_status: 'cancelled',
      p_note: 'QA cancel test',
      p_tracking_code: null,
    });
    expect(error).toBeNull();
    expect(await currentStock(admin, product.id)).toBe(before);
  });

  it('rejects an order placed for more stock than is available', async () => {
    const { error } = await customer.client.rpc('place_order', {
      p_address_id: (await customer.client.from('addresses').select('id').limit(1).single()).data?.id,
      p_delivery_method: 'post',
      p_items: [{ product_id: product.id, variant_id: product.variantId, quantity: 20 }],
      p_idempotency_key: `qa-${Date.now()}-oversell`,
    });
    if (product.stock < 20) expect(error).not.toBeNull();
  });

  it('rejects an invalid status transition', async () => {
    const orderId = await placeTestOrder(customer, product, 1);
    createdOrders.push(orderId);
    const { error } = await admin.rpc('admin_update_order_status', {
      p_order_id: orderId,
      p_new_status: 'delivered',
      p_note: null,
      p_tracking_code: null,
    });
    expect(error).not.toBeNull();
  });

  it('approves a card receipt: order becomes paid and stock is not reserved twice', async () => {
    const before = await currentStock(admin, product.id);
    const orderId = await placeTestOrder(customer, product, 1);
    createdOrders.push(orderId);
    await admin.rpc('admin_update_payment_settings', {
      p_enabled: true,
      p_instructions: originalPaymentSettings?.instructions ?? '',
      p_notice: originalPaymentSettings?.payment_notice ?? '',
    });
    await uploadAndSubmitReceipt(customer, orderId);

    const { data: receipts } = await admin.from('payment_receipts').select('id').eq('order_id', orderId);
    const receiptId = receipts?.[0]?.id;
    expect(receiptId).toBeTruthy();
    const { error } = await admin.rpc('review_card_receipt', { p_receipt_id: receiptId, p_approve: true, p_note: null });
    expect(error).toBeNull();

    const { data: order } = await admin.from('orders').select('status').eq('id', orderId).single();
    expect(order?.status).toBe('paid');
    expect(await currentStock(admin, product.id)).toBe(before - 1);
  });

  it('rejects a card receipt: order is not marked paid', async () => {
    const orderId = await placeTestOrder(customer, product, 1);
    createdOrders.push(orderId);
    await uploadAndSubmitReceipt(customer, orderId);
    const { data: receipts } = await admin.from('payment_receipts').select('id').eq('order_id', orderId);
    const { error } = await admin.rpc('review_card_receipt', {
      p_receipt_id: receipts?.[0]?.id,
      p_approve: false,
      p_note: 'QA reject',
    });
    expect(error).toBeNull();
    const { data: order } = await admin.from('orders').select('status').eq('id', orderId).single();
    expect(order?.status).not.toBe('paid');
    const { data: receipt } = await admin.from('payment_receipts').select('status').eq('id', receipts?.[0]?.id).single();
    expect(receipt?.status).toBe('rejected');
  });

  it('blocks receipt submission when card payments are switched off (regression)', async () => {
    const orderId = await placeTestOrder(customer, product, 1);
    createdOrders.push(orderId);
    await admin.rpc('admin_update_payment_settings', {
      p_enabled: false,
      p_instructions: originalPaymentSettings?.instructions ?? '',
      p_notice: originalPaymentSettings?.payment_notice ?? '',
    });
    const path = `${customer.userId}/${crypto.randomUUID()}.jpg`;
    const blob = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' });
    await customer.client.storage.from(PAYMENT_BUCKET).upload(path, blob, { contentType: 'image/jpeg' });
    const { error } = await customer.client.rpc('submit_card_receipt', { p_order_id: orderId, p_storage_path: path });
    expect(error?.message ?? '').toContain('card_payment_disabled');
    await admin.storage.from(PAYMENT_BUCKET).remove([path]);
  });

  it('does not let a cancelled order become paid through a late receipt approval (regression)', async () => {
    const orderId = await placeTestOrder(customer, product, 1);
    createdOrders.push(orderId);
    await admin.rpc('admin_update_payment_settings', {
      p_enabled: true,
      p_instructions: originalPaymentSettings?.instructions ?? '',
      p_notice: originalPaymentSettings?.payment_notice ?? '',
    });
    await uploadAndSubmitReceipt(customer, orderId);
    await admin.rpc('admin_update_order_status', {
      p_order_id: orderId,
      p_new_status: 'cancelled',
      p_note: 'QA cancel with receipt',
      p_tracking_code: null,
    });
    const { data: receipts } = await admin.from('payment_receipts').select('id').eq('order_id', orderId);
    await admin.rpc('review_card_receipt', { p_receipt_id: receipts?.[0]?.id, p_approve: true, p_note: null });
    const { data: order } = await admin.from('orders').select('status').eq('id', orderId).single();
    expect(order?.status).toBe('cancelled');
  });

  it('refuses non-admin price or stock edits to catalog products', async () => {
    const { data: updated } = await customer.client
      .from('products')
      .update({ price_toman: 1 })
      .eq('id', product.id)
      .select('id');
    expect(updated ?? []).toHaveLength(0);
    const { data } = await admin.from('products').select('price_toman').eq('id', product.id).single();
    expect(data?.price_toman).not.toBe(1);
  });
});
