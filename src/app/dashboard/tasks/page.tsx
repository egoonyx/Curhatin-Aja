import { createClient } from "@/lib/supabase/server";
import { fetchAssigneesMap } from "@/lib/tasks";
import TaskBoard from "@/components/TaskBoard";
import type { Task } from "@/lib/types";

export default async function MyTasksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: assignedRows }, { data: createdRows }, { data: departments }] =
    await Promise.all([
      supabase.from("task_assignees").select("tasks(*)").eq("profile_id", user.id),
      supabase.from("tasks").select("*").eq("created_by", user.id),
      supabase.from("departments").select("id, name"),
    ]);

  const byId = new Map<string, Task>();
  for (const row of assignedRows ?? []) {
    const task = row.tasks as unknown as Task;
    if (task) byId.set(task.id, task);
  }
  for (const task of (createdRows as Task[]) ?? []) {
    byId.set(task.id, task);
  }

  const tasks = [...byId.values()].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const assigneesMap = await fetchAssigneesMap(supabase, tasks.map((t) => t.id));
  const departmentNames = Object.fromEntries(
    (departments ?? []).map((d) => [d.id, d.name])
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">My Tasks</h1>
        <p className="text-sm text-slate-500">
          Everything assigned to you or created by you, across every department.
        </p>
      </div>

      {tasks.length === 0 ? (
        <div className="card p-6 text-sm text-slate-500">
          Nothing here yet - tasks assigned to you will show up on this board.
        </div>
      ) : (
        <TaskBoard tasks={tasks} assigneesMap={assigneesMap} departmentNames={departmentNames} />
      )}
    </div>
  );
}
