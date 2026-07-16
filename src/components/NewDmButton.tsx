"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { findOrCreateDmChannel } from "@/lib/chat";
import type { Profile } from "@/lib/types";

export default function NewDmButton({
  profiles,
  currentUserId,
}: {
  profiles: Profile[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handlePick(otherId: string) {
    setLoading(true);
    const supabase = createClient();
    const channelId = await findOrCreateDmChannel(supabase, currentUserId, otherId);
    setLoading(false);
    setOpen(false);
    router.push(`/dashboard/chat/${channelId}`);
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="btn-secondary w-full text-sm">
        + Direct message
      </button>
      {open && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-sky-100 bg-white p-1 shadow-lg">
          {profiles
            .filter((p) => p.id !== currentUserId)
            .map((p) => (
              <button
                key={p.id}
                disabled={loading}
                onClick={() => handlePick(p.id)}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-sky-50"
              >
                {p.full_name}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
