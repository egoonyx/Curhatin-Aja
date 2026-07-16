"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";
import NotificationBell from "@/components/NotificationBell";
import type { Profile } from "@/lib/types";

export default function Topbar({ profile }: { profile: Profile }) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-sky-100 bg-white px-4 sm:px-6">
      <label
        htmlFor="sidebar-toggle"
        className="cursor-pointer rounded-lg p-2 text-xl text-slate-500 hover:bg-sky-50 lg:hidden"
        aria-label="Open menu"
      >
        ☰
      </label>
      <div className="flex items-center gap-2 sm:gap-4">
        <NotificationBell currentUserId={profile.id} />
        <Link
          href="/dashboard/profile"
          className="flex items-center gap-2 rounded-xl px-2 py-1 hover:bg-sky-50"
        >
          <Avatar name={profile.full_name} url={profile.avatar_url} size={32} />
          <div className="hidden text-left sm:block">
            <p className="text-sm font-medium leading-tight text-slate-800">
              {profile.full_name}
            </p>
            <p className="text-xs leading-tight text-slate-400">{profile.job_title}</p>
          </div>
        </Link>
        <button onClick={handleLogout} className="btn-ghost">
          Log out
        </button>
      </div>
    </header>
  );
}
