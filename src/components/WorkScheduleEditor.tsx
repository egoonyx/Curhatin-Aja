"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DAY_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";

export function scheduleSummary(
  workDays: number[],
  startTime: string,
  endTime: string
) {
  if (!workDays || workDays.length === 0) return "No working days set";
  const sorted = [...workDays].sort((a, b) => a - b);
  const labels = sorted.map((d) => DAY_LABELS[d]).join(", ");
  return `${labels} · ${startTime.slice(0, 5)}-${endTime.slice(0, 5)}`;
}

export default function WorkScheduleEditor({
  profileId,
  initialWorkDays,
  initialStartTime,
  initialEndTime,
}: {
  profileId: string;
  initialWorkDays: number[];
  initialStartTime: string;
  initialEndTime: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workDays, setWorkDays] = useState<number[]>(initialWorkDays ?? [1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState((initialStartTime ?? "09:00").slice(0, 5));
  const [endTime, setEndTime] = useState((initialEndTime ?? "17:00").slice(0, 5));

  function toggleDay(day: number) {
    setWorkDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
  }

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({
        work_days: workDays,
        work_start_time: startTime,
        work_end_time: endTime,
      })
      .eq("id", profileId);
    setSaving(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-left text-xs text-sky-600 hover:underline"
      >
        {scheduleSummary(initialWorkDays, initialStartTime, initialEndTime)}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">Working schedule</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Working days</label>
                <div className="flex flex-wrap gap-1.5">
                  {DAY_LABELS.map((label, day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={cn(
                        "h-9 w-9 rounded-full text-xs font-medium transition-colors",
                        workDays.includes(day)
                          ? "bg-sky-500 text-white"
                          : "bg-sky-50 text-slate-500 hover:bg-sky-100"
                      )}
                    >
                      {label[0]}
                    </button>
                  ))}
                </div>
                {workDays.length === 0 && (
                  <p className="mt-1 text-xs text-amber-600">
                    No days selected - this person won&apos;t be expected to check in.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Start time</label>
                  <input
                    type="time"
                    className="input"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">End time</label>
                  <input
                    type="time"
                    className="input"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="btn-ghost">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-primary"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
