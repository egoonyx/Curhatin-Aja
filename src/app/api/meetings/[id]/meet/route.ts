import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createGoogleMeetEvent, isGoogleMeetConfigured } from "@/lib/googleMeet";
import { createZoomMeeting, isZoomConfigured } from "@/lib/zoom";

// Creates the meeting link for a scheduled meeting - Google Meet when it's
// configured, falling back to Zoom so nothing breaks mid-switchover, and
// skipping gracefully if neither is set up yet.
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

  if (isZoomConfigured()) {
    const durationMinutes = Math.max(
      15,
      Math.round((new Date(endTime).getTime() - new Date(meeting.start_time).getTime()) / 60000)
    );

    const zoom = await createZoomMeeting({
      topic: meeting.title,
      startTime: meeting.start_time,
      durationMinutes,
      agenda: meeting.description,
    });

    if (zoom) {
      await supabase
        .from("meetings")
        .update({
          zoom_join_url: zoom.joinUrl,
          zoom_start_url: zoom.startUrl,
          zoom_meeting_id: zoom.meetingId,
        })
        .eq("id", id);

      return NextResponse.json({ joinUrl: zoom.joinUrl, provider: "zoom" });
    }
  }

  return NextResponse.json({
    skipped: true,
    reason: "No video meeting provider is connected yet - ask an admin to add the Google or Zoom API keys.",
  });
}
