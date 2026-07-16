import { createClient } from "@/lib/supabase/server";
import ProfileEditForm from "@/components/ProfileEditForm";
import AccountSecurityForm from "@/components/AccountSecurityForm";
import type { Department, Profile } from "@/lib/types";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: departments }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("departments").select("*").order("name"),
  ]);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">My profile</h1>
        <p className="text-sm text-slate-500">Keep your role and contact info up to date.</p>
      </div>
      <ProfileEditForm
        profile={profile as Profile}
        departments={(departments as Department[]) ?? []}
      />

      <div>
        <h2 className="text-lg font-semibold text-slate-800">Account & security</h2>
        <p className="text-sm text-slate-500">Update your login email or password.</p>
      </div>
      <AccountSecurityForm currentEmail={user.email ?? ""} />
    </div>
  );
}
