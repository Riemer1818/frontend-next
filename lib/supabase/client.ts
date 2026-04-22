import { createBrowserClient } from '@supabase/ssr';
import { SupabaseClient } from '@supabase/supabase-js';

// In dev mode with bypass, use service role key to bypass RLS
// In production, use anon key with proper authentication
export function getSupabaseClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  }

  // DEV BYPASS: Use service role key to bypass RLS when auth is disabled
  const devBypass = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true';
  const supabaseKey = devBypass
    ? process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseKey) {
    throw new Error('Missing Supabase key');
  }

  if (devBypass) {
    console.log('🔓 DEV MODE: Using service role key to bypass RLS');
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKey
  );
}

export const supabase = getSupabaseClient();
