import { supabase } from '@/lib/supabase';

export interface Profile {
  fullName: string;
  phone: string;
}

export async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('full_name, phone')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('profile fetch failed', error);
    throw new Error('profile fetch failed');
  }
  return { fullName: data?.full_name ?? '', phone: data?.phone ?? '' };
}

export async function updateProfile(userId: string, profile: Profile): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ full_name: profile.fullName, phone: profile.phone || null, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    console.error('profile update failed', error);
    throw new Error('profile update failed');
  }
}
