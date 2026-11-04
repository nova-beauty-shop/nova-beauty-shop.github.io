import { supabase } from '@/lib/supabase';

export interface Address {
  id: string;
  recipientName: string;
  phone: string;
  province: string;
  city: string;
  street: string;
  postalCode: string;
}

export interface AddressInput {
  recipientName: string;
  phone: string;
  province: string;
  city: string;
  street: string;
  postalCode: string;
}

interface AddressRow {
  id: string;
  recipient_name: string;
  phone: string;
  province: string;
  city: string;
  street: string;
  postal_code: string;
}

function isAddressRow(value: unknown): value is AddressRow {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Record<string, unknown>;
  return ['id', 'recipient_name', 'phone', 'province', 'city', 'street', 'postal_code'].every(
    (key) => typeof row[key] === 'string',
  );
}

export async function fetchAddresses(): Promise<Address[]> {
  const { data, error } = await supabase
    .from('addresses')
    .select('id, recipient_name, phone, province, city, street, postal_code')
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!Array.isArray(data) || !data.every(isAddressRow)) throw new Error('unexpected addresses response');

  return data.map((row) => ({
    id: row.id,
    recipientName: row.recipient_name,
    phone: row.phone,
    province: row.province,
    city: row.city,
    street: row.street,
    postalCode: row.postal_code,
  }));
}

export async function createAddress(input: AddressInput): Promise<void> {
  const { error } = await supabase.from('addresses').insert({
    recipient_name: input.recipientName,
    phone: input.phone,
    province: input.province,
    city: input.city,
    street: input.street,
    postal_code: input.postalCode,
  });
  if (error) throw error;
}

export async function deleteAddress(id: string): Promise<void> {
  const { error } = await supabase.from('addresses').delete().eq('id', id);
  if (error) throw error;
}
