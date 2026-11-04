// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createTestCustomer, newAnonClient, type TestCustomer } from './helpers';

const ADMIN_RPC_CALLS: { name: string; args: Record<string, unknown> }[] = [
  { name: 'admin_me', args: {} },
  { name: 'admin_list_admins', args: {} },
  { name: 'admin_list_customers', args: { p_search: '', p_offset: 0, p_limit: 5 } },
  { name: 'admin_get_customer', args: { p_customer_id: '00000000-0000-0000-0000-000000000000' } },
  { name: 'admin_update_customer', args: { p_customer_id: '00000000-0000-0000-0000-000000000000', p_blocked: true, p_note: 'x' } },
  { name: 'admin_update_order_status', args: { p_order_id: '00000000-0000-0000-0000-000000000000', p_new_status: 'paid', p_note: null, p_tracking_code: null } },
  { name: 'review_card_receipt', args: { p_receipt_id: '00000000-0000-0000-0000-000000000000', p_approve: true, p_note: null } },
  { name: 'admin_update_store_settings', args: { p_store_name: 'x', p_support_phone: '', p_support_email: '', p_address: '', p_courier_fee_toman: 0, p_courier_free_threshold_toman: 0, p_post_fee_toman: 0 } },
  { name: 'admin_update_payment_settings', args: { p_enabled: false, p_instructions: '', p_notice: '' } },
  { name: 'admin_update_payment_gateway', args: { p_provider: 'none', p_mode: 'sandbox' } },
  { name: 'admin_update_bank_card', args: { p_bank_name: 'x', p_card_number: '', p_account_holder: '', p_account_number: '', p_iban: '' } },
  { name: 'admin_add_admin', args: { p_email: 'nobody@example.com', p_username: 'qa_nobody', p_role: 'reviewer' } },
  { name: 'admin_remove_admin', args: { p_user_id: '00000000-0000-0000-0000-000000000000' } },
  { name: 'admin_upsert_info_page', args: { p_slug: 'about', p_title: 'x', p_lead: '', p_sections: [], p_seo_title: '', p_seo_description: '', p_status: 'draft' } },
];

describe('anonymous visitor', () => {
  const anon = newAnonClient();

  it('cannot read profiles or admin_users', async () => {
    const profiles = await anon.from('profiles').select('id');
    expect(profiles.data ?? []).toHaveLength(0);
    const admins = await anon.from('admin_users').select('user_id');
    expect(admins.data ?? []).toHaveLength(0);
  });

  it('cannot read orders or receipts', async () => {
    const orders = await anon.from('orders').select('id');
    expect(orders.data ?? []).toHaveLength(0);
    const receipts = await anon.from('payment_receipts').select('id');
    expect(receipts.data ?? []).toHaveLength(0);
  });

  it('cannot write products, categories, banners or stories', async () => {
    const insert = await anon.from('products').insert({ slug: 'qa-anon', name: 'x', price_toman: 1 });
    expect(insert.error).not.toBeNull();
    const update = await anon.from('products').update({ stock: 999 }).eq('slug', 'nonexistent-qa').select('id');
    expect(update.data ?? []).toHaveLength(0);
    const del = await anon.from('categories').delete().eq('slug', 'nonexistent-qa').select('id');
    expect(del.data ?? []).toHaveLength(0);
  });

  it('admin_me is not executable by a visitor', async () => {
    const { data, error } = await anon.rpc('admin_me');
    expect(error?.code).toBe('42501');
    expect(data ?? null).toBeNull();
  });

  it.each(ADMIN_RPC_CALLS.filter((call) => call.name !== 'admin_me').map((call) => call.name))('cannot execute %s', async (name) => {
    const call = ADMIN_RPC_CALLS.find((item) => item.name === name);
    if (!call) throw new Error(`unknown call ${name}`);
    const { data, error } = await anon.rpc(call.name, call.args);
    expect(error).not.toBeNull();
    expect(data ?? null).toBeNull();
  });

  it('cannot execute the order trigger function through the API (regression)', async () => {
    const { error } = await anon.rpc('prevent_blocked_customer_orders');
    expect(error).not.toBeNull();
  });

  it('cannot upload to the receipt bucket without signing in', async () => {
    const blob = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' });
    const { error } = await anon.storage.from('payment-receipts').upload(`anon/${Date.now()}.jpg`, blob);
    expect(error).not.toBeNull();
  });
});

describe('signed-in customer', () => {
  let customer: TestCustomer;
  let client: SupabaseClient;

  beforeAll(async () => {
    customer = await createTestCustomer();
    client = customer.client;
  });

  it('admin_me returns no admin row to a customer', async () => {
    const { data, error } = await client.rpc('admin_me');
    expect(error ?? null).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it.each(ADMIN_RPC_CALLS.filter((call) => call.name !== 'admin_me').map((call) => call.name))('is refused admin RPC %s', async (name) => {
    const call = ADMIN_RPC_CALLS.find((item) => item.name === name);
    if (!call) throw new Error(`unknown call ${name}`);
    const { data, error } = await client.rpc(call.name, call.args);
    expect(error).not.toBeNull();
    expect(data ?? null).toBeNull();
  });

  it('reports itself as a non-admin', async () => {
    const { data } = await client.rpc('is_admin');
    expect(data).toBe(false);
  });

  it('can read and update its own name and phone', async () => {
    const read = await client.from('profiles').select('id, full_name, phone').eq('id', customer.userId).single();
    expect(read.error).toBeNull();
    const update = await client
      .from('profiles')
      .update({ full_name: 'QA Customer', phone: '09120000000', updated_at: new Date().toISOString() })
      .eq('id', customer.userId)
      .select('full_name');
    expect(update.error).toBeNull();
    expect(update.data?.[0]?.full_name).toBe('QA Customer');
  });

  it('cannot unblock itself by writing is_blocked (regression: column grants)', async () => {
    const { error } = await client.from('profiles').update({ is_blocked: false }).eq('id', customer.userId);
    expect(error).not.toBeNull();
  });

  it('cannot read or write admin_note (regression: column grants)', async () => {
    const read = await client.from('profiles').select('admin_note').eq('id', customer.userId);
    expect(read.error).not.toBeNull();
    const write = await client.from('profiles').update({ admin_note: 'x' }).eq('id', customer.userId);
    expect(write.error).not.toBeNull();
  });

  it('cannot change another customer profile', async () => {
    const other = await createTestCustomer();
    await client.from('profiles').update({ full_name: 'Hijacked' }).eq('id', other.userId);
    const { data } = await other.client.from('profiles').select('full_name').eq('id', other.userId);
    expect(data?.[0]?.full_name).not.toBe('Hijacked');
  });

  it('cannot place an order with an address that is not theirs', async () => {
    const other = await createTestCustomer();
    const { data: addr, error: addrError } = await other.client
      .from('addresses')
      .insert({
        recipient_name: 'Other Person',
        phone: '09121111111',
        province: 'Tehran',
        city: 'Tehran',
        street: 'Test street 1',
        postal_code: '1234567890',
      })
      .select('id')
      .single();
    expect(addrError).toBeNull();
    const { error } = await client.rpc('place_order', {
      p_address_id: addr?.id,
      p_delivery_method: 'post',
      p_items: [{ product_id: '00000000-0000-0000-0000-000000000000', variant_id: null, quantity: 1 }],
      p_idempotency_key: `qa-${Date.now()}-foreign`,
    });
    expect(error).not.toBeNull();
  });

  it('rejects an order with an invalid delivery method, quantity or empty items', async () => {
    const bad = [
      { p_address_id: null, p_delivery_method: 'drone', p_items: [{ product_id: null, variant_id: null, quantity: 1 }] },
      { p_address_id: null, p_delivery_method: 'post', p_items: [] },
    ];
    for (const args of bad) {
      const { error } = await client.rpc('place_order', { ...args, p_idempotency_key: `qa-${Date.now()}-${Math.random()}` });
      expect(error).not.toBeNull();
    }
  });

  it('cannot submit a receipt for an order it does not own', async () => {
    const { error } = await client.rpc('submit_card_receipt', {
      p_order_id: '00000000-0000-0000-0000-000000000000',
      p_storage_path: `${customer.userId}/fake.jpg`,
    });
    expect(error).not.toBeNull();
  });

  it('cannot upload a receipt into another customer folder', async () => {
    const blob = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' });
    const { error } = await client.storage
      .from('payment-receipts')
      .upload(`00000000-0000-0000-0000-000000000001/${Date.now()}.jpg`, blob);
    expect(error).not.toBeNull();
  });

  it('cannot write catalog data', async () => {
    const insert = await client.from('products').insert({ slug: 'qa-customer', name: 'x', price_toman: 1 });
    expect(insert.error).not.toBeNull();
    const update = await client.from('store_settings').update({ store_name: 'x' }).eq('id', 1).select('id');
    expect(update.data ?? []).toHaveLength(0);
  });

  it('cannot see other customers orders', async () => {
    const { data } = await client.from('orders').select('id').neq('user_id', customer.userId);
    expect(data ?? []).toHaveLength(0);
  });
});
