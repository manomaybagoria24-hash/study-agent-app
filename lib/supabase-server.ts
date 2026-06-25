import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseServer: SupabaseClient | null = null;

export function getSupabaseServer() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return null;
  }

  if (!supabaseServer) {
    supabaseServer = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
      },
    });
  }

  return supabaseServer;
}
