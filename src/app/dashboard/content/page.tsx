import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ContentAnalysisView from "@/components/ContentAnalysisView";
import type { ContentPost, Profile } from "@/lib/types";

export default async function ContentAnalysisPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const p = profile as Profile;

  const { data: marketingDept } = await supabase
    .from("departments")
    .select("*")
    .eq("name", "Marketing")
    .maybeSingle();

  if (!marketingDept) redirect("/dashboard");

  const isMember = p.department_id === marketingDept.id;
  const isOverseeing =
    p.role === "super_admin" || (p.role === "admin" && p.department_id === marketingDept.id);

  if (!isMember && !isOverseeing) redirect("/dashboard");

  const { data: posts } = await supabase
    .from("content_posts")
    .select("*")
    .eq("department_id", marketingDept.id)
    .order("posted_at", { ascending: false });

  const canExport = p.role === "super_admin" || p.role === "admin";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Content Analysis</h1>
        <p className="text-sm text-slate-500">
          Drop in a link to your posted content - we&apos;ll try to read it and summarize it,
          alongside the real numbers you track. Weekly and monthly reports roll everything up.
        </p>
      </div>

      <ContentAnalysisView
        currentUserId={user.id}
        departmentId={marketingDept.id}
        canExport={canExport}
        canDeleteAny={p.role === "super_admin" || p.role === "admin"}
        posts={(posts as ContentPost[]) ?? []}
      />
    </div>
  );
}
