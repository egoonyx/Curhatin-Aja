import { formatDateTime } from "@/lib/utils";
import type { Profile, TaskStatusUpdate } from "@/lib/types";

const STATUS_LABELS: Record<string, string> = {
  todo: "New task",
  revision: "Revision",
  reviewing: "Reviewing",
  done: "Complete",
};

export default function TaskStatusHistory({
  updates,
  profilesById,
}: {
  updates: TaskStatusUpdate[];
  profilesById: Record<string, Profile>;
}) {
  if (updates.length === 0) return null;

  return (
    <div className="card p-6">
      <h2 className="mb-3 text-sm font-semibold text-slate-700">Status history</h2>
      <div className="space-y-3">
        {updates.map((u) => {
          const who = u.changed_by ? profilesById[u.changed_by]?.full_name : null;
          return (
            <div key={u.id} className="border-l-2 border-sky-100 pl-3">
              <p className="text-sm text-slate-700">
                <span className="font-medium">{who ?? "Someone"}</span> moved this to{" "}
                <span className="font-medium">{STATUS_LABELS[u.to_status] ?? u.to_status}</span>
              </p>
              {u.note && (
                <p className="mt-1 whitespace-pre-wrap rounded-lg bg-sky-50 px-3 py-2 text-sm text-slate-600">
                  {u.note}
                </p>
              )}
              <p className="mt-1 text-xs text-slate-400">{formatDateTime(u.created_at)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
