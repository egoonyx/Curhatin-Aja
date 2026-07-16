import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types";

export async function fetchAssigneesMap(
  supabase: SupabaseClient,
  taskIds: string[]
): Promise<Record<string, Profile[]>> {
  if (taskIds.length === 0) return {};

  const { data } = await supabase
    .from("task_assignees")
    .select("task_id, profiles(*)")
    .in("task_id", taskIds);

  const map: Record<string, Profile[]> = {};
  for (const row of data ?? []) {
    const profile = row.profiles as unknown as Profile;
    if (!profile) continue;
    if (!map[row.task_id]) map[row.task_id] = [];
    map[row.task_id].push(profile);
  }
  return map;
}
