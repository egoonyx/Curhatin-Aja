import Link from "next/link";
import Avatar from "@/components/Avatar";
import { formatDate, isOverdue } from "@/lib/utils";
import type { Profile, Task } from "@/lib/types";

const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-slate-100 text-slate-600",
  normal: "bg-sky-100 text-sky-700",
  high: "bg-red-100 text-red-700",
};

export default function TaskCard({
  task,
  assignees,
  showDepartment,
}: {
  task: Task;
  assignees: Profile[];
  showDepartment?: string;
}) {
  const overdue = isOverdue(task.deadline, task.status);

  return (
    <Link href={`/dashboard/tasks/${task.id}`} className="card block p-4 hover:border-sky-300">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium text-slate-800">{task.title}</h3>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[task.priority]}`}
        >
          {task.priority}
        </span>
      </div>

      {showDepartment && (
        <p className="mb-2 text-xs font-medium text-sky-600">{showDepartment}</p>
      )}

      {task.deadline && (
        <p className={`mb-3 text-xs ${overdue ? "font-medium text-red-500" : "text-slate-400"}`}>
          Due {formatDate(task.deadline)}
        </p>
      )}

      {assignees.length > 0 && (
        <div className="flex -space-x-2">
          {assignees.slice(0, 4).map((p) => (
            <div key={p.id} title={p.full_name} className="ring-2 ring-white rounded-full">
              <Avatar name={p.full_name} url={p.avatar_url} size={24} />
            </div>
          ))}
          {assignees.length > 4 && (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-medium text-slate-500 ring-2 ring-white">
              +{assignees.length - 4}
            </div>
          )}
        </div>
      )}
    </Link>
  );
}
