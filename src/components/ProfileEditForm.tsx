"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";
import type { Department, Profile } from "@/lib/types";

export default function ProfileEditForm({
  profile,
  departments,
}: {
  profile: Profile;
  departments: Department[];
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(profile.full_name);
  const [jobTitle, setJobTitle] = useState(profile.job_title);
  const [jobDesk, setJobDesk] = useState(profile.job_desk ?? "");
  const [whatsapp, setWhatsapp] = useState(profile.whatsapp ?? "");
  const [departmentId, setDepartmentId] = useState(profile.department_id ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    const supabase = createClient();

    let newAvatarUrl = avatarUrl;
    if (avatarFile) {
      const path = `${profile.id}/${Date.now()}-${avatarFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, avatarFile);
      if (!uploadError) {
        newAvatarUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
      }
    }

    await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        job_title: jobTitle,
        job_desk: jobDesk || null,
        whatsapp: whatsapp || null,
        department_id: departmentId || null,
        avatar_url: newAvatarUrl,
      })
      .eq("id", profile.id);

    setAvatarUrl(newAvatarUrl);
    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4 p-6">
      <div className="flex items-center gap-4">
        <Avatar name={fullName} url={avatarUrl} size={64} />
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
      </div>

      <div>
        <label className="label">Full name</label>
        <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>

      <div>
        <label className="label">Current role / job title</label>
        <input className="input" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
      </div>

      <div>
        <label className="label">Job desk</label>
        <textarea
          className="input min-h-20"
          value={jobDesk}
          onChange={(e) => setJobDesk(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">WhatsApp</label>
          <input className="input" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
        </div>
        <div>
          <label className="label">Department</label>
          <select
            className="input"
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
          >
            <option value="">Not assigned</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Saving..." : "Save changes"}
        </button>
        {saved && <span className="text-sm text-emerald-600">Saved.</span>}
      </div>
    </form>
  );
}
