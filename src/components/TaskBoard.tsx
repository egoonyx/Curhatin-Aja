import TaskCard from "@/components/TaskCard";
import type { Profile, Task, TaskStatus } from "@/lib/types";

const COLUMNS: { key: TaskStatus; label: string }[] = [
  { key: "todo", label: "To do" },
  { key: "in_progress", label: "In progress" },
  { key: "done", label: "Done" },
];

export default function TaskBoard({
  tasks,
  assigneesMap,
  departmentNames,
}: {
  tasks: Task[];
  assigneesMap: Record<string, Profile[]>;
  departmentNames?: Record<string, string>;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {COLUMNS.map((col) => {
        const columnTasks = tasks.filter((t) => t.status === col.key);
        return (
          <div key={col.key} className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-600">
              {col.label}
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-700">
                {columnTasks.length}
              </span>
            </h3>
            <div className="space-y-3">
              {columnTasks.length === 0 && (
                <p className="text-xs text-slate-400">Nothing here.</p>
              )}
              {columnTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  assignees={assigneesMap[task.id] ?? []}
                  showDepartment={departmentNames?.[task.department_id]}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
