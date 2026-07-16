"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";
import { formatDateTime } from "@/lib/utils";
import type { Profile, TaskComment } from "@/lib/types";

export default function TaskComments({
  taskId,
  currentUserId,
  comments,
  profilesById,
}: {
  taskId: string;
  currentUserId: string;
  comments: TaskComment[];
  profilesById: Record<string, Profile>;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setPosting(true);
    const supabase = createClient();
    await supabase
      .from("task_comments")
      .insert({ task_id: taskId, profile_id: currentUserId, body: body.trim() });
    setBody("");
    setPosting(false);
    router.refresh();
  }

  return (
    <div className="card p-6">
      <h2 className="mb-3 text-sm font-semibold text-slate-700">Comments</h2>
      <div className="space-y-4">
        {comments.map((c) => {
          const author = profilesById[c.profile_id];
          return (
            <div key={c.id} className="flex gap-3">
              <Avatar name={author?.full_name ?? "?"} url={author?.avatar_url} size={28} />
              <div>
                <p className="text-sm">
                  <span className="font-medium text-slate-700">
                    {author?.full_name ?? "Unknown"}
                  </span>{" "}
                  <span className="text-xs text-slate-400">
                    {formatDateTime(c.created_at)}
                  </span>
                </p>
                <p className="whitespace-pre-wrap text-sm text-slate-600">{c.body}</p>
              </div>
            </div>
          );
        })}
        {comments.length === 0 && (
          <p className="text-sm text-slate-400">No comments yet.</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex gap-2 border-t border-sky-50 pt-4">
        <input
          className="input"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a comment..."
        />
        <button type="submit" disabled={posting} className="btn-primary">
          Send
        </button>
      </form>
    </div>
  );
}
