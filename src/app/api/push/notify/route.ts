import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPushConfigured, sendPushToProfiles } from "@/lib/push";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  if (!isPushConfigured()) {
    return NextResponse.json({ skipped: true, reason: "Push not configured" });
  }

  const { profileIds, title, body, url } = await req.json();

  if (!Array.isArray(profileIds) || !title || !body) {
    return NextResponse.json({ error: "Missing profileIds, title, or body" }, { status: 400 });
  }

  // don't bother notifying the person who triggered this themselves
  const targets = profileIds.filter((id: string) => id !== user.id);
  if (targets.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  await sendPushToProfiles(supabase, targets, { title, body, url });

  return NextResponse.json({ sent: targets.length });
}
