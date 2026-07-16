"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Department } from "@/lib/types";

export default function SignupPage() {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jobDesk, setJobDesk] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("departments")
      .select("*")
      .order("name")
      .then(({ data }) => setDepartments(data ?? []));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          job_title: jobTitle,
          job_desk: jobDesk || null,
          whatsapp: whatsapp || null,
          department_id: departmentId || null,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    const user = data.user;
    if (!user) {
      setError("Something went wrong creating your account.");
      setLoading(false);
      return;
    }

    // No active session means Supabase is set to require email confirmation.
    // The rest of the profile lives in user_metadata until first login.
    if (!data.session) {
      setPendingConfirmation(true);
      setLoading(false);
      return;
    }

    let avatarUrl: string | null = null;
    if (avatarFile) {
      const path = `${user.id}/${Date.now()}-${avatarFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, avatarFile);
      if (!uploadError) {
        avatarUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
      }
    }

    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true });

    const { error: profileError } = await supabase.from("profiles").insert({
      id: user.id,
      email: user.email,
      full_name: fullName,
      job_title: jobTitle,
      job_desk: jobDesk || null,
      whatsapp: whatsapp || null,
      department_id: departmentId || null,
      avatar_url: avatarUrl,
      is_admin: (count ?? 0) === 0,
    });

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  if (pendingConfirmation) {
    return (
      <div className="text-center">
        <h2 className="mb-2 text-lg font-semibold text-slate-800">Check your email</h2>
        <p className="text-sm text-slate-500">
          We sent a confirmation link to <strong>{email}</strong>. Click it, then come
          back and log in to finish setting up your profile.
        </p>
        <Link href="/login" className="btn-primary mt-6 inline-flex">
          Go to login
        </Link>
      </div>
    );
  }

  return (
    <>
      <h2 className="mb-6 text-lg font-semibold text-slate-800">Create your account</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="fullName">
            Full name
          </label>
          <input
            id="fullName"
            required
            className="input"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jane Doe"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@curhatinaja.com"
            />
          </div>
          <div>
            <label className="label" htmlFor="whatsapp">
              WhatsApp number
            </label>
            <input
              id="whatsapp"
              required
              className="input"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+62 812-3456-7890"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="label" htmlFor="confirmPassword">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="jobTitle">
            Current role / job title
          </label>
          <input
            id="jobTitle"
            required
            className="input"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="Social Media Specialist"
          />
        </div>

        <div>
          <label className="label" htmlFor="jobDesk">
            Job desk (what you're responsible for)
          </label>
          <textarea
            id="jobDesk"
            className="input min-h-20"
            value={jobDesk}
            onChange={(e) => setJobDesk(e.target.value)}
            placeholder="Manage content calendar, respond to DMs, weekly reporting..."
          />
        </div>

        <div>
          <label className="label" htmlFor="department">
            Department
          </label>
          <select
            id="department"
            className="input"
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
          >
            <option value="">Not assigned yet</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          {departments.length === 0 && (
            <p className="mt-1 text-xs text-slate-400">
              No departments yet - the first admin can add them after signing up.
            </p>
          )}
        </div>

        <div>
          <label className="label" htmlFor="avatar">
            Profile picture
          </label>
          <input
            id="avatar"
            type="file"
            accept="image/*"
            className="input file:mr-3 file:rounded-lg file:border-0 file:bg-sky-100 file:px-3 file:py-1.5 file:text-sky-700"
            onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-sky-600 hover:underline">
          Log in
        </Link>
      </p>
    </>
  );
}
