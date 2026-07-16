"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";
import { downloadCsv, monthKey, monthLabel, toCsv, weekKey, weekLabel } from "@/lib/reports";
import type { ContentPost } from "@/lib/types";

export default function ContentAnalysisView({
  currentUserId,
  departmentId,
  canExport,
  canDeleteAny,
  posts,
}: {
  currentUserId: string;
  departmentId: string;
  canExport: boolean;
  canDeleteAny: boolean;
  posts: ContentPost[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"posts" | "weekly" | "monthly">("posts");
  const [adding, setAdding] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [postedAt, setPostedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [likes, setLikes] = useState("0");
  const [views, setViews] = useState("0");
  const [comments, setComments] = useState("0");
  const [shares, setShares] = useState("0");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!linkUrl.trim()) return;
    setSaving(true);
    const supabase = createClient();

    const { data: post, error } = await supabase
      .from("content_posts")
      .insert({
        department_id: departmentId,
        created_by: currentUserId,
        link_url: linkUrl.trim(),
        posted_at: postedAt,
        likes: Number(likes) || 0,
        views: Number(views) || 0,
        comments: Number(comments) || 0,
        shares: Number(shares) || 0,
      })
      .select()
      .single();

    if (!error && post) {
      fetch("/api/content/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id }),
      }).finally(() => router.refresh());
    }

    setLinkUrl("");
    setLikes("0");
    setViews("0");
    setComments("0");
    setShares("0");
    setSaving(false);
    setAdding(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this content entry? This can't be undone.")) return;
    setDeletingId(id);
    const supabase = createClient();
    await supabase.from("content_posts").delete().eq("id", id);
    setDeletingId(null);
    router.refresh();
  }

  const weekly = useMemo(() => groupPosts(posts, weekKey), [posts]);
  const monthly = useMemo(() => groupPosts(posts, monthKey), [posts]);

  function exportReport(groups: Group[], labelFn: (key: string) => string, filename: string) {
    const rows = groups.map((g) => ({
      period: labelFn(g.key),
      posts: g.posts.length,
      likes: g.totals.likes,
      views: g.totals.views,
      comments: g.totals.comments,
      shares: g.totals.shares,
    }));
    const csv = toCsv(rows, ["period", "posts", "likes", "views", "comments", "shares"]);
    downloadCsv(filename, csv);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 rounded-xl bg-sky-50 p-1 text-sm">
          <button
            onClick={() => setTab("posts")}
            className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
              tab === "posts" ? "bg-white text-sky-700 shadow-sm" : "text-slate-500"
            }`}
          >
            Content
          </button>
          <button
            onClick={() => setTab("weekly")}
            className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
              tab === "weekly" ? "bg-white text-sky-700 shadow-sm" : "text-slate-500"
            }`}
          >
            Weekly report
          </button>
          <button
            onClick={() => setTab("monthly")}
            className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
              tab === "monthly" ? "bg-white text-sky-700 shadow-sm" : "text-slate-500"
            }`}
          >
            Monthly report
          </button>
        </div>
        {tab === "posts" && (
          <button className="btn-primary" onClick={() => setAdding(true)}>
            + Add content link
          </button>
        )}
      </div>

      {tab === "posts" && (
        <div className="space-y-3">
          {posts.length === 0 && (
            <div className="card p-6 text-sm text-slate-400">
              No content added yet. Paste a link to get started.
            </div>
          )}
          {posts.map((post) => {
            const canDelete = canDeleteAny || post.created_by === currentUserId;
            return (
              <div key={post.id} className="card space-y-2 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <a
                      href={post.link_url}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-sm font-medium text-sky-600 hover:underline"
                    >
                      {post.title || post.link_url}
                    </a>
                    <p className="text-xs text-slate-400">Posted {formatDate(post.posted_at)}</p>
                  </div>
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(post.id)}
                      disabled={deletingId === post.id}
                      className="shrink-0 text-xs text-slate-400 hover:text-red-500 disabled:opacity-50"
                    >
                      {deletingId === post.id ? "Deleting..." : "Delete"}
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                  <span>👍 {post.likes}</span>
                  <span>👁️ {post.views}</span>
                  <span>💬 {post.comments}</span>
                  <span>🔁 {post.shares}</span>
                </div>

                {post.ai_summary ? (
                  <div className="rounded-lg bg-sky-50 p-3 text-xs text-slate-600">
                    <p className="mb-1">
                      <span className="font-semibold">AI summary:</span> {post.ai_summary}
                    </p>
                    {post.ai_tone && (
                      <p className="mb-1">
                        <span className="font-semibold">Tone:</span> {post.ai_tone}
                      </p>
                    )}
                    {post.ai_topics && post.ai_topics.length > 0 && (
                      <p className="mb-1">
                        <span className="font-semibold">Topics:</span> {post.ai_topics.join(", ")}
                      </p>
                    )}
                    {post.ai_suggestions && (
                      <p>
                        <span className="font-semibold">Suggestion:</span> {post.ai_suggestions}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">
                    AI analysis isn&apos;t connected yet, or couldn&apos;t read this link - manual
                    metrics above are still tracked.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === "weekly" && (
        <ReportTable
          groups={weekly}
          labelFn={weekLabel}
          canExport={canExport}
          onExport={() => exportReport(weekly, weekLabel, "content-weekly-report.csv")}
        />
      )}

      {tab === "monthly" && (
        <ReportTable
          groups={monthly}
          labelFn={monthLabel}
          canExport={canExport}
          onExport={() => exportReport(monthly, monthLabel, "content-monthly-report.csv")}
        />
      )}

      {adding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">
          <form
            onSubmit={handleAdd}
            className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2 className="text-lg font-semibold text-slate-800">Add content link</h2>
            <div>
              <label className="label">Link</label>
              <input
                className="input"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
                required
              />
            </div>
            <div>
              <label className="label">Posted date</label>
              <input
                type="date"
                className="input"
                value={postedAt}
                onChange={(e) => setPostedAt(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Likes</label>
                <input
                  type="number"
                  min="0"
                  className="input"
                  value={likes}
                  onChange={(e) => setLikes(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Views</label>
                <input
                  type="number"
                  min="0"
                  className="input"
                  value={views}
                  onChange={(e) => setViews(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Comments</label>
                <input
                  type="number"
                  min="0"
                  className="input"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Shares</label>
                <input
                  type="number"
                  min="0"
                  className="input"
                  value={shares}
                  onChange={(e) => setShares(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-slate-400">
              We&apos;ll try to auto-read the link for a qualitative summary. Metrics above are
              tracked as you enter them.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setAdding(false)}>
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? "Saving..." : "Add"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

type Group = {
  key: string;
  posts: ContentPost[];
  totals: { likes: number; views: number; comments: number; shares: number };
};

function groupPosts(posts: ContentPost[], keyFn: (date: string) => string): Group[] {
  const map = new Map<string, ContentPost[]>();
  for (const post of posts) {
    const key = keyFn(post.posted_at);
    map.set(key, [...(map.get(key) ?? []), post]);
  }
  return Array.from(map.entries())
    .map(([key, groupPosts]) => ({
      key,
      posts: groupPosts,
      totals: groupPosts.reduce(
        (acc, p) => ({
          likes: acc.likes + p.likes,
          views: acc.views + p.views,
          comments: acc.comments + p.comments,
          shares: acc.shares + p.shares,
        }),
        { likes: 0, views: 0, comments: 0, shares: 0 }
      ),
    }))
    .sort((a, b) => (a.key < b.key ? 1 : -1));
}

function ReportTable({
  groups,
  labelFn,
  canExport,
  onExport,
}: {
  groups: Group[];
  labelFn: (key: string) => string;
  canExport: boolean;
  onExport: () => void;
}) {
  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-700">Report</h2>
        {canExport && groups.length > 0 && (
          <button onClick={onExport} className="btn-secondary text-xs">
            Export CSV
          </button>
        )}
      </div>
      {groups.length === 0 ? (
        <p className="text-sm text-slate-400">Nothing to report yet.</p>
      ) : (
        <div className="-mx-5 overflow-x-auto px-5">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-slate-400">
                <th className="pb-2">Period</th>
                <th className="pb-2">Posts</th>
                <th className="pb-2">Likes</th>
                <th className="pb-2">Views</th>
                <th className="pb-2">Comments</th>
                <th className="pb-2">Shares</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-50">
              {groups.map((g) => (
                <tr key={g.key}>
                  <td className="py-2">{labelFn(g.key)}</td>
                  <td className="py-2">{g.posts.length}</td>
                  <td className="py-2">{g.totals.likes}</td>
                  <td className="py-2">{g.totals.views}</td>
                  <td className="py-2">{g.totals.comments}</td>
                  <td className="py-2">{g.totals.shares}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
