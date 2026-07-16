"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";
import type { Profile } from "@/lib/types";

export default function NewTaskModal({
  departmentId,
  departments,
  profiles,
  currentUserId,
}: {
  /** Fixed department (e.g. when opened from a department's own page). */
  departmentId?: string;
  /** Pass this instead of departmentId to let the user pick a department (e.g. from My Tasks). */
  departments?: { id: string; name: string }[];
  profiles: Profile[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState("normal");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(
    departmentId ?? departments?.[0]?.id ?? ""
  );

  function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])]);
    e.target.value = "";
  }

  function removeFile(name: string) {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  }

  function toggleAssignee(id: string) {
    setAssigneeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function reset() {
    setTitle("");
    setDescription("");
    setDeadline("");
    setPriority("normal");
    setAssigneeIds([]);
    setFiles([]);
    setSelectedDepartmentId(departmentId ?? departments?.[0]?.id ?? "");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const targetDepartmentId = departmentId ?? selectedDepartmentId;
    if (!targetDepartmentId) {
      setError("Please choose a department for this task.");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .insert({
        title,
        description: description || null,
        department_id: targetDepartmentId,
        created_by: currentUserId,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        priority,
      })
      .select()
      .single();

    if (taskError || !task) {
      setError(taskError?.message ?? "Could not create task.");
      setLoading(false);
      return;
    }

    if (assigneeIds.length > 0) {
      await supabase
        .from("task_assignees")
        .insert(assigneeIds.map((profile_id) => ({ task_id: task.id, profile_id })));
    }

    for (const file of files) {
      const path = `${task.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("task-attachments")
        .upload(path, file);
      if (!uploadError) {
        const fileUrl = supabase.storage.from("task-attachments").getPublicUrl(path).data
          .publicUrl;
        await supabase.from("task_attachments").insert({
          task_id: task.id,
          uploaded_by: currentUserId,
          file_url: fileUrl,
          file_name: file.name,
        });
      }
    }

    setLoading(false);
    setOpen(false);
    reset();
    router.refresh();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary">
        + New task
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">New task</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Title</label>
                <input
                  required
                  className="input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Draft Q3 content calendar"
                />
              </div>

              <div>
                <label className="label">Description</label>
                <textarea
                  className="input min-h-20"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {!departmentId && departments && (
                <div>
                  <label className="label">Department</label>
                  <select
                    required
                    className="input"
                    value={selectedDepartmentId}
                    onChange={(e) => setSelectedDepartmentId(e.target.value)}
                  >
                    <option value="" disabled>
                      Choose a department
                    </option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Deadline</label>
                  <input
                    type="datetime-local"
                    className="input"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Priority</label>
                  <select
                    className="input"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">
                  Assignees{" "}
                  <span className="font-normal text-slate-400">
                    (anyone, any department - great for collabs)
                  </span>
                </label>
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-sky-100 p-2">
                  {profiles.map((p) => (
                    <label
                      key={p.id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-sky-50"
                    >
                      <input
                        type="checkbox"
                        checked={assigneeIds.includes(p.id)}
                        onChange={() => toggleAssignee(p.id)}
                      />
                      <Avatar name={p.full_name} url={p.avatar_url} size={22} />
                      <span className="text-sm text-slate-700">{p.full_name}</span>
                      <span className="text-xs text-slate-400">{p.job_title}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Related files</label>
                <label className="btn-secondary inline-block cursor-pointer text-xs">
                  + Add file
                  <input type="file" multiple className="sr-only" onChange={handleFilesChange} />
                </label>
                {files.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {files.map((f) => (
                      <li
                        key={f.name}
                        className="flex items-center justify-between rounded-lg bg-sky-50 px-3 py-1.5 text-xs text-slate-600"
                      >
                        <span className="truncate">📎 {f.name}</span>
                        <button
                          type="button"
                          onClick={() => removeFile(f.name)}
                          className="ml-2 shrink-0 text-slate-400 hover:text-red-500"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="btn-ghost"
                >
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? "Creating..." : "Create task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
