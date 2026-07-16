import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AttendanceButton from "@/components/AttendanceButton";
import Avatar from "@/components/Avatar";
import { formatDate, formatTime } from "@/lib/utils";
import type { Attendance, Profile } from "@/lib/types";

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

  if ((profile as Profile)?.is_admin) {
    const [{ data: profiles }, { data: dayAttendance }] = await Promise.all([
      supabase.from("profiles").select("*").order("full_name"),
      supabase.from("attendance").select("*").eq("date", selectedDate),
    ]);
    allProfiles = (profiles as Profile[]) ?? [];
    allAttendanceForDate = (dayAttendance as Attendance[]) ?? [];
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
        />
      </div>

      <div className="card p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Your last 30 days</h2>
        {!history || history.length === 0 ? (
          <p className="text-sm text-slate-400">No attendance recorded yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
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

          <table className="w-full text-left text-sm">
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
                          record ? STATUS_STYLES[record.status] : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {record?.status ?? "no record"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
