"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

export default function NewChannelButton({
  profiles,
  currentUserId,
}: {
  profiles: Profile[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  function toggle(id: string) {
    setMemberIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleCreate() {
    if (!name.trim()) return;
    setLoading(true);
    const supabase = createClient();

    const { data: channel, error } = await supabase
      .from("chat_channels")
      .insert({ name: name.trim(), is_dm: false, created_by: currentUserId })
      .select()
      .single();

    if (error || !channel) {
      setLoading(false);
      return;
    }

    const members = [...new Set([currentUserId, ...memberIds])];
    await supabase
      .from("chat_channel_members")
      .insert(members.map((profile_id) => ({ channel_id: channel.id, profile_id })));

    setLoading(false);
    setOpen(false);
    setName("");
    setMemberIds([]);
    router.push(`/dashboard/chat/${channel.id}`);
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-secondary w-full text-sm">
        + New channel
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">New channel</h2>
            <label className="label">Channel name</label>
            <input
              className="input mb-4"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Marketing x Product launch"
            />
            <label className="label">Members</label>
            <div className="mb-4 max-h-48 space-y-1 overflow-y-auto rounded-xl border border-sky-100 p-2">
              {profiles
                .filter((p) => p.id !== currentUserId)
                .map((p) => (
                  <label
                    key={p.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-sky-50"
                  >
                    <input
                      type="checkbox"
                      checked={memberIds.includes(p.id)}
                      onChange={() => toggle(p.id)}
                    />
                    <span className="text-sm text-slate-700">{p.full_name}</span>
                    <span className="text-xs text-slate-400">{p.job_title}</span>
                  </label>
                ))}
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button className="btn-primary" disabled={loading} onClick={handleCreate}>
                {loading ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
