// Service-role Supabase client for code that runs with no signed-in user at
// all - currently just the attendance-reminder cron route. This bypasses RLS
// entirely, so it must never be exposed to anything a browser can reach.
// Requires SUPABASE_SERVICE_ROLE_KEY (from Supabase dashboard -> Project
// Settings -> API -> service_role key - keep this out of any client bundle).

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function isAdminClientConfigured() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
