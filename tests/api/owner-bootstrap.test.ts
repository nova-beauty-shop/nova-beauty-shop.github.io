// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { createTestCustomer, newAnonClient } from './helpers';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? '';
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const BOOTSTRAP_URL = `${SUPABASE_URL}/functions/v1/owner-bootstrap`;

function serviceClient() {
  if (!SERVICE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY must be set in .env for server-side tests');
  return createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function callBootstrap(accessToken: string, body: Record<string, unknown>) {
  return fetch(BOOTSTRAP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      Apikey: ANON_KEY,
    },
    body: JSON.stringify(body),
  });
}

async function isBootstrapClosed(): Promise<boolean> {
  const customer = await createTestCustomer();
  const { data, error } = await customer.client.rpc('admin_bootstrap_status');
  if (error) throw error;
  return data === true;
}

describe('owner bootstrap: anonymous and customer access', () => {
  it('the old open claim function no longer exists', async () => {
    const { error } = await newAnonClient().rpc('claim_first_owner', { p_username: 'attacker_owner' });
    expect(error).not.toBeNull();
  });

  it('anonymous callers cannot execute the one-click claim RPC', async () => {
    const { error } = await newAnonClient().rpc('claim_initial_owner', { desired_username: 'attacker_owner' });
    expect(error?.code).toBe('42501');
  });

  it('a signed-in customer cannot claim ownership once the store has an owner', async () => {
    // On a brand-new store the one-click claim is open on purpose, so there is nothing to refuse yet.
    if (!(await isBootstrapClosed())) return;
    const customer = await createTestCustomer();
    const { error } = await customer.client.rpc('claim_initial_owner', { desired_username: 'customer_owner' });
    expect(error?.message ?? '').toMatch(/owner_exists|bootstrap_closed/);
  });

  it('anonymous callers cannot execute the bootstrap RPC', async () => {
    const { error } = await newAnonClient().rpc('bootstrap_first_owner', {
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_username: 'attacker_owner',
    });
    expect(error?.code).toBe('42501');
  });

  it('signed-in customers cannot execute the bootstrap RPC', async () => {
    const customer = await createTestCustomer();
    const { error } = await customer.client.rpc('bootstrap_first_owner', {
      p_user_id: customer.userId,
      p_username: 'customer_owner',
    });
    expect(error?.code).toBe('42501');
  });

  it('anonymous callers cannot read the bootstrap status', async () => {
    const { error } = await newAnonClient().rpc('admin_bootstrap_status');
    expect(error?.code).toBe('42501');
  });

  it('anonymous requests to the bootstrap function are rejected', async () => {
    const response = await fetch(BOOTSTRAP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON_KEY}`, Apikey: ANON_KEY },
      body: JSON.stringify({ username: 'attacker_owner', secret: 'guess' }),
    });
    expect(response.status).toBe(401);
  });

  it('a signed-in customer with a wrong or missing secret cannot become owner', async () => {
    const customer = await createTestCustomer();
    const session = (await customer.client.auth.getSession()).data.session;
    if (!session) throw new Error('customer session missing');
    const response = await callBootstrap(session.access_token, {
      username: 'customer_owner',
      secret: 'wrong-secret-value',
    });
    expect([403, 503]).toContain(response.status);
    const body = (await response.json()) as { ok?: boolean };
    expect(body.ok).toBeUndefined();
  });

  it('a customer cannot bootstrap without the secret even with a valid username', async () => {
    const customer = await createTestCustomer();
    const session = (await customer.client.auth.getSession()).data.session;
    if (!session) throw new Error('customer session missing');
    const response = await callBootstrap(session.access_token, { username: 'customer_owner' });
    expect(response.status).not.toBe(200);
  });

  it('the owner bootstrap ledger is not readable by anon or customers', async () => {
    const anon = await newAnonClient().from('owner_bootstrap').select('id');
    expect(anon.error?.code).toBe('42501');

    const customer = await createTestCustomer();
    const signedIn = await customer.client.from('owner_bootstrap').select('id');
    expect(signedIn.error?.code).toBe('42501');
  });

  it('a customer cannot add or promote an admin', async () => {
    const customer = await createTestCustomer();
    const { error } = await customer.client.rpc('admin_add_admin', {
      p_email: customer.email,
      p_username: 'self_promoted',
      p_role: 'owner',
    });
    expect(error).not.toBeNull();
    const { data } = await customer.client.rpc('admin_me');
    expect(data ?? []).toHaveLength(0);
  });
});

describe('owner bootstrap: one-time behaviour (runs only once the owner exists)', () => {
  it('repeated bootstrap calls are refused with bootstrap_closed', async (ctx) => {
    if (!(await isBootstrapClosed())) ctx.skip();
    const customer = await createTestCustomer();
    const { error } = await serviceClient().rpc('bootstrap_first_owner', {
      p_user_id: customer.userId,
      p_username: 'repeat_owner',
    });
    expect(error?.message).toContain('bootstrap_closed');
  });

  it('concurrent bootstrap calls cannot create a second owner', async (ctx) => {
    if (!(await isBootstrapClosed())) ctx.skip();
    const customers = await Promise.all([createTestCustomer(), createTestCustomer(), createTestCustomer()]);
    const results = await Promise.all(
      customers.map((customer, index) =>
        serviceClient().rpc('bootstrap_first_owner', {
          p_user_id: customer.userId,
          p_username: `race_owner_${index}`,
        }),
      ),
    );
    for (const result of results) expect(result.error?.message).toContain('bootstrap_closed');
    const { count } = await serviceClient().from('admin_users').select('user_id', { count: 'exact', head: true });
    expect(count).toBe(1);
  });

  it('the bootstrap status reports closed to signed-in users only', async (ctx) => {
    if (!(await isBootstrapClosed())) ctx.skip();
    const customer = await createTestCustomer();
    const { data, error } = await customer.client.rpc('admin_bootstrap_status');
    expect(error).toBeNull();
    expect(data).toBe(true);
  });
});
