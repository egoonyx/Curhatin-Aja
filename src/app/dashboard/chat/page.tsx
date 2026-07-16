import { createClient } from "@/lib/supabase/server";
import NewDmButton from "@/components/NewDmButton";
import NewChannelButton from "@/components/NewChannelButton";
import type { Profile } from "@/lib/types";

export default async function ChatEmptyState() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profiles } = await supabase.from("profiles").select("*").order("full_name");

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-sky-100 px-4 sm:px-6">
        <label
          htmlFor="chat-list-toggle"
          className="cursor-pointer rounded-lg p-1 text-xl text-slate-500 hover:bg-sky-50 md:hidden"
          aria-label="Show conversations"
        >
          ☰
        </label>
        <p className="text-sm font-medium text-slate-500 md:hidden">Chats</p>
      </div>
      <div className="flex flex-1 items-center justify-center px-4 text-center">
        <div className="w-full max-w-xs">
          <p className="text-lg font-medium text-slate-600">Select a conversation</p>
          <p className="mt-1 text-sm text-slate-400">
            Or start a new direct message or channel below.
          </p>
          <div className="mt-4 space-y-2 text-left md:hidden">
            <NewDmButton profiles={(profiles as Profile[]) ?? []} currentUserId={user.id} />
            <NewChannelButton profiles={(profiles as Profile[]) ?? []} currentUserId={user.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
