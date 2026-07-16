"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DAY_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { SpecialistCertificate, SpecialistProfile } from "@/lib/types";

export default function SpecialistFields({
  profileId,
  initialSpecialist,
  initialCertificates,
}: {
  profileId: string;
  initialSpecialist: SpecialistProfile | null;
  initialCertificates: SpecialistCertificate[];
}) {
  const router = useRouter();
  const [specialization, setSpecialization] = useState(
    initialSpecialist?.specialization ?? ""
  );
  const [availabilityDays, setAvailabilityDays] = useState<number[]>(
    initialSpecialist?.availability_days ?? []
  );
  const [startTime, setStartTime] = useState(
    (initialSpecialist?.availability_start_time ?? "09:00").slice(0, 5)
  );
  const [endTime, setEndTime] = useState(
    (initialSpecialist?.availability_end_time ?? "17:00").slice(0, 5)
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);

  function toggleDay(day: number) {
    setAvailabilityDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    const supabase = createClient();
    await supabase.from("specialist_profiles").upsert({
      profile_id: profileId,
      specialization: specialization || null,
      availability_days: availabilityDays,
      availability_start_time: startTime,
      availability_end_time: endTime,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  async function handleUploadCertificate(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    const supabase = createClient();

    const path = `${profileId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("certificates")
      .upload(path, file);

    if (!uploadError) {
      const fileUrl = supabase.storage.from("certificates").getPublicUrl(path).data.publicUrl;
      await supabase.from("specialist_certificates").insert({
        profile_id: profileId,
        file_name: file.name,
        file_url: fileUrl,
        uploaded_by: profileId,
      });
    }

    setUploading(false);
    router.refresh();
  }

  async function handleRemoveCertificate(cert: SpecialistCertificate) {
    if (!confirm(`Remove "${cert.file_name}"?`)) return;
    const supabase = createClient();
    await supabase.from("specialist_certificates").delete().eq("id", cert.id);
    const marker = "/certificates/";
    const idx = cert.file_url.indexOf(marker);
    if (idx !== -1) {
      await supabase.storage.from("certificates").remove([cert.file_url.slice(idx + marker.length)]);
    }
    router.refresh();
  }

  return (
    <div className="card space-y-4 p-6">
      <div>
        <h2 className="text-sm font-semibold text-slate-700">Specialist details</h2>
        <p className="text-xs text-slate-400">
          Shown in the Directory: your specialization and weekly availability. Certificates
          below are for internal record-keeping only.
        </p>
      </div>

      <div>
        <label className="label">Specialization</label>
        <input
          className="input"
          value={specialization}
          onChange={(e) => setSpecialization(e.target.value)}
          placeholder="e.g. Child psychology, Cognitive behavioral therapy"
        />
      </div>

      <div>
        <label className="label">Weekly availability</label>
        <div className="flex flex-wrap gap-1.5">
          {DAY_LABELS.map((label, day) => (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              className={cn(
                "h-9 w-9 rounded-full text-xs font-medium transition-colors",
                availabilityDays.includes(day)
                  ? "bg-sky-500 text-white"
                  : "bg-sky-50 text-slate-500 hover:bg-sky-100"
              )}
            >
              {label[0]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Available from</label>
          <input
            type="time"
            className="input"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Available until</label>
          <input
            type="time"
            className="input"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="button" onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? "Saving..." : "Save specialist details"}
        </button>
        {saved && <span className="text-sm text-emerald-600">Saved.</span>}
      </div>

      <div className="border-t border-sky-50 pt-4">
        <div className="mb-2 flex items-center justify-between">
          <label className="label mb-0">Certificates</label>
          <label className="btn-secondary relative inline-flex cursor-pointer items-center justify-center text-xs">
            {uploading ? "Uploading..." : "+ Upload certificate"}
            <input
              type="file"
              className="sr-only"
              disabled={uploading}
              onChange={handleUploadCertificate}
            />
          </label>
        </div>
        <div className="space-y-1">
          {initialCertificates.length === 0 && (
            <p className="text-xs text-slate-400">No certificates uploaded yet.</p>
          )}
          {initialCertificates.map((cert) => (
            <div
              key={cert.id}
              className="flex items-center justify-between rounded-lg bg-sky-50 px-3 py-2 text-sm"
            >
              <a
                href={cert.file_url}
                target="_blank"
                rel="noreferrer"
                className="truncate text-sky-600 hover:underline"
              >
                📄 {cert.file_name}
              </a>
              <button
                onClick={() => handleRemoveCertificate(cert)}
                className="shrink-0 pl-2 text-xs text-slate-400 hover:text-red-500"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
