"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";
import { formatDateTime } from "@/lib/utils";
import type { Profile, TaskAttachment } from "@/lib/types";

export default function TaskAttachments({
  taskId,
  currentUserId,
  attachments,
  canDelete,
  profilesById,
}: {
  taskId: string;
  currentUserId: string;
  attachments: TaskAttachment[];
  /** Admins/task creator can delete anyone's file; everyone can delete their own. */
  canDelete: boolean;
  profilesById: Record<string, Profile>;
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    const supabase = createClient();

    const path = `${taskId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("task-attachments")
      .upload(path, file);

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const fileUrl = supabase.storage.from("task-attachments").getPublicUrl(path).data
      .publicUrl;

    await supabase.from("task_attachments").insert({
      task_id: taskId,
      uploaded_by: currentUserId,
      file_url: fileUrl,
      file_name: file.name,
    });

    setUploading(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("task_attachments").delete().eq("id", id);
    router.refresh();
  }

  return (
    <div className="card p-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">Related files</h2>
        <label className="relative cursor-pointer text-xs font-medium text-sky-600 hover:underline">
          {uploading ? "Uploading..." : "+ Add file"}
          <input type="file" className="sr-only" disabled={uploading} onChange={handleUpload} />
        </label>
      </div>

      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      {attachments.length === 0 ? (
        <p className="text-sm text-slate-400">No files attached yet.</p>
      ) : (
        <div className="space-y-2">
          {attachments.map((a) => {
            const uploader = a.uploaded_by ? profilesById[a.uploaded_by] : null;
            const canDeleteThis = canDelete || a.uploaded_by === currentUserId;
            return (
              <div
                key={a.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-sky-100 px-3 py-2"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Avatar name={uploader?.full_name ?? "?"} url={uploader?.avatar_url} size={24} />
                  <div className="min-w-0">
                    <a
                      href={a.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex min-w-0 items-center gap-1 truncate text-sm text-sky-600 hover:underline"
                    >
                      <span>📎</span>
                      <span className="truncate">{a.file_name}</span>
                    </a>
                    <p className="truncate text-xs text-slate-400">
                      {uploader?.full_name ?? "Unknown"} · {formatDateTime(a.created_at)}
                    </p>
                  </div>
                </div>
                {canDeleteThis && (
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="shrink-0 text-xs text-slate-400 hover:text-red-500"
                  >
                    Remove
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
