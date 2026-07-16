import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * If email confirmation is enabled in Supabase Auth, signUp() returns no
 * session and the profile row can't be inserted right away (RLS needs
 * auth.uid()). The remaining fields ride along in user_metadata and get
 * turned into a profiles row the first time the confirmed user logs in.
 */
export async function ensureProfile(supabase: SupabaseClient, user: User) {
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) return;

  const meta = user.user_metadata as Record<string, string | null> | undefined;
  if (!meta?.full_name || !meta?.job_title) return;

  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });

  await supabase.from("profiles").insert({
    id: user.id,
    email: user.email,
    full_name: meta.full_name,
    job_title: meta.job_title,
    job_desk: meta.job_desk ?? null,
    whatsapp: meta.whatsapp ?? null,
    department_id: meta.department_id ?? null,
    is_admin: (count ?? 0) === 0,
  });
}
