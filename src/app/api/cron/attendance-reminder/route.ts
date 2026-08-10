import { NextResponse } from "next/server";
import { createAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin";
import { notifyProfiles } from "@/lib/notify";

// Runs on a schedule (see vercel.json) with no signed-in user at all, so it
// uses the service-role client and checks a shared secret instead of a
// session. Reminds each employee to check in once their own work_start_time
// has passed for the day, respecting their individual work_days, skipping
// anyone already checked in or already reminded today, and skipping the
// Specialists department (who don't do daily attendance at all).

// Asia/Jakarta has no DST, so a fixed offset is safe and avoids pulling in
// a timezone library for this one calculation.
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

function wibNow() {
  return new Date(Date.now() + WIB_OFFSET_MS);
}

export async function GET(req: Request) {
  if (process.env.CRON_SECRET) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!isAdminClientConfigured()) {
    return NextResponse.json({ skipped: true, reason: "SUPABASE_SERVICE_ROLE_KEY not set" });
  }

  const supabase = createAdminClient();
  const wib = wibNow();
  // reading UTC getters off a clock we've already shifted by +7h gives us
  // WIB wall-clock fields without needing a timezone library.
  const today = wib.toISOString().slice(0, 10);
  const weekday = wib.getUTCDay();
  const nowMinutes = wib.getUTCHours() * 60 + wib.getUTCMinutes();

  const { data: departments, error: deptError } = await supabase
    .from("departments")
    .select("id, name");
  if (deptError) {
    return NextResponse.json({ error: deptError.message }, { status: 500 });
  }
  const specialistsDeptId = departments?.find((d) => d.name === "Specialists")?.id ?? null;

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, department_id, work_days, work_start_time");
  if (profilesError || !profiles) {
    return NextResponse.json(
      { error: profilesError?.message ?? "Could not load profiles" },
      { status: 500 }
    );
  }

  const scheduledToday = profiles.filter(
    (p) =>
      p.department_id !== specialistsDeptId &&
      Array.isArray(p.work_days) &&
      p.work_days.includes(weekday)
  );
  if (scheduledToday.length === 0) {
    return NextResponse.json({ checked: 0, reminded: 0 });
  }

  const profileIds = scheduledToday.map((p) => p.id);

  const [{ data: attendanceRows }, { data: alreadyReminded }] = await Promise.all([
    supabase
      .from("attendance")
      .select("profile_id, check_in")
      .eq("date", today)
      .in("profile_id", profileIds),
    supabase
      .from("check_in_reminders_sent")
      .select("profile_id")
      .eq("date", today)
      .in("profile_id", profileIds),
  ]);

  const checkedInIds = new Set(
    (attendanceRows ?? []).filter((a) => a.check_in).map((a) => a.profile_id)
  );
  const remindedIds = new Set((alreadyReminded ?? []).map((r) => r.profile_id));

  const toRemind = scheduledToday
    .filter((p) => !checkedInIds.has(p.id) && !remindedIds.has(p.id))
    .filter((p) => {
      const [startHour, startMinute] = (p.work_start_time ?? "09:00").split(":").map(Number);
      const startMinutes = startHour * 60 + (startMinute || 0);
      return nowMinutes >= startMinutes;
    })
    .map((p) => p.id);

  if (toRemind.length === 0) {
    return NextResponse.json({ checked: scheduledToday.length, reminded: 0 });
  }

  const { error: insertError } = await supabase
    .from("check_in_reminders_sent")
    .insert(toRemind.map((profileId) => ({ profile_id: profileId, date: today })));
  if (insertError) {
    console.error("[attendance-reminder] Failed to record sent reminders:", insertError);
  }

  await notifyProfiles(supabase, toRemind, {
    title: "Time to check in",
    body: "Don't forget to check in for today on Curhatin Aja.",
    url: "/dashboard/attendance",
  });

  return NextResponse.json({ checked: scheduledToday.length, reminded: toRemind.length });
}
