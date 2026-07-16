"use client";

import { useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import ScheduleMeetingModal from "@/components/ScheduleMeetingModal";
import { formatDateTime } from "@/lib/utils";
import type { Meeting, Profile } from "@/lib/types";

export type MeetingWithContext = Meeting & {
  taskTitle: string | null;
  isChatChannel: boolean;
  attendees: Profile[];
};

export default function CalendarView({
  currentUserId,
  allProfiles,
  meetings,
}: {
  currentUserId: string;
  allProfiles: Profile[];
  meetings: MeetingWithContext[];
}) {
  const [scheduling, setScheduling] = useState(false);

  const now = Date.now();
  const upcoming = meetings.filter((m) => new Date(m.start_time).getTime() >= now);
  const past = meetings
    .filter((m) => new Date(m.start_time).getTime() < now)
    .slice()
    .reverse();

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button className="btn-primary" onClick={() => setScheduling(true)}>
          + Schedule meeting
        </button>
      </div>

      <section className="card p-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Upcoming</h2>
        <div className="space-y-3">
          {upcoming.map((m) => (
            <MeetingRow key={m.id} meeting={m} />
          ))}
          {upcoming.length === 0 && (
            <p className="text-sm text-slate-400">No upcoming meetings.</p>
          )}
        </div>
      </section>

      {past.length > 0 && (
        <section className="card p-6">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Past</h2>
          <div className="space-y-3">
            {past.map((m) => (
              <MeetingRow key={m.id} meeting={m} />
            ))}
          </div>
        </section>
      )}

      {scheduling && (
        <ScheduleMeetingModal
          currentUserId={currentUserId}
          defaultAttendees={[]}
          allProfiles={allProfiles}
          onClose={() => setScheduling(false)}
        />
      )}
    </div>
  );
}

function MeetingRow({ meeting }: { meeting: MeetingWithContext }) {
  const linkHref = meeting.task_id
    ? `/dashboard/tasks/${meeting.task_id}`
    : meeting.channel_id
      ? `/dashboard/chat/${meeting.channel_id}`
      : null;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-sky-50 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-700">{meeting.title}</p>
        <p className="text-xs text-slate-400">{formatDateTime(meeting.start_time)}</p>
        {meeting.description && (
          <p className="mt-1 text-xs text-slate-500">{meeting.description}</p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-1">
          {meeting.attendees.slice(0, 5).map((p) => (
            <Avatar key={p.id} name={p.full_name} url={p.avatar_url} size={20} />
          ))}
          {meeting.taskTitle && (
            <span className="ml-1 text-xs text-slate-400">Task: {meeting.taskTitle}</span>
          )}
          {meeting.isChatChannel && !meeting.taskTitle && (
            <span className="ml-1 text-xs text-slate-400">Linked to a chat</span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {meeting.zoom_join_url && (
          <a
            href={meeting.zoom_join_url}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary text-xs"
          >
            Join Zoom
          </a>
        )}
        {linkHref && (
          <Link href={linkHref} className="text-xs text-sky-600 hover:underline">
            View {meeting.task_id ? "task" : "chat"}
          </Link>
        )}
      </div>
    </div>
  );
}
