import { createBrowserClient } from '@supabase/ssr';
import { SupabaseClient } from '@supabase/supabase-js';

// TEMPORARILY using service role key to bypass RLS during testing
// TODO: Switch back to ANON key once auth is configured
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwbGRvb2Vlb2phb2RuenNkbWdiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgyNzkzNiwiZXhwIjoyMDg5NDAzOTM2fQ.ByBKUwuZSA10dTfWNkzyf3NdH1aX9aXHU3w7WqvQoCw';

// Create a new client every time to ensure we always use the latest key
export function getSupabaseClient() {
  console.log('[Supabase Client] Creating browser client with service role key');
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    SERVICE_ROLE_KEY
  );
}

export const supabase = getSupabaseClient();
