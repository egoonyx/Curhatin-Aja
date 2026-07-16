import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deleteZoomMeeting, isZoomConfigured } from "@/lib/zoom";

export async function DELETE(
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  const canDelete = meeting.created_by === user.id || profile?.is_admin;
  if (!canDelete) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  if (meeting.zoom_meeting_id && isZoomConfigured()) {
    await deleteZoomMeeting(meeting.zoom_meeting_id);
  }

  const { error } = await supabase.from("meetings").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
