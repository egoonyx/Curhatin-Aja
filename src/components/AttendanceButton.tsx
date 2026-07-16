"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatTime } from "@/lib/utils";
import type { Attendance } from "@/lib/types";

const LATE_CUTOFF_HOUR = 9;

export default function AttendanceButton({
  profileId,
  initialAttendance,
}: {
  profileId: string;
  initialAttendance: Attendance | null;
}) {
  const [attendance, setAttendance] = useState(initialAttendance);
  const [loading, setLoading] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  async function handleCheckIn() {
    setLoading(true);
    const supabase = createClient();
    const now = new Date();
    const status = now.getHours() >= LATE_CUTOFF_HOUR ? "late" : "present";

    const { data, error } = await supabase
      .from("attendance")
      .upsert(
        { profile_id: profileId, date: today, check_in: now.toISOString(), status },
        { onConflict: "profile_id,date" }
      )
      .select()
      .single();

    if (!error) setAttendance(data as Attendance);
    setLoading(false);
  }

  async function handleCheckOut() {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("attendance")
      .update({ check_out: new Date().toISOString() })
      .eq("profile_id", profileId)
      .eq("date", today)
      .select()
      .single();

    if (!error) setAttendance(data as Attendance);
    setLoading(false);
  }

  async function handleLeave() {
    const note = window.prompt("Reason for leave / not present today?");
    if (note === null) return;
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("attendance")
      .upsert(
        { profile_id: profileId, date: today, status: "leave", note },
        { onConflict: "profile_id,date" }
      )
      .select()
      .single();

    if (!error) setAttendance(data as Attendance);
    setLoading(false);
  }

  if (attendance?.status === "leave") {
    return (
      <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
        Marked as leave today{attendance.note ? `: ${attendance.note}` : ""}.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {!attendance?.check_in && (
        <button onClick={handleCheckIn} disabled={loading} className="btn-primary">
          Check in
        </button>
      )}

      {attendance?.check_in && !attendance?.check_out && (
        <>
          <span className="text-sm text-slate-500">
            Checked in at {formatTime(attendance.check_in)}
            {attendance.status === "late" && (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                Late
              </span>
            )}
          </span>
          <button onClick={handleCheckOut} disabled={loading} className="btn-secondary">
            Check out
          </button>
        </>
      )}

      {attendance?.check_in && attendance?.check_out && (
        <span className="text-sm text-slate-500">
          Checked in {formatTime(attendance.check_in)} - out {formatTime(attendance.check_out)}
        </span>
      )}

      {!attendance?.check_in && (
        <button onClick={handleLeave} disabled={loading} className="btn-ghost">
          Mark as leave
        </button>
      )}
    </div>
  );
}
