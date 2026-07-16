"use client";

import { useMemo, useState } from "react";
import { downloadCsv, monthKey, monthLabel, toCsv, weekKey, weekLabel } from "@/lib/reports";
import type { Attendance, Profile } from "@/lib/types";

export default function AttendanceReport({
  profiles,
  attendance,
  canExport,
}: {
  profiles: Profile[];
  attendance: Attendance[];
  canExport: boolean;
}) {
  const [mode, setMode] = useState<"weekly" | "monthly">("weekly");
  const keyFn = mode === "weekly" ? weekKey : monthKey;
  const labelFn = mode === "weekly" ? weekLabel : monthLabel;

  const periods = useMemo(() => {
    const keys = new Set(attendance.map((a) => keyFn(a.date)));
    return Array.from(keys).sort((a, b) => (a < b ? 1 : -1));
  }, [attendance, keyFn]);

  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const activePeriod = selectedPeriod ?? periods[0] ?? null;

  const rows = useMemo(() => {
    if (!activePeriod) return [];
    const inPeriod = attendance.filter((a) => keyFn(a.date) === activePeriod);
    return profiles.map((p) => {
      const records = inPeriod.filter((a) => a.profile_id === p.id);
      const count = (status: string) => records.filter((r) => r.status === status).length;
      return {
        name: p.full_name,
        present: count("present"),
        late: count("late"),
        absent: count("absent"),
        leave: count("leave"),
      };
    });
  }, [activePeriod, attendance, profiles, keyFn]);

  function handleExport() {
    if (!activePeriod) return;
    const csvRows = rows.map((r) => ({
      employee: r.name,
      present: r.present,
      late: r.late,
      absent: r.absent,
      leave: r.leave,
    }));
    const csv = toCsv(csvRows, ["employee", "present", "late", "absent", "leave"]);
    downloadCsv(`attendance-${mode}-${activePeriod}.csv`, csv);
  }

  return (
    <div className="card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-700">Attendance report</h2>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-xl bg-sky-50 p-1 text-xs">
            <button
              onClick={() => {
                setMode("weekly");
                setSelectedPeriod(null);
              }}
              className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                mode === "weekly" ? "bg-white text-sky-700 shadow-sm" : "text-slate-500"
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => {
                setMode("monthly");
                setSelectedPeriod(null);
              }}
              className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                mode === "monthly" ? "bg-white text-sky-700 shadow-sm" : "text-slate-500"
              }`}
            >
              Monthly
            </button>
          </div>
          {periods.length > 0 && (
            <select
              className="input py-1 text-xs"
              value={activePeriod ?? ""}
              onChange={(e) => setSelectedPeriod(e.target.value)}
            >
              {periods.map((key) => (
                <option key={key} value={key}>
                  {labelFn(key)}
                </option>
              ))}
            </select>
          )}
          {canExport && periods.length > 0 && (
            <button onClick={handleExport} className="btn-secondary text-xs">
              Export CSV
            </button>
          )}
        </div>
      </div>

      {periods.length === 0 ? (
        <p className="text-sm text-slate-400">No attendance recorded yet.</p>
      ) : (
        <div className="-mx-5 overflow-x-auto px-5">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-slate-400">
                <th className="pb-2">Employee</th>
                <th className="pb-2">Present</th>
                <th className="pb-2">Late</th>
                <th className="pb-2">Absent</th>
                <th className="pb-2">Leave</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-50">
              {rows.map((r) => (
                <tr key={r.name}>
                  <td className="py-2">{r.name}</td>
                  <td className="py-2">{r.present}</td>
                  <td className="py-2">{r.late}</td>
                  <td className="py-2">{r.absent}</td>
                  <td className="py-2">{r.leave}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
