import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Avatar from "@/components/Avatar";
import type { Department, Profile, SpecialistProfile } from "@/lib/types";

export default async function DirectoryPage() {
  const supabase = await createClient();

  const [{ data: profiles }, { data: departments }, { data: specialists }] = await Promise.all([
    supabase.from("profiles").select("*").order("full_name"),
    supabase.from("departments").select("*").order("name"),
    supabase.from("specialist_profiles").select("*"),
  ]);

  const allDepartments = (departments as Department[]) ?? [];
  const departmentsById = Object.fromEntries(allDepartments.map((d) => [d.id, d.name]));
  const specialistsByProfileId = Object.fromEntries(
    ((specialists as SpecialistProfile[]) ?? []).map((s) => [s.profile_id, s])
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Directory</h1>
        <p className="text-sm text-slate-500">Everyone at Curhatin Aja, with their role and job desk.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {((profiles as Profile[]) ?? []).map((p) => {
          const isSpecialist = departmentsById[p.department_id ?? ""] === "Specialists";
          const specialist = specialistsByProfileId[p.id];
          return (
            <Link
              key={p.id}
              href={`/dashboard/directory/${p.id}`}
              className="card p-5 hover:border-sky-300"
            >
              <div className="flex items-center gap-3">
                <Avatar name={p.full_name} url={p.avatar_url} size={44} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">{p.full_name}</p>
                  <p className="truncate text-xs text-slate-500">
                    {isSpecialist ? specialist?.specialization || "Specialist" : p.job_title}
                  </p>
                </div>
              </div>
              {p.department_id && (
                <p className="mt-3 inline-block rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">
                  {departmentsById[p.department_id] ?? "Unknown"}
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
