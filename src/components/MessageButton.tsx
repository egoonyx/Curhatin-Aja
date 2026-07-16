"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { findOrCreateDmChannel } from "@/lib/chat";

export default function MessageButton({
  currentUserId,
  targetUserId,
}: {
  currentUserId: string;
  targetUserId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const supabase = createClient();
    const channelId = await findOrCreateDmChannel(supabase, currentUserId, targetUserId);
    router.push(`/dashboard/chat/${channelId}`);
  }

  return (
    <button onClick={handleClick} disabled={loading} className="btn-primary">
      {loading ? "Opening..." : "💬 Message"}
    </button>
  );
}
