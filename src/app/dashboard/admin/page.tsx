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
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!currentProfile?.is_admin) redirect("/dashboard");

  const [{ data: departments }, { data: profiles }] = await Promise.all([
    supabase.from("departments").select("*").order("name"),
    supabase.from("profiles").select("*").order("full_name"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Admin</h1>
        <p className="text-sm text-slate-500">Manage departments and employee access.</p>
      </div>

      <DepartmentAdmin departments={(departments as Department[]) ?? []} />
      <EmployeeAdmin
        profiles={(profiles as Profile[]) ?? []}
        departments={(departments as Department[]) ?? []}
        currentUserId={user.id}
      />
    </div>
  );
}
