"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";
import type { GalleryFile, Profile } from "@/lib/types";

export default function ShareFileModal({
  file,
  currentUserId,
  allProfiles,
  onClose,
}: {
  file: GalleryFile;
  currentUserId: string;
  allProfiles: Profile[];
  onClose: () => void;
}) {
  const [sharedIds, setSharedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("file_shares")
        .select("profile_id")
        .eq("file_id", file.id);
      setSharedIds((data ?? []).map((r) => r.profile_id));
      setLoading(false);
    }
    load();
  }, [file.id]);

  const filteredProfiles = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allProfiles
      .filter((p) => p.id !== file.uploaded_by)
      .filter((p) => !q || p.full_name.toLowerCase().includes(q));
  }, [allProfiles, query, file.uploaded_by]);

  async function toggleShare(profileId: string, isShared: boolean) {
    setSaving(profileId);
    const supabase = createClient();
    if (isShared) {
      await supabase
        .from("file_shares")
        .delete()
        .eq("file_id", file.id)
        .eq("profile_id", profileId);
      setSharedIds((prev) => prev.filter((id) => id !== profileId));
    } else {
      await supabase.from("file_shares").insert({
        file_id: file.id,
        profile_id: profileId,
        shared_by: currentUserId,
      });
      setSharedIds((prev) => [...prev, profileId]);
    }
    setSaving(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">
      <div className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-sky-50 p-4">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-slate-800">
              Share &quot;{file.file_name}&quot;
            </h2>
            <p className="text-xs text-slate-400">Anyone in your department already sees this.</p>
          </div>
          <button onClick={onClose} className="shrink-0 text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>

        <div className="border-b border-sky-50 p-3">
          <input
            className="input text-sm"
            placeholder="Search people..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <p className="p-3 text-sm text-slate-400">Loading...</p>
          ) : (
            <div className="space-y-1">
              {filteredProfiles.map((p) => {
                const isShared = sharedIds.includes(p.id);
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-2 rounded-xl px-2 py-2 hover:bg-sky-50"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Avatar name={p.full_name} url={p.avatar_url} size={28} />
                      <div className="min-w-0">
                        <p className="truncate text-sm text-slate-700">{p.full_name}</p>
                        <p className="truncate text-xs text-slate-400">{p.job_title}</p>
                      </div>
                    </div>
                    <button
                      disabled={saving === p.id}
                      onClick={() => toggleShare(p.id, isShared)}
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                        isShared
                          ? "bg-sky-500 text-white"
                          : "bg-sky-50 text-sky-700 hover:bg-sky-100"
                      }`}
                    >
                      {isShared ? "Shared" : "Share"}
                    </button>
                  </div>
                );
              })}
              {filteredProfiles.length === 0 && (
                <p className="p-3 text-sm text-slate-400">No one matches that search.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
