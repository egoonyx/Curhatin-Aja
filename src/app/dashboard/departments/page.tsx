import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DepartmentsPage() {
  const supabase = await createClient();

  const [{ data: departments }, { data: profiles }, { data: tasks }] = await Promise.all([
    supabase.from("departments").select("*").order("name"),
    supabase.from("profiles").select("id, department_id"),
    supabase.from("tasks").select("id, department_id, status"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Departments</h1>
        <p className="text-sm text-slate-500">
          Each segment has its own task board. Admins can add departments from the Admin page.
        </p>
      </div>

      {!departments || departments.length === 0 ? (
        <div className="card p-6 text-sm text-slate-500">
          No departments yet. An admin can create one from the Admin page.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((dept) => {
            const memberCount = (profiles ?? []).filter(
              (p) => p.department_id === dept.id
            ).length;
            const deptTasks = (tasks ?? []).filter((t) => t.department_id === dept.id);
            const openCount = deptTasks.filter((t) => t.status !== "done").length;

            return (
              <Link key={dept.id} href={`/dashboard/departments/${dept.id}`} className="card p-5 hover:border-sky-300">
                <h2 className="text-base font-semibold text-slate-800">{dept.name}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {memberCount} member{memberCount === 1 ? "" : "s"}
                </p>
                <p className="mt-3 text-xs font-medium text-sky-600">
                  {openCount} open task{openCount === 1 ? "" : "s"}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
