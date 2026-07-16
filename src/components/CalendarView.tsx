"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import ScheduleMeetingModal from "@/components/ScheduleMeetingModal";
import { cn, formatDateTime } from "@/lib/utils";
import type { Meeting, Profile } from "@/lib/types";

export type MeetingWithContext = Meeting & {
  taskTitle: string | null;
  isChatChannel: boolean;
  attendees: Profile[];
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

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
  const [view, setView] = useState<"month" | "list">("month");
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const now = Date.now();
  const upcoming = meetings.filter((m) => new Date(m.start_time).getTime() >= now);
  const past = meetings
    .filter((m) => new Date(m.start_time).getTime() < now)
    .slice()
    .reverse();

  const monthGrid = useMemo(() => {
    const first = startOfMonth(viewMonth);
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - first.getDay());

    const days: { date: Date; inMonth: boolean; meetings: MeetingWithContext[] }[] = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + i);
      const dayMeetings = meetings.filter((m) => sameDay(new Date(m.start_time), date));
      days.push({ date, inMonth: date.getMonth() === viewMonth.getMonth(), meetings: dayMeetings });
    }
    return days;
  }, [viewMonth, meetings]);

  const monthLabel = viewMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const today = new Date();
  const selectedDayMeetings = selectedDay
    ? meetings
        .filter((m) => sameDay(new Date(m.start_time), selectedDay))
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 rounded-xl bg-sky-50 p-1 text-sm">
          <button
            onClick={() => setView("month")}
            className={cn(
              "rounded-lg px-3 py-1.5 font-medium transition-colors",
              view === "month" ? "bg-white text-sky-700 shadow-sm" : "text-slate-500"
            )}
          >
            Month
          </button>
          <button
            onClick={() => setView("list")}
            className={cn(
              "rounded-lg px-3 py-1.5 font-medium transition-colors",
              view === "list" ? "bg-white text-sky-700 shadow-sm" : "text-slate-500"
            )}
          >
            List
          </button>
        </div>
        <button className="btn-primary" onClick={() => setScheduling(true)}>
          + Schedule meeting
        </button>
      </div>

      {view === "month" ? (
        <section className="card p-3 sm:p-6">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-700 sm:text-base">
              {monthLabel}
            </h2>
            <div className="flex items-center gap-1">
              <button
                aria-label="Previous month"
                onClick={() =>
                  setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
                }
                className="rounded-lg px-2 py-1 text-slate-500 hover:bg-sky-50"
              >
                ←
              </button>
              <button
                onClick={() => setViewMonth(startOfMonth(new Date()))}
                className="btn-ghost px-2 py-1 text-xs"
              >
                Today
              </button>
              <button
                aria-label="Next month"
                onClick={() =>
                  setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
                }
                className="rounded-lg px-2 py-1 text-slate-500 hover:bg-sky-50"
              >
                →
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg bg-sky-50 text-center text-[10px] font-medium uppercase tracking-wide text-slate-400 sm:text-xs">
            {WEEKDAY_LABELS.map((d) => (
              <div key={d} className="bg-white py-1.5">
                {d.slice(0, 3)}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg bg-sky-50">
            {monthGrid.map(({ date, inMonth, meetings: dayMeetings }, i) => {
              const isToday = sameDay(date, today);
              const isSelected = selectedDay && sameDay(date, selectedDay);
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDay(date)}
                  className={cn(
                    "flex min-h-16 flex-col items-start gap-0.5 bg-white p-1 text-left align-top sm:min-h-24 sm:p-2",
                    !inMonth && "bg-slate-50 text-slate-300",
                    isSelected && "ring-2 ring-inset ring-sky-400"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full text-[11px] sm:text-xs",
                      isToday ? "bg-sky-500 font-semibold text-white" : "text-slate-600",
                      !inMonth && "text-slate-300"
                    )}
                  >
                    {date.getDate()}
                  </span>
                  <div className="flex w-full flex-col gap-0.5">
                    {dayMeetings.slice(0, 2).map((m) => (
                      <span
                        key={m.id}
                        className="truncate rounded bg-sky-100 px-1 py-0.5 text-[9px] text-sky-700 sm:text-[10px]"
                      >
                        {m.title}
                      </span>
                    ))}
                    {dayMeetings.length > 2 && (
                      <span className="text-[9px] text-slate-400 sm:text-[10px]">
                        +{dayMeetings.length - 2} more
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {selectedDay && (
            <div className="mt-4 border-t border-sky-50 pt-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-700">
                {selectedDay.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </h3>
              <div className="space-y-3">
                {selectedDayMeetings.map((m) => (
                  <MeetingRow key={m.id} meeting={m} />
                ))}
                {selectedDayMeetings.length === 0 && (
                  <p className="text-sm text-slate-400">No meetings this day.</p>
                )}
              </div>
            </div>
          )}
        </section>
      ) : (
        <>
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
        </>
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
