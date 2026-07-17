import { createClient } from "@/lib/supabase/server";
import ProfileEditForm from "@/components/ProfileEditForm";
import AccountSecurityForm from "@/components/AccountSecurityForm";
import PushNotificationToggle from "@/components/PushNotificationToggle";
import SpecialistFields from "@/components/SpecialistFields";
import type {
  Department,
  Profile,
  SpecialistCertificate,
  SpecialistProfile,
} from "@/lib/types";

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

  const p = profile as Profile;
  const allDepartments = (departments as Department[]) ?? [];
  const myDept = allDepartments.find((d) => d.id === p.department_id);
  const isSpecialist = myDept?.name === "Specialists";

  let specialistProfile: SpecialistProfile | null = null;
  let certificates: SpecialistCertificate[] = [];

  if (isSpecialist) {
    const [{ data: specialist }, { data: certs }] = await Promise.all([
      supabase.from("specialist_profiles").select("*").eq("profile_id", user.id).maybeSingle(),
      supabase
        .from("specialist_certificates")
        .select("*")
        .eq("profile_id", user.id)
        .order("created_at", { ascending: false }),
    ]);
    specialistProfile = specialist as SpecialistProfile | null;
    certificates = (certs as SpecialistCertificate[]) ?? [];
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">My profile</h1>
        <p className="text-sm text-slate-500">Keep your role and contact info up to date.</p>
      </div>
      <ProfileEditForm profile={p} departments={allDepartments} />

      <PushNotificationToggle currentUserId={user.id} />

      {isSpecialist && (
        <SpecialistFields
          profileId={user.id}
          initialSpecialist={specialistProfile}
          initialCertificates={certificates}
        />
      )}

      <div>
        <h2 className="text-lg font-semibold text-slate-800">Account & security</h2>
        <p className="text-sm text-slate-500">Update your login email or password.</p>
      </div>
      <AccountSecurityForm currentEmail={user.email ?? ""} />
    </div>
  );
}
