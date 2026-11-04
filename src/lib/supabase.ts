import { createClient } from '@supabase/supabase-js';

// Public project URL and anon (publishable) key. These two values are safe to ship in the browser
// bundle: access is enforced by Row Level Security. They are used as a fallback so a manually
// uploaded `dist` folder always connects, even when the build had no .env file.
const FALLBACK_SUPABASE_URL = 'https://geigptbypnucbosuycwo.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY = 'sb_publishable_CpvxQnRzywcbCD-eNkkfVA_qTn047ce';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
