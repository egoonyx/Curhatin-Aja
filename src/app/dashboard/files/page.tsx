import { createClient } from "@/lib/supabase/server";
import FileGallery from "@/components/FileGallery";
import type { Department, Profile } from "@/lib/types";

export default async function FilesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: departments }, { data: allProfiles }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("departments").select("*").order("name"),
    supabase.from("profiles").select("*").order("full_name"),
  ]);

  const myProfile = profile as Profile;
  const departmentList = (departments as Department[]) ?? [];
  const defaultDepartmentId = myProfile?.department_id ?? departmentList[0]?.id ?? "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Files</h1>
        <p className="text-sm text-slate-500">
          A shared drive for your department - upload, browse, and share files with anyone.
        </p>
      </div>

      <FileGallery
        currentUserId={user.id}
        isAdmin={myProfile?.is_admin ?? false}
        departments={departmentList}
        allProfiles={(allProfiles as Profile[]) ?? []}
        defaultDepartmentId={defaultDepartmentId}
      />
    </div>
  );
}
