"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";
import type { Profile } from "@/lib/types";

export default function ScheduleMeetingModal({
  taskId,
  channelId,
  currentUserId,
  defaultAttendees,
  allProfiles,
  onClose,
}: {
  /** Links this meeting to a task (mutually exclusive with channelId). */
  taskId?: string;
  /** Links this meeting to a chat channel/DM (mutually exclusive with taskId). */
  channelId?: string;
  currentUserId: string;
  /** Pre-selected attendees, e.g. task assignees or chat members (excluding self). */
  defaultAttendees: Profile[];
  /** Everyone else that can be added. */
  allProfiles: Profile[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [duration, setDuration] = useState(30);
  const [attendeeIds, setAttendeeIds] = useState<string[]>(
    defaultAttendees.map((p) => p.id)
  );
  const [addingId, setAddingId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ joinUrl?: string; note?: string } | null>(
    null
  );

  function toggleAttendee(id: string) {
    setAttendeeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function addAttendee() {
    if (addingId && !attendeeIds.includes(addingId)) {
      setAttendeeIds((prev) => [...prev, addingId]);
    }
    setAddingId("");
  }

  const attendeeProfiles = allProfiles.filter(
    (p) => attendeeIds.includes(p.id) && p.id !== currentUserId
  );
  const addableProfiles = allProfiles.filter(
    (p) => !attendeeIds.includes(p.id) && p.id !== currentUserId
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date) {
      setError("Please pick a date and time.");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();

    const startTime = new Date(date);
    const endTime = new Date(startTime.getTime() + duration * 60000);

    const { data: meeting, error: meetingError } = await supabase
      .from("meetings")
      .insert({
        title,
        description: description || null,
        task_id: taskId ?? null,
        channel_id: channelId ?? null,
        created_by: currentUserId,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
      })
      .select()
      .single();

    if (meetingError || !meeting) {
      setError(meetingError?.message ?? "Could not schedule the meeting.");
      setSaving(false);
      return;
    }

    const uniqueAttendeeIds = Array.from(new Set([...attendeeIds, currentUserId]));
    if (uniqueAttendeeIds.length > 0) {
      await supabase.from("meeting_attendees").insert(
        uniqueAttendeeIds.map((profile_id) => ({
          meeting_id: meeting.id,
          profile_id,
        }))
      );
    }

    try {
      const res = await fetch(`/api/meetings/${meeting.id}/zoom`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.joinUrl) {
        setResult({ joinUrl: data.joinUrl });
      } else {
        setResult({ note: data.reason ?? "Meeting scheduled without a Zoom link." });
      }
    } catch {
      setResult({ note: "Meeting scheduled, but the Zoom link could not be created." });
    }

    setSaving(false);
    router.refresh();
  }

  function handleDone() {
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Schedule a meeting</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>

        {result ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Meeting scheduled.</p>
            {result.joinUrl ? (
              <a
                href={result.joinUrl}
                target="_blank"
                rel="noreferrer"
                className="block break-all rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-700 underline"
              >
                {result.joinUrl}
              </a>
            ) : (
              <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                {result.note}
              </p>
            )}
            <div className="flex justify-end">
              <button className="btn-primary" onClick={handleDone}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Title</label>
              <input
                required
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Weekly sync"
              />
            </div>

            <div>
              <label className="label">Description</label>
              <textarea
                className="input min-h-16"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Date &amp; time</label>
                <input
                  required
                  type="datetime-local"
                  className="input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Duration</label>
                <select
                  className="input"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                >
                  <option value={15}>15 min</option>
                  <option value={30}>30 min</option>
                  <option value={45}>45 min</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">Attendees</label>
              <div className="flex flex-wrap gap-2">
                {attendeeProfiles.map((p) => (
                  <span
                    key={p.id}
                    className="flex items-center gap-1.5 rounded-full bg-sky-50 py-1 pl-1 pr-2 text-xs text-slate-700"
                  >
                    <Avatar name={p.full_name} url={p.avatar_url} size={18} />
                    {p.full_name}
                    <button
                      type="button"
                      onClick={() => toggleAttendee(p.id)}
                      className="text-slate-400 hover:text-red-500"
                    >
                      ✕
                    </button>
                  </span>
                ))}
                {attendeeProfiles.length === 0 && (
                  <p className="text-sm text-slate-400">Just you, so far.</p>
                )}
              </div>
              {addableProfiles.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <select
                    className="input flex-1"
                    value={addingId}
                    onChange={(e) => setAddingId(e.target.value)}
                  >
                    <option value="">Add someone else...</option>
                    {addableProfiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name} - {p.job_title}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="btn-secondary" onClick={addAttendee}>
                    Add
                  </button>
                </div>
              )}
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="btn-ghost">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? "Scheduling..." : "Schedule meeting"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
