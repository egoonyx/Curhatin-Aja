import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createGoogleMeetEvent, isGoogleMeetConfigured } from "@/lib/googleMeet";

// Creates the meeting link for a scheduled meeting via Google Meet, skipping
// gracefully if it isn't configured yet. Zoom integration has been removed.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: meeting } = await supabase
    .from("meetings")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  const endTime =
    meeting.end_time ?? new Date(new Date(meeting.start_time).getTime() + 30 * 60000).toISOString();

  if (isGoogleMeetConfigured()) {
    const { data: attendeeRows } = await supabase
      .from("meeting_attendees")
      .select("profile_id")
      .eq("meeting_id", id);

    let attendeeEmails: string[] = [];
    const profileIds = (attendeeRows ?? []).map((r) => r.profile_id);
    if (profileIds.length > 0) {
      const { data: attendeeProfiles } = await supabase
        .from("profiles")
        .select("email")
        .in("id", profileIds);
      attendeeEmails = (attendeeProfiles ?? [])
        .map((p) => p.email)
        .filter((email): email is string => Boolean(email));
    }

    const meet = await createGoogleMeetEvent({
      title: meeting.title,
      description: meeting.description,
      startTime: meeting.start_time,
      endTime,
      attendeeEmails,
    });

    if (meet) {
      await supabase
        .from("meetings")
        .update({ meet_join_url: meet.joinUrl, meet_event_id: meet.eventId })
        .eq("id", id);

      return NextResponse.json({ joinUrl: meet.joinUrl, provider: "google_meet" });
    }
  }

  return NextResponse.json({
    skipped: true,
    reason: "Google Meet isn't connected yet - ask an admin to add the Google service account keys.",
  });
}
