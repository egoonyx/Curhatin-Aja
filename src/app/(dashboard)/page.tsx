import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatTime, isOverdue } from "@/lib/utils";
import type { Attendance, Task } from "@/lib/types";

export default async function OverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: profile }, { data: todayAttendance }, { data: assignedTaskRows }] =
    await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", user.id).single(),
      supabase
        .from("attendance")
        .select("*")
        .eq("profile_id", user.id)
        .eq("date", today)
        .maybeSingle(),
      supabase
        .from("task_assignees")
        .select("tasks(*)")
        .eq("profile_id", user.id),
    ]);

  const myTasks = (assignedTaskRows ?? [])
    .map((r) => r.tasks as unknown as Task)
    .filter(Boolean);
  const openTasks = myTasks.filter((t) => t.status !== "done");
  const dueSoon = [...openTasks]
    .filter((t) => t.deadline)
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
    .slice(0, 5);

  const attendance = todayAttendance as Attendance | null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">
          Welcome back, {profile?.full_name?.split(" ")[0] ?? "there"} 👋
        </h1>
        <p className="text-sm text-slate-500">{formatDate(new Date().toISOString())}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link href="/dashboard/attendance" className="card p-5 hover:border-sky-300">
          <p className="text-sm text-slate-500">Today&apos;s attendance</p>
          <p className="mt-1 text-lg font-semibold text-slate-800">
            {attendance?.check_in
              ? attendance.check_out
                ? `Checked out ${formatTime(attendance.check_out)}`
                : `Checked in ${formatTime(attendance.check_in)}`
              : "Not checked in yet"}
          </p>
        </Link>

        <Link href="/dashboard/tasks" className="card p-5 hover:border-sky-300">
          <p className="text-sm text-slate-500">Open tasks assigned to you</p>
          <p className="mt-1 text-lg font-semibold text-slate-800">
            {openTasks.length}
          </p>
        </Link>

        <Link href="/dashboard/chat" className="card p-5 hover:border-sky-300">
          <p className="text-sm text-slate-500">Team chat</p>
          <p className="mt-1 text-lg font-semibold text-slate-800">Open conversations</p>
        </Link>
      </div>

      <div className="card p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          Upcoming deadlines
        </h2>
        {dueSoon.length === 0 ? (
          <p className="text-sm text-slate-400">Nothing due - you&apos;re all caught up.</p>
        ) : (
          <ul className="divide-y divide-sky-50">
            {dueSoon.map((task) => (
              <li key={task.id} className="flex items-center justify-between py-2">
                <Link
                  href={`/dashboard/tasks/${task.id}`}
                  className="text-sm font-medium text-slate-700 hover:text-sky-600"
                >
                  {task.title}
                </Link>
                <span
                  className={
                    isOverdue(task.deadline, task.status)
                      ? "text-xs font-medium text-red-500"
                      : "text-xs text-slate-400"
                  }
                >
                  {formatDate(task.deadline)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
