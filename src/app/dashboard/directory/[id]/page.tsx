import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Avatar from "@/components/Avatar";
import MessageButton from "@/components/MessageButton";
import { scheduleSummary } from "@/components/WorkScheduleEditor";
import type { Profile, SpecialistProfile } from "@/lib/types";

export default async function ProfileDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: department }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("profiles")
      .select("department_id")
      .eq("id", id)
      .maybeSingle()
      .then(async (res) => {
        if (!res.data?.department_id) return { data: null };
        return supabase
          .from("departments")
          .select("*")
          .eq("id", res.data.department_id)
          .maybeSingle();
      }),
  ]);

  if (!profile) notFound();
  const p = profile as Profile;
  const isSpecialist = (department as { name: string } | null)?.name === "Specialists";

  let specialist: SpecialistProfile | null = null;
  if (isSpecialist) {
    const { data } = await supabase
      .from("specialist_profiles")
      .select("*")
      .eq("profile_id", id)
      .maybeSingle();
    specialist = data as SpecialistProfile | null;
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link href="/dashboard/directory" className="text-sm text-sky-600 hover:underline">
        ← Directory
      </Link>

      <div className="card p-6">
        <div className="flex items-center gap-4">
          <Avatar name={p.full_name} url={p.avatar_url} size={64} />
          <div>
            <h1 className="text-lg font-semibold text-slate-800">{p.full_name}</h1>
            <p className="text-sm text-slate-500">
              {isSpecialist ? specialist?.specialization || "Specialist" : p.job_title}
            </p>
            {department && (
              <p className="mt-1 inline-block rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">
                {(department as { name: string }).name}
              </p>
            )}
          </div>
        </div>

        {isSpecialist ? (
          <div className="mt-5 border-t border-sky-50 pt-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Availability
            </p>
            <p className="text-sm text-slate-600">
              {specialist
                ? scheduleSummary(
                    specialist.availability_days,
                    specialist.availability_start_time ?? "09:00",
                    specialist.availability_end_time ?? "17:00"
                  )
                : "Not set yet"}
            </p>
          </div>
        ) : (
          p.job_desk && (
            <div className="mt-5 border-t border-sky-50 pt-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Job desk
              </p>
              <p className="whitespace-pre-wrap text-sm text-slate-600">{p.job_desk}</p>
            </div>
          )
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-sky-50 pt-4">
          {p.whatsapp && (
            <a
              href={`https://wa.me/${p.whatsapp.replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary"
            >
              📱 WhatsApp
            </a>
          )}
          {p.id !== user.id && (
            <MessageButton currentUserId={user.id} targetUserId={p.id} />
          )}
        </div>
      </div>
    </div>
  );
}
