"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Department } from "@/lib/types";

export default function DepartmentAdmin({ departments }: { departments: Department[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    const supabase = createClient();
    await supabase.from("departments").insert({ name: name.trim() });
    setName("");
    setLoading(false);
    router.refresh();
  }

  async function handleRename(dept: Department) {
    const newName = window.prompt("Rename department", dept.name);
    if (!newName || newName === dept.name) return;
    const supabase = createClient();
    await supabase.from("departments").update({ name: newName }).eq("id", dept.id);
    router.refresh();
  }

  async function handleDelete(dept: Department) {
    if (!window.confirm(`Delete "${dept.name}"? Tasks in it will also be deleted.`)) return;
    const supabase = createClient();
    await supabase.from("departments").delete().eq("id", dept.id);
    router.refresh();
  }

  return (
    <div className="card p-5">
      <h2 className="mb-3 text-sm font-semibold text-slate-700">Departments</h2>

      <form onSubmit={handleAdd} className="mb-4 flex gap-2">
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Engineering"
        />
        <button type="submit" disabled={loading} className="btn-primary">
          Add
        </button>
      </form>

      <ul className="divide-y divide-sky-50">
        {departments.map((d) => (
          <li key={d.id} className="flex items-center justify-between py-2 text-sm">
            <span className="text-slate-700">{d.name}</span>
            <div className="flex gap-3">
              <button onClick={() => handleRename(d)} className="text-slate-400 hover:text-sky-600">
                Rename
              </button>
              <button onClick={() => handleDelete(d)} className="text-slate-400 hover:text-red-500">
                Delete
              </button>
            </div>
          </li>
        ))}
        {departments.length === 0 && (
          <p className="py-2 text-sm text-slate-400">No departments yet.</p>
        )}
      </ul>
    </div>
  );
}
