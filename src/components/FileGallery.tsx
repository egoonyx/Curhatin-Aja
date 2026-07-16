"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";
import ShareFileModal from "@/components/ShareFileModal";
import { formatDateTime } from "@/lib/utils";
import type { Department, GalleryFile, Profile } from "@/lib/types";

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileGallery({
  currentUserId,
  isAdmin,
  departments,
  allProfiles,
  defaultDepartmentId,
}: {
  currentUserId: string;
  isAdmin: boolean;
  departments: Department[];
  allProfiles: Profile[];
  defaultDepartmentId: string;
}) {
  const [tab, setTab] = useState<"department" | "shared">("department");
  const [departmentId, setDepartmentId] = useState(defaultDepartmentId);
  const [files, setFiles] = useState<GalleryFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareTarget, setShareTarget] = useState<GalleryFile | null>(null);

  const profilesById = Object.fromEntries(allProfiles.map((p) => [p.id, p]));

  async function load() {
    setLoading(true);
    const supabase = createClient();
    if (tab === "department") {
      if (!departmentId) {
        setFiles([]);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("files")
        .select("*")
        .eq("department_id", departmentId)
        .order("created_at", { ascending: false });
      setFiles((data as GalleryFile[]) ?? []);
    } else {
      const { data } = await supabase
        .from("file_shares")
        .select("files(*)")
        .eq("profile_id", currentUserId)
        .order("created_at", { ascending: false });
      const shared = (data ?? []).map((r) => r.files as unknown as GalleryFile).filter(Boolean);
      setFiles(shared);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, departmentId]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (fileList.length === 0) return;
    if (!departmentId) {
      setError("Choose a department first.");
      return;
    }
    setUploading(true);
    setError(null);
    const supabase = createClient();

    for (const file of fileList) {
      const path = `${departmentId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("gallery-files")
        .upload(path, file);
      if (uploadError) {
        setError(uploadError.message);
        continue;
      }
      const fileUrl = supabase.storage.from("gallery-files").getPublicUrl(path).data.publicUrl;
      await supabase.from("files").insert({
        department_id: departmentId,
        uploaded_by: currentUserId,
        file_name: file.name,
        file_url: fileUrl,
        file_size: file.size,
      });
    }

    setUploading(false);
    load();
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("files").delete().eq("id", id);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 border-b border-sky-100 pb-2">
        <button
          onClick={() => setTab("department")}
          className={`rounded-t-lg px-3 py-2 text-sm font-medium ${
            tab === "department" ? "border-b-2 border-sky-500 text-sky-700" : "text-slate-400"
          }`}
        >
          Department
        </button>
        <button
          onClick={() => setTab("shared")}
          className={`rounded-t-lg px-3 py-2 text-sm font-medium ${
            tab === "shared" ? "border-b-2 border-sky-500 text-sky-700" : "text-slate-400"
          }`}
        >
          Shared with me
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {tab === "department" ? (
          <select
            className="input w-full sm:w-64"
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
          >
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-sm text-slate-500">Files other people shared directly with you.</p>
        )}

        {tab === "department" && (
          <label className="btn-primary relative inline-flex cursor-pointer items-center justify-center text-sm">
            {uploading ? "Uploading..." : "+ Upload file"}
            <input
              type="file"
              multiple
              className="sr-only"
              disabled={uploading}
              onChange={handleUpload}
            />
          </label>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Loading...</p>
      ) : files.length === 0 ? (
        <div className="card p-6 text-sm text-slate-400">Nothing here yet.</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {files.map((f) => {
            const uploader = f.uploaded_by ? profilesById[f.uploaded_by] : null;
            const canManage = isAdmin || f.uploaded_by === currentUserId;
            return (
              <div key={f.id} className="card flex flex-col gap-2 p-4">
                <a
                  href={f.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-sm font-medium text-sky-600 hover:underline"
                >
                  📄 {f.file_name}
                </a>
                <div className="flex items-center gap-2">
                  <Avatar name={uploader?.full_name ?? "?"} url={uploader?.avatar_url} size={22} />
                  <p className="min-w-0 truncate text-xs text-slate-400">
                    {uploader?.full_name ?? "Unknown"} · {formatDateTime(f.created_at)}
                  </p>
                </div>
                {f.file_size ? (
                  <p className="text-xs text-slate-400">{formatSize(f.file_size)}</p>
                ) : null}
                {canManage && (
                  <div className="mt-1 flex flex-wrap gap-3 border-t border-sky-50 pt-2 text-xs">
                    <button
                      onClick={() => setShareTarget(f)}
                      className="font-medium text-sky-600 hover:underline"
                    >
                      Share
                    </button>
                    <button
                      onClick={() => handleDelete(f.id)}
                      className="font-medium text-slate-400 hover:text-red-500"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {shareTarget && (
        <ShareFileModal
          file={shareTarget}
          currentUserId={currentUserId}
          allProfiles={allProfiles}
          onClose={() => setShareTarget(null)}
        />
      )}
    </div>
  );
}
