"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";
import type { Department, Profile } from "@/lib/types";

export default function EmployeeAdmin({
  profiles,
  departments,
  currentUserId,
}: {
  profiles: Profile[];
  departments: Department[];
  currentUserId: string;
}) {
  const router = useRouter();

  async function handleDepartmentChange(profileId: string, departmentId: string) {
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ department_id: departmentId || null })
      .eq("id", profileId);
    router.refresh();
  }

  async function handleAdminToggle(profileId: string, isAdmin: boolean) {
    const supabase = createClient();
    await supabase.from("profiles").update({ is_admin: isAdmin }).eq("id", profileId);
    router.refresh();
  }

  return (
    <div className="card p-5">
      <h2 className="mb-3 text-sm font-semibold text-slate-700">Employees</h2>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-slate-400">
            <th className="pb-2">Name</th>
            <th className="pb-2">Department</th>
            <th className="pb-2">Admin</th>
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
              </td>
              <td className="py-2">
                <input
                  type="checkbox"
                  defaultChecked={p.is_admin}
                  disabled={p.id === currentUserId && p.is_admin}
                  onChange={(e) => handleAdminToggle(p.id, e.target.checked)}
                  title={
                    p.id === currentUserId && p.is_admin
                      ? "Ask another admin to remove your admin access"
                      : undefined
                  }
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
