"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import NewDmButton from "@/components/NewDmButton";
import NewChannelButton from "@/components/NewChannelButton";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";

export type ChatListItem = {
  id: string;
  label: string;
  isDm: boolean;
};

export default function ChatChannelList({
  items,
  profiles,
  currentUserId,
}: {
  items: ChatListItem[];
  profiles: Profile[];
  currentUserId: string;
}) {
  const pathname = usePathname();
  const channels = items.filter((i) => !i.isDm);
  const dms = items.filter((i) => i.isDm);

  return (
    <div
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex h-full w-64 -translate-x-full shrink-0 flex-col gap-4",
        "border-r border-sky-100 bg-white p-4 transition-transform duration-200 ease-in-out",
        "peer-checked/chat:translate-x-0",
        "md:static md:translate-x-0"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <NewDmButton profiles={profiles} currentUserId={currentUserId} />
          <NewChannelButton profiles={profiles} currentUserId={currentUserId} />
        </div>
        <label
          htmlFor="chat-list-toggle"
          className="cursor-pointer rounded-lg p-1 text-slate-400 hover:bg-sky-50 hover:text-sky-700 md:hidden"
          aria-label="Close conversations"
        >
          ✕
        </label>
      </div>

      <div>
        <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Channels
        </p>
        <div className="space-y-0.5">
          {channels.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/chat/${c.id}`}
              className={cn(
                "block truncate rounded-lg px-3 py-1.5 text-sm",
                pathname === `/dashboard/chat/${c.id}`
                  ? "bg-sky-500 text-white"
                  : "text-slate-600 hover:bg-sky-50"
              )}
            >
              # {c.label}
            </Link>
          ))}
          {channels.length === 0 && (
            <p className="px-2 text-xs text-slate-400">No channels yet.</p>
          )}
        </div>
      </div>

      <div>
        <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Direct messages
        </p>
        <div className="space-y-0.5">
          {dms.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/chat/${c.id}`}
              className={cn(
                "block truncate rounded-lg px-3 py-1.5 text-sm",
                pathname === `/dashboard/chat/${c.id}`
                  ? "bg-sky-500 text-white"
                  : "text-slate-600 hover:bg-sky-50"
              )}
            >
              {c.label}
            </Link>
          ))}
          {dms.length === 0 && (
            <p className="px-2 text-xs text-slate-400">No conversations yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
