import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import type { Profile } from "@/lib/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sky-50 px-4">
        <div className="card max-w-sm p-6 text-center">
          <h2 className="mb-2 text-lg font-semibold text-slate-800">
            Profile not found
          </h2>
          <p className="text-sm text-slate-500">
            Your account exists but your profile hasn&apos;t finished setting up yet.
            Try logging out and back in, or contact an admin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-sky-50">
      <input type="checkbox" id="sidebar-toggle" className="peer hidden" />
      <label
        htmlFor="sidebar-toggle"
        aria-hidden="true"
        className="fixed inset-0 z-30 hidden bg-slate-900/40 peer-checked:block lg:!hidden"
      />
      <Sidebar isAdmin={(profile as Profile).is_admin} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar profile={profile as Profile} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
