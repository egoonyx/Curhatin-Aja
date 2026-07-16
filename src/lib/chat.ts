import type { SupabaseClient } from "@supabase/supabase-js";

export async function findOrCreateDmChannel(
  supabase: SupabaseClient,
  meId: string,
  otherId: string
): Promise<string> {
  const [{ data: mine }, { data: theirs }] = await Promise.all([
    supabase.from("chat_channel_members").select("channel_id").eq("profile_id", meId),
    supabase.from("chat_channel_members").select("channel_id").eq("profile_id", otherId),
  ]);

  const mineIds = new Set((mine ?? []).map((r) => r.channel_id));
  const commonIds = (theirs ?? [])
    .map((r) => r.channel_id)
    .filter((id) => mineIds.has(id));

  if (commonIds.length > 0) {
    const { data: existingDm } = await supabase
      .from("chat_channels")
      .select("id")
      .in("id", commonIds)
      .eq("is_dm", true)
      .limit(1)
      .maybeSingle();

    if (existingDm) return existingDm.id;
  }

  const { data: newChannel, error } = await supabase
    .from("chat_channels")
    .insert({ is_dm: true, created_by: meId })
    .select()
    .single();

  if (error || !newChannel) throw error ?? new Error("Could not create conversation");

  await supabase.from("chat_channel_members").insert([
    { channel_id: newChannel.id, profile_id: meId },
    { channel_id: newChannel.id, profile_id: otherId },
  ]);

  return newChannel.id;
}
