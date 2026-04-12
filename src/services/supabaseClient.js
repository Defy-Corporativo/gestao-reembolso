import { createClient } from '@supabase/supabase-js';

// Support both the standard Vite prefix and raw SUPABASE_* vars (see vite.config.js envPrefix)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL;
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase URL or Anon Key. Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.'
  );
}

// Use a dedicated storage key to avoid clashes with other Supabase clients in the same browser
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: 'sb-reembolso-auth',
  },
});
