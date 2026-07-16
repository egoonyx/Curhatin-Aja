"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";
import ScheduleMeetingModal from "@/components/ScheduleMeetingModal";
import { cn } from "@/lib/utils";
import type { Profile, Task, TaskPriority, TaskStatus } from "@/lib/types";

const STATUSES: TaskStatus[] = ["todo", "revision", "reviewing", "done"];
const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "New task",
  revision: "Revision",
  reviewing: "Reviewing",
  done: "Complete",
};
const PRIORITIES: TaskPriority[] = ["low", "normal", "high"];

export default function TaskDetail({
  task,
  canEdit,
  allProfiles,
  assignees,
  currentUserId,
}: {
  task: Task;
  canEdit: boolean;
  allProfiles: Profile[];
  assignees: Profile[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [deadline, setDeadline] = useState(
    task.deadline ? task.deadline.slice(0, 16) : ""
  );
  const [priority, setPriority] = useState(task.priority);
  const [addingId, setAddingId] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [changingStatus, setChangingStatus] = useState(false);
  const [scheduling, setScheduling] = useState(false);

  async function handleStatusChange(status: TaskStatus) {
    if (status === task.status) return;
    setChangingStatus(true);
    const supabase = createClient();
    await supabase.from("tasks").update({ status }).eq("id", task.id);
    await supabase.from("task_status_updates").insert({
      task_id: task.id,
      changed_by: currentUserId,
      from_status: task.status,
      to_status: status,
      note: statusNote.trim() || null,
    });
    setStatusNote("");
    setChangingStatus(false);
    router.refresh();
  }

  async function handleSaveEdit() {
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from("tasks")
      .update({
        title,
        description: description || null,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        priority,
      })
      .eq("id", task.id);
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  async function handleAddAssignee() {
    if (!addingId) return;
    const supabase = createClient();
    await supabase.from("task_assignees").insert({ task_id: task.id, profile_id: addingId });
    setAddingId("");
    router.refresh();
  }

  async function handleRemoveAssignee(profileId: string) {
    const supabase = createClient();
    await supabase
      .from("task_assignees")
      .delete()
      .eq("task_id", task.id)
      .eq("profile_id", profileId);
    router.refresh();
  }

  const assignableProfiles = allProfiles.filter(
    (p) => !assignees.some((a) => a.id === p.id)
  );

  return (
    <div className="space-y-6">
      <div className="card p-6">
        {editing ? (
          <div className="space-y-4">
            <input
              className="input text-lg font-semibold"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className="input min-h-24"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
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
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setEditing(false)}>
                Cancel
              </button>
              <button className="btn-primary" disabled={saving} onClick={handleSaveEdit}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-lg font-semibold text-slate-800">{task.title}</h1>
              <div className="flex shrink-0 gap-2">
                <button className="btn-secondary text-xs" onClick={() => setScheduling(true)}>
                  📅 Schedule meeting
                </button>
                {canEdit && (
                  <button className="btn-ghost" onClick={() => setEditing(true)}>
                    Edit
                  </button>
                )}
              </div>
            </div>
            {task.description && (
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                {task.description}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">
              <span>
                Deadline:{" "}
                {task.deadline ? new Date(task.deadline).toLocaleString() : "None"}
              </span>
              <span className="capitalize">Priority: {task.priority}</span>
            </div>
          </div>
        )}

        <div className="mt-5 border-t border-sky-50 pt-4">
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <button
                key={s}
                disabled={changingStatus}
                onClick={() => handleStatusChange(s)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  task.status === s
                    ? "bg-sky-500 text-white"
                    : "bg-sky-50 text-sky-700 hover:bg-sky-100"
                )}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
          <p className="mt-3 label">Note for the other person (optional)</p>
          <textarea
            className="input min-h-16 text-sm"
            placeholder="e.g. Draft is ready for review, or: please tweak the intro"
            value={statusNote}
            onChange={(e) => setStatusNote(e.target.value)}
          />
          <p className="mt-1 text-xs text-slate-400">
            Add a note above, then tap a status to submit it - the other person will be
            notified.
          </p>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Assignees</h2>
        <div className="space-y-2">
          {assignees.map((p) => (
            <div key={p.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar name={p.full_name} url={p.avatar_url} size={28} />
                <div>
                  <p className="text-sm font-medium text-slate-700">{p.full_name}</p>
                  <p className="text-xs text-slate-400">{p.job_title}</p>
                </div>
              </div>
              {canEdit && (
                <button
                  onClick={() => handleRemoveAssignee(p.id)}
                  className="text-xs text-slate-400 hover:text-red-500"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          {assignees.length === 0 && (
            <p className="text-sm text-slate-400">No one assigned yet.</p>
          )}
        </div>

        {canEdit && assignableProfiles.length > 0 && (
          <div className="mt-4 flex gap-2 border-t border-sky-50 pt-4">
            <select
              className="input"
              value={addingId}
              onChange={(e) => setAddingId(e.target.value)}
            >
              <option value="">Add someone (any department)...</option>
              {assignableProfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name} - {p.job_title}
                </option>
              ))}
            </select>
            <button className="btn-secondary" onClick={handleAddAssignee}>
              Add
            </button>
          </div>
        )}
      </div>

      {scheduling && (
        <ScheduleMeetingModal
          taskId={task.id}
          currentUserId={currentUserId}
          defaultAttendees={assignees}
          allProfiles={allProfiles}
          onClose={() => setScheduling(false)}
        />
      )}
    </div>
  );
}
