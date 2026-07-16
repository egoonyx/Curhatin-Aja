import { createClient } from "@/lib/supabase/server";
import ChatChannelList, { type ChatListItem } from "@/components/ChatChannelList";
import type { ChatChannel, Profile } from "@/lib/types";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: memberships }, { data: allProfiles }] = await Promise.all([
    supabase.from("chat_channel_members").select("channel_id").eq("profile_id", user.id),
    supabase.from("profiles").select("*").order("full_name"),
  ]);

  const channelIds = (memberships ?? []).map((m) => m.channel_id);

  const [{ data: channels }, { data: allMembers }] = await Promise.all([
    channelIds.length
      ? supabase
          .from("chat_channels")
          .select("*")
          .in("id", channelIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as ChatChannel[] }),
    channelIds.length
      ? supabase.from("chat_channel_members").select("channel_id, profiles(*)").in("channel_id", channelIds)
      : Promise.resolve({ data: [] as { channel_id: string; profiles: Profile }[] }),
  ]);

  const membersByChannel: Record<string, Profile[]> = {};
  for (const row of allMembers ?? []) {
    const profile = row.profiles as unknown as Profile;
    if (!profile) continue;
    if (!membersByChannel[row.channel_id]) membersByChannel[row.channel_id] = [];
    membersByChannel[row.channel_id].push(profile);
  }

  const items: ChatListItem[] = ((channels as ChatChannel[]) ?? []).map((c) => {
    if (c.is_dm) {
      const other = (membersByChannel[c.id] ?? []).find((p) => p.id !== user.id);
      return { id: c.id, label: other?.full_name ?? "Direct message", isDm: true };
    }
    return { id: c.id, label: c.name ?? "Untitled channel", isDm: false };
  });

  return (
    <div className="-m-6 flex h-[calc(100vh-4rem)]">
      <ChatChannelList
        items={items}
        profiles={(allProfiles as Profile[]) ?? []}
        currentUserId={user.id}
      />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
