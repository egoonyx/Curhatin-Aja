import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fetchAssigneesMap } from "@/lib/tasks";
import TaskBoard from "@/components/TaskBoard";
import NewTaskModal from "@/components/NewTaskModal";
import Avatar from "@/components/Avatar";
import type { Profile, Task } from "@/lib/types";

export default async function DepartmentPage({
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

  const [{ data: department }, { data: tasks }, { data: allProfiles }, { data: members }] =
    await Promise.all([
      supabase.from("departments").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("tasks")
        .select("*")
        .eq("department_id", id)
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").order("full_name"),
      supabase.from("profiles").select("*").eq("department_id", id).order("full_name"),
    ]);

  if (!department) notFound();

  const assigneesMap = await fetchAssigneesMap(supabase, (tasks ?? []).map((t) => t.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/dashboard/departments" className="text-sm text-sky-600 hover:underline">
            ← All departments
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-slate-800">{department.name}</h1>
        </div>
        <NewTaskModal
          departmentId={department.id}
          profiles={(allProfiles as Profile[]) ?? []}
          currentUserId={user.id}
        />
      </div>

      {members && members.length > 0 && (
        <div className="card p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Members
          </p>
          <div className="flex flex-wrap gap-3">
            {(members as Profile[]).map((m) => (
              <Link
                key={m.id}
                href={`/dashboard/directory/${m.id}`}
                className="flex items-center gap-2 rounded-xl px-2 py-1 hover:bg-sky-50"
              >
                <Avatar name={m.full_name} url={m.avatar_url} size={24} />
                <span className="text-sm text-slate-700">{m.full_name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <TaskBoard tasks={(tasks as Task[]) ?? []} assigneesMap={assigneesMap} />
    </div>
  );
}
