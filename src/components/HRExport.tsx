"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ROLE_LABELS } from "@/lib/types";
import type { Department, Profile, SpecialistProfile } from "@/lib/types";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function daysLabel(days: number[] | undefined) {
  return (days ?? []).map((d) => DAY_LABELS[d] ?? d).join(", ");
}

function timeRange(start: string | null | undefined, end: string | null | undefined) {
  if (!start && !end) return "";
  return `${start ?? "?"}-${end ?? "?"}`;
}

type Row = Record<string, string>;

export default function HRExport({
  profiles,
  departments,
}: {
  profiles: Profile[];
  departments: Department[];
}) {
  const [loading, setLoading] = useState<"csv" | "xlsx" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function buildRows(): Promise<Row[]> {
    const supabase = createClient();
    const deptById = Object.fromEntries(departments.map((d) => [d.id, d.name]));

    const specialistIds = profiles
      .filter((p) => p.department_id && deptById[p.department_id] === "Specialists")
      .map((p) => p.id);

    let specialistById: Record<string, SpecialistProfile> = {};
    if (specialistIds.length > 0) {
      const { data } = await supabase
        .from("specialist_profiles")
        .select("*")
        .in("profile_id", specialistIds);
      specialistById = Object.fromEntries(
        ((data as SpecialistProfile[]) ?? []).map((s) => [s.profile_id, s])
      );
    }

    return profiles.map((p) => {
      const specialist = specialistById[p.id];
      return {
        "Full name": p.full_name ?? "",
        Email: p.email ?? "",
        WhatsApp: p.whatsapp ?? "",
        Department: (p.department_id && deptById[p.department_id]) || "Unassigned",
        "Job title": p.job_title ?? "",
        "Job desk": p.job_desk ?? "",
        Role: ROLE_LABELS[p.role] ?? p.role,
        "Work days": daysLabel(p.work_days),
        "Work hours": timeRange(p.work_start_time, p.work_end_time),
        Specialization: specialist?.specialization ?? "",
        "Availability days": specialist ? daysLabel(specialist.availability_days) : "",
        "Availability hours": specialist
          ? timeRange(specialist.availability_start_time, specialist.availability_end_time)
          : "",
        "Joined": p.created_at ? p.created_at.slice(0, 10) : "",
      };
    });
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function handleExportCsv() {
    setLoading("csv");
    setError(null);
    try {
      const rows = await buildRows();
      if (rows.length === 0) {
        setError("Nobody to export.");
        return;
      }
      const headers = Object.keys(rows[0]);
      const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
      const csv = [
        headers.map(escape).join(","),
        ...rows.map((r) => headers.map((h) => escape(r[h] ?? "")).join(",")),
      ].join("\n");
      downloadBlob(
        new Blob([csv], { type: "text/csv;charset=utf-8;" }),
        `curhatin-aja-people-${new Date().toISOString().slice(0, 10)}.csv`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not build the export.");
    }
    setLoading(null);
  }

  async function handleExportXlsx() {
    setLoading("xlsx");
    setError(null);
    try {
      const rows = await buildRows();
      if (rows.length === 0) {
        setError("Nobody to export.");
        return;
      }
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "People");
      XLSX.writeFile(wb, `curhatin-aja-people-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not build the export.");
    }
    setLoading(null);
  }

  return (
    <div className="card p-5">
      <h2 className="mb-1 text-sm font-semibold text-slate-700">Export people data</h2>
      <p className="mb-3 text-sm text-slate-500">
        Download contact info, department, role, and schedule for everyone in your scope -{" "}
        {profiles.length} {profiles.length === 1 ? "person" : "people"}.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleExportCsv}
          disabled={loading !== null}
          className="btn-secondary text-sm"
        >
          {loading === "csv" ? "Preparing..." : "Export CSV"}
        </button>
        <button
          onClick={handleExportXlsx}
          disabled={loading !== null}
          className="btn-primary text-sm"
        >
          {loading === "xlsx" ? "Preparing..." : "Export Excel (.xlsx)"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
