import { createClient } from "@/lib/supabase/server";
import CalendarView, { type MeetingWithContext } from "@/components/CalendarView";
import type { Meeting, Profile } from "@/lib/types";

export default async function CalendarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: meetings }, { data: allProfiles }, { data: myProfile }] = await Promise.all([
    supabase
      .from("meetings")
      .select("*, tasks(title), chat_channels(name, is_dm)")
      .order("start_time", { ascending: true }),
    supabase.from("profiles").select("*").order("full_name"),
    supabase.from("profiles").select("is_admin").eq("id", user.id).single(),
  ]);

  const meetingRows = meetings ?? [];
  const meetingIds = meetingRows.map((m) => m.id);

  const { data: attendeeRows } = meetingIds.length
    ? await supabase
        .from("meeting_attendees")
        .select("meeting_id, profiles(*)")
        .in("meeting_id", meetingIds)
    : { data: [] as { meeting_id: string; profiles: Profile }[] };

  const attendeesByMeeting: Record<string, Profile[]> = {};
  (attendeeRows ?? []).forEach((row) => {
    const p = row.profiles as unknown as Profile;
    if (!p) return;
    attendeesByMeeting[row.meeting_id] = attendeesByMeeting[row.meeting_id] ?? [];
    attendeesByMeeting[row.meeting_id].push(p);
  });

  const meetingsWithContext: MeetingWithContext[] = meetingRows.map((m) => {
    const joined = m as unknown as Meeting & {
      tasks: { title: string } | null;
      chat_channels: { name: string | null; is_dm: boolean } | null;
    };
    return {
      ...(joined as Meeting),
      taskTitle: joined.tasks?.title ?? null,
      isChatChannel: Boolean(joined.channel_id),
      attendees: attendeesByMeeting[joined.id] ?? [],
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Calendar</h1>
        <p className="text-sm text-slate-500">
          Meetings scheduled from tasks, chats, or on their own - with a Zoom link when
          connected.
        </p>
      </div>

      <CalendarView
        currentUserId={user.id}
        isAdmin={myProfile?.is_admin ?? false}
        allProfiles={(allProfiles as Profile[]) ?? []}
        meetings={meetingsWithContext}
      />
    </div>
  );
}
