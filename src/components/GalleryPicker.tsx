"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";
import { formatDateTime } from "@/lib/utils";
import type { Department, GalleryFile, Profile } from "@/lib/types";

export default function GalleryPicker({
  currentUserId,
  onSelect,
  onClose,
}: {
  currentUserId: string;
  onSelect: (file: GalleryFile) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"department" | "shared">("department");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentId, setDepartmentId] = useState("");
  const [files, setFiles] = useState<GalleryFile[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const [{ data: departmentsData }, { data: myProfile }, { data: allProfiles }] =
        await Promise.all([
          supabase.from("departments").select("*").order("name"),
          supabase.from("profiles").select("department_id").eq("id", currentUserId).single(),
          supabase.from("profiles").select("*"),
        ]);
      setDepartments((departmentsData as Department[]) ?? []);
      setDepartmentId(myProfile?.department_id ?? departmentsData?.[0]?.id ?? "");
      setProfilesById(
        Object.fromEntries(((allProfiles as Profile[]) ?? []).map((p) => [p.id, p]))
      );
    }
    init();
  }, [currentUserId]);

  useEffect(() => {
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
        const shared = (data ?? [])
          .map((r) => r.files as unknown as GalleryFile)
          .filter(Boolean);
        setFiles(shared);
      }
      setLoading(false);
    }
    load();
  }, [tab, departmentId, currentUserId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-sky-50 p-4">
          <h2 className="text-sm font-semibold text-slate-800">Choose from gallery</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>

        <div className="flex gap-2 border-b border-sky-50 px-4 pt-3">
          <button
            onClick={() => setTab("department")}
            className={`rounded-t-lg px-3 py-2 text-xs font-medium ${
              tab === "department"
                ? "border-b-2 border-sky-500 text-sky-700"
                : "text-slate-400"
            }`}
          >
            Department
          </button>
          <button
            onClick={() => setTab("shared")}
            className={`rounded-t-lg px-3 py-2 text-xs font-medium ${
              tab === "shared" ? "border-b-2 border-sky-500 text-sky-700" : "text-slate-400"
            }`}
          >
            Shared with me
          </button>
        </div>

        {tab === "department" && (
          <div className="border-b border-sky-50 p-3">
            <select
              className="input text-sm"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <p className="p-3 text-sm text-slate-400">Loading...</p>
          ) : files.length === 0 ? (
            <p className="p-3 text-sm text-slate-400">No files here yet.</p>
          ) : (
            <div className="space-y-2">
              {files.map((f) => {
                const uploader = f.uploaded_by ? profilesById[f.uploaded_by] : null;
                return (
                  <button
                    key={f.id}
                    onClick={() => onSelect(f)}
                    className="flex w-full items-center gap-2 rounded-xl border border-sky-100 px-3 py-2 text-left hover:border-sky-300 hover:bg-sky-50"
                  >
                    <Avatar name={uploader?.full_name ?? "?"} url={uploader?.avatar_url} size={28} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-slate-700">📎 {f.file_name}</p>
                      <p className="truncate text-xs text-slate-400">
                        {uploader?.full_name ?? "Unknown"} · {formatDateTime(f.created_at)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
