import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import TaskDetail from "@/components/TaskDetail";
import TaskComments from "@/components/TaskComments";
import TaskAttachments from "@/components/TaskAttachments";
import type { Profile, Task, TaskAttachment, TaskComment } from "@/lib/types";

export default async function TaskDetailPage({
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

  const [{ data: task }, { data: currentProfile }, { data: allProfiles }] = await Promise.all([
    supabase.from("tasks").select("*, departments(name)").eq("id", id).maybeSingle(),
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("profiles").select("*").order("full_name"),
  ]);

  if (!task) notFound();

  const [{ data: assigneeRows }, { data: comments }, { data: attachments }] = await Promise.all([
    supabase.from("task_assignees").select("profiles(*)").eq("task_id", id),
    supabase
      .from("task_comments")
      .select("*")
      .eq("task_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("task_attachments")
      .select("*")
      .eq("task_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const assignees = (assigneeRows ?? [])
    .map((r) => r.profiles as unknown as Profile)
    .filter(Boolean);

  const profilesById = Object.fromEntries(
    ((allProfiles as Profile[]) ?? []).map((p) => [p.id, p])
  );

  const canEdit =
    (currentProfile as Profile).is_admin || task.created_by === user.id;

  const departmentName = (task as unknown as { departments: { name: string } | null })
    .departments?.name;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/dashboard/tasks" className="text-sm text-sky-600 hover:underline">
        ← My Tasks
      </Link>
      {departmentName && (
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          {departmentName}
        </p>
      )}

      <TaskDetail
        task={task as Task}
        canEdit={canEdit}
        allProfiles={(allProfiles as Profile[]) ?? []}
        assignees={assignees}
      />

      <TaskAttachments
        taskId={id}
        currentUserId={user.id}
        attachments={(attachments as TaskAttachment[]) ?? []}
        canDelete={canEdit}
      />

      <TaskComments
        taskId={id}
        currentUserId={user.id}
        comments={(comments as TaskComment[]) ?? []}
        profilesById={profilesById}
      />
    </div>
  );
}
