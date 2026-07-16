import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DepartmentAdmin from "@/components/DepartmentAdmin";
import EmployeeAdmin from "@/components/EmployeeAdmin";
import type { Department, Profile } from "@/lib/types";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const me = currentProfile as Profile;
  if (!me?.is_admin) redirect("/dashboard");

  const [{ data: departments }, { data: profiles }] = await Promise.all([
    supabase.from("departments").select("*").order("name"),
    supabase.from("profiles").select("*").order("full_name"),
  ]);

  const allDepartments = (departments as Department[]) ?? [];
  const allProfiles = (profiles as Profile[]) ?? [];

  const isSuperAdmin = me.role === "super_admin";

  // a department Admin manages their own department, plus any department
  // whose parent is their own (e.g. a "People" Admin also manages
  // "Specialists" underneath it)
  const manageableDeptIds = isSuperAdmin
    ? allDepartments.map((d) => d.id)
    : allDepartments
        .filter((d) => d.id === me.department_id || d.parent_department_id === me.department_id)
        .map((d) => d.id);

  const scopedProfiles = isSuperAdmin
    ? allProfiles
    : allProfiles.filter((p) => p.department_id && manageableDeptIds.includes(p.department_id));

  const scopedDepartments = isSuperAdmin
    ? allDepartments
    : allDepartments.filter((d) => manageableDeptIds.includes(d.id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Admin</h1>
        <p className="text-sm text-slate-500">
          {isSuperAdmin
            ? "Manage departments and everyone's access."
            : "Manage employees in your department."}
        </p>
      </div>

      {isSuperAdmin && <DepartmentAdmin departments={allDepartments} />}
      <EmployeeAdmin
        profiles={scopedProfiles}
        departments={scopedDepartments}
        currentUserId={user.id}
        currentUserRole={me.role}
      />
    </div>
  );
}
