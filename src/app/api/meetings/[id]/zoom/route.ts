import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createZoomMeeting, isZoomConfigured } from "@/lib/zoom";

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

  if (!isZoomConfigured()) {
    return NextResponse.json({
      skipped: true,
      reason: "Zoom isn't connected yet - ask an admin to add the Zoom API keys.",
    });
  }

  const { data: meeting } = await supabase
    .from("meetings")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  const durationMinutes = meeting.end_time
    ? Math.max(
        15,
        Math.round(
          (new Date(meeting.end_time).getTime() -
            new Date(meeting.start_time).getTime()) /
            60000
        )
      )
    : 30;

  const zoom = await createZoomMeeting({
    topic: meeting.title,
    startTime: meeting.start_time,
    durationMinutes,
    agenda: meeting.description,
  });

  if (!zoom) {
    return NextResponse.json({
      skipped: true,
      reason: "Could not create the Zoom meeting - check the Zoom API keys.",
    });
  }

  await supabase
    .from("meetings")
    .update({
      zoom_join_url: zoom.joinUrl,
      zoom_start_url: zoom.startUrl,
      zoom_meeting_id: zoom.meetingId,
    })
    .eq("id", id);

  return NextResponse.json({ joinUrl: zoom.joinUrl });
}
