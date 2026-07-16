import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AttendanceButton from "@/components/AttendanceButton";
import AttendanceReport from "@/components/AttendanceReport";
import Avatar from "@/components/Avatar";
import { formatDate, formatTime } from "@/lib/utils";
import type { Attendance, Department, Profile } from "@/lib/types";

const STATUS_STYLES: Record<string, string> = {
  present: "bg-emerald-100 text-emerald-700",
  late: "bg-amber-100 text-amber-700",
  leave: "bg-sky-100 text-sky-700",
  absent: "bg-red-100 text-red-700",
};

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const today = new Date().toISOString().slice(0, 10);
  const selectedDate = date ?? today;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const [{ data: todayAttendance }, { data: history }] = await Promise.all([
    supabase
      .from("attendance")
      .select("*")
      .eq("profile_id", user.id)
      .eq("date", today)
      .maybeSingle(),
    supabase
      .from("attendance")
      .select("*")
      .eq("profile_id", user.id)
      .order("date", { ascending: false })
      .limit(30),
  ]);

  let allProfiles: Profile[] = [];
  let allAttendanceForDate: Attendance[] = [];
  let reportAttendance: Attendance[] = [];
  const me = profile as Profile;

  if (me?.is_admin) {
    const isSuperAdmin = me.role === "super_admin";

    const [{ data: profiles }, { data: departments }] = await Promise.all([
      supabase.from("profiles").select("*").order("full_name"),
      supabase.from("departments").select("*"),
    ]);
    const allDepartments = (departments as Department[]) ?? [];
    const everyone = (profiles as Profile[]) ?? [];

    if (isSuperAdmin) {
      allProfiles = everyone;
    } else {
      // a department Admin manages their own department, plus any
      // department whose parent is their own (People -> Specialists)
      const manageableDeptIds = allDepartments
        .filter((d) => d.id === me.department_id || d.parent_department_id === me.department_id)
        .map((d) => d.id);
      allProfiles = everyone.filter(
        (p) => p.department_id && manageableDeptIds.includes(p.department_id)
      );
    }

    const profileIds = allProfiles.map((p) => p.id);

    const [{ data: dayAttendance }, { data: rangeAttendance }] = await Promise.all([
      supabase.from("attendance").select("*").eq("date", selectedDate),
      profileIds.length
        ? supabase
            .from("attendance")
            .select("*")
            .in("profile_id", profileIds)
            .order("date", { ascending: false })
            .limit(2000)
        : Promise.resolve({ data: [] as Attendance[] }),
    ]);

    allAttendanceForDate = ((dayAttendance as Attendance[]) ?? []).filter((a) =>
      allProfiles.some((p) => p.id === a.profile_id)
    );
    reportAttendance = (rangeAttendance as Attendance[]) ?? [];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Attendance</h1>
        <p className="text-sm text-slate-500">Check in and out, and track your history.</p>
      </div>

      <div className="card p-5">
        <AttendanceButton
          profileId={user.id}
          initialAttendance={todayAttendance as Attendance | null}
          workDays={(profile as Profile)?.work_days ?? [1, 2, 3, 4, 5]}
          workStartTime={(profile as Profile)?.work_start_time ?? "09:00"}
        />
      </div>

      <div className="card p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Your last 30 days</h2>
        {!history || history.length === 0 ? (
          <p className="text-sm text-slate-400">No attendance recorded yet.</p>
        ) : (
          <div className="-mx-5 overflow-x-auto px-5">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-slate-400">
                <th className="pb-2">Date</th>
                <th className="pb-2">Check in</th>
                <th className="pb-2">Check out</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-50">
              {(history as Attendance[]).map((row) => (
                <tr key={row.id}>
                  <td className="py-2">{formatDate(row.date)}</td>
                  <td className="py-2">{formatTime(row.check_in)}</td>
                  <td className="py-2">{formatTime(row.check_out)}</td>
                  <td className="py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[row.status]}`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="py-2 text-slate-500">{row.note ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {(profile as Profile)?.is_admin && (
        <div className="card p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-700">
              Company attendance - {formatDate(selectedDate)}
            </h2>
            <form className="flex items-center gap-2">
              <input
                type="date"
                name="date"
                defaultValue={selectedDate}
                className="input py-1 text-sm"
              />
              <button type="submit" className="btn-secondary py-1 text-sm">
                View
              </button>
            </form>
          </div>

          <div className="-mx-5 overflow-x-auto px-5">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-slate-400">
                <th className="pb-2">Employee</th>
                <th className="pb-2">Check in</th>
                <th className="pb-2">Check out</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-50">
              {allProfiles.map((p) => {
                const record = allAttendanceForDate.find((a) => a.profile_id === p.id);
                const selectedWeekday = new Date(`${selectedDate}T00:00:00`).getDay();
                const scheduledThatDay = (p.work_days ?? []).includes(selectedWeekday);
                return (
                  <tr key={p.id}>
                    <td className="flex items-center gap-2 py-2">
                      <Avatar name={p.full_name} url={p.avatar_url} size={24} />
                      <Link
                        href={`/dashboard/directory/${p.id}`}
                        className="hover:text-sky-600"
                      >
                        {p.full_name}
                      </Link>
                    </td>
                    <td className="py-2">{formatTime(record?.check_in ?? null)}</td>
                    <td className="py-2">{formatTime(record?.check_out ?? null)}</td>
                    <td className="py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          record
                            ? STATUS_STYLES[record.status]
                            : scheduledThatDay
                              ? "bg-slate-100 text-slate-500"
                              : "bg-slate-50 text-slate-400"
                        }`}
                      >
                        {record?.status ?? (scheduledThatDay ? "no record" : "off")}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {me?.is_admin && (
        <AttendanceReport
          profiles={allProfiles}
          attendance={reportAttendance}
          canExport={me.role === "super_admin" || me.role === "admin"}
        />
      )}
    </div>
  );
}
