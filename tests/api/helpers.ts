import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';

config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });

const url = process.env.VITE_SUPABASE_URL ?? '';
const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? '';

export const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
export const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';
export const HAS_ADMIN_CREDENTIALS = ADMIN_EMAIL !== '' && ADMIN_PASSWORD !== '';

export function newAnonClient(): SupabaseClient {
  if (!url || !anonKey) throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env');
  return createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export interface TestCustomer {
  client: SupabaseClient;
  userId: string;
  email: string;
}

export async function createTestCustomer(): Promise<TestCustomer> {
  const client = newAnonClient();
  const email = `qa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const password = `QaPass-${Math.random().toString(36).slice(2, 12)}-1`;
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) throw new Error(`signUp failed: ${error.message}`);
  if (!data.user || !data.session) throw new Error('signUp did not return a session; email confirmation must be off');
  return { client, userId: data.user.id, email };
}

export async function signInAdmin(): Promise<SupabaseClient> {
  const client = newAnonClient();
  const { error } = await client.auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  if (error) throw new Error(`admin sign-in failed: ${error.message}`);
  return client;
}
