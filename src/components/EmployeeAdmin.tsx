"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";
import WorkScheduleEditor from "@/components/WorkScheduleEditor";
import { ROLE_LABELS } from "@/lib/types";
import type { Department, Profile, Role } from "@/lib/types";

export default function EmployeeAdmin({
  profiles,
  departments,
  currentUserId,
  currentUserRole,
}: {
  profiles: Profile[];
  departments: Department[];
  currentUserId: string;
  currentUserRole: Role;
}) {
  const router = useRouter();
  const isSuperAdmin = currentUserRole === "super_admin";

  async function handleDepartmentChange(profileId: string, departmentId: string) {
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ department_id: departmentId || null })
      .eq("id", profileId);
    router.refresh();
  }

  async function handleRoleChange(profileId: string, role: Role) {
    const supabase = createClient();
    await supabase.from("profiles").update({ role }).eq("id", profileId);
    router.refresh();
  }

  return (
    <div className="card p-5">
      <h2 className="mb-3 text-sm font-semibold text-slate-700">Employees</h2>
      <div className="-mx-5 overflow-x-auto px-5">
      <table className="w-full min-w-[620px] text-left text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-slate-400">
            <th className="pb-2">Name</th>
            <th className="pb-2">Department</th>
            <th className="pb-2">Schedule</th>
            <th className="pb-2">Role</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-sky-50">
          {profiles.map((p) => (
            <tr key={p.id}>
              <td className="py-2">
                <div className="flex items-center gap-2">
                  <Avatar name={p.full_name} url={p.avatar_url} size={24} />
                  <div>
                    <p className="text-slate-700">{p.full_name}</p>
                    <p className="text-xs text-slate-400">{p.job_title}</p>
                  </div>
                </div>
              </td>
              <td className="py-2">
                {isSuperAdmin ? (
                  <select
                    className="input py-1 text-sm"
                    defaultValue={p.department_id ?? ""}
                    onChange={(e) => handleDepartmentChange(p.id, e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-slate-500">
                    {departments.find((d) => d.id === p.department_id)?.name ?? "Unassigned"}
                  </span>
                )}
              </td>
              <td className="py-2">
                <WorkScheduleEditor
                  profileId={p.id}
                  initialWorkDays={p.work_days}
                  initialStartTime={p.work_start_time}
                  initialEndTime={p.work_end_time}
                />
              </td>
              <td className="py-2">
                {isSuperAdmin ? (
                  <select
                    className="input py-1 text-sm"
                    defaultValue={p.role}
                    disabled={p.id === currentUserId}
                    title={
                      p.id === currentUserId
                        ? "Ask another Super Admin to change your role"
                        : undefined
                    }
                    onChange={(e) => handleRoleChange(p.id, e.target.value as Role)}
                  >
                    <option value="employee">Employee</option>
                    <option value="admin">Admin (this department)</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                ) : (
                  <span className="text-slate-500">{ROLE_LABELS[p.role]}</span>
                )}
              </td>
            </tr>
          ))}
          {profiles.length === 0 && (
            <tr>
              <td colSpan={4} className="py-4 text-center text-slate-400">
                No one here yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}
