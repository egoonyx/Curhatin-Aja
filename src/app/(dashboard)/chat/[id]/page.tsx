import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ChatWindow from "@/components/ChatWindow";
import type { ChatChannel, ChatMessage, Profile } from "@/lib/types";

export default async function ChatChannelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: channel } = await supabase
    .from("chat_channels")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!channel) notFound();

  const [{ data: members }, { data: messages }, { data: allProfiles }] = await Promise.all([
    supabase.from("chat_channel_members").select("channel_id, profiles(*)").eq("channel_id", id),
    supabase
      .from("chat_messages")
      .select("*")
      .eq("channel_id", id)
      .order("created_at", { ascending: true })
      .limit(200),
    supabase.from("profiles").select("*"),
  ]);

  const memberProfiles = (members ?? [])
    .map((m) => m.profiles as unknown as Profile)
    .filter(Boolean);

  const isMember = memberProfiles.some((p) => p.id === user.id);
  if (!isMember) notFound();

  const title = (channel as ChatChannel).is_dm
    ? memberProfiles.find((p) => p.id !== user.id)?.full_name ?? "Direct message"
    : (channel as ChatChannel).name ?? "Channel";

  const profilesById = Object.fromEntries(
    ((allProfiles as Profile[]) ?? []).map((p) => [p.id, p])
  );

  return (
    <ChatWindow
      channelId={id}
      currentUserId={user.id}
      initialMessages={(messages as ChatMessage[]) ?? []}
      profilesById={profilesById}
      title={title}
    />
  );
}
