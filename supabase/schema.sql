-- Curhatin Aja - full database schema
-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New query)
-- Safe to re-run: uses "if not exists" / "or replace" where possible.

create extension if not exists "pgcrypto";

-- =========================================================
-- TABLES
-- =========================================================

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null,
  job_title text not null,
  job_desk text,
  whatsapp text,
  avatar_url text,
  department_id uuid references public.departments (id) on delete set null,
  is_admin boolean not null default false,
  -- work schedule: which days this person is expected to work (0=Sun..6=Sat)
  -- and their working hours, so attendance/late checks only apply on those days
  work_days smallint[] not null default '{1,2,3,4,5}',
  work_start_time time not null default '09:00',
  work_end_time time not null default '17:00',
  created_at timestamptz not null default now()
);

-- for installs that ran an earlier version of this schema before the
-- work schedule columns existed; safe to re-run
alter table public.profiles add column if not exists work_days smallint[] not null default '{1,2,3,4,5}';
alter table public.profiles add column if not exists work_start_time time not null default '09:00';
alter table public.profiles add column if not exists work_end_time time not null default '17:00';

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  department_id uuid not null references public.departments (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  deadline timestamptz,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- workflow upgrade: new task -> revision -> reviewing -> complete
-- (collapses the old "in_progress" state into "todo" so existing rows stay valid)
update public.tasks set status = 'todo' where status = 'in_progress';

alter table public.tasks drop constraint if exists tasks_status_check;
alter table public.tasks add constraint tasks_status_check
  check (status in ('todo', 'revision', 'reviewing', 'done'));

create table if not exists public.task_status_updates (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  changed_by uuid references public.profiles (id) on delete set null,
  from_status text,
  to_status text not null,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.task_assignees (
  task_id uuid not null references public.tasks (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  primary key (task_id, profile_id)
);

create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  uploaded_by uuid references public.profiles (id) on delete set null,
  file_url text not null,
  file_name text not null,
  created_at timestamptz not null default now()
);

-- =========================================================
-- FILE GALLERY (Drive-style department file store)
-- Every file belongs to one department; the uploader (or an admin) can
-- also share it with individual people outside that department via
-- file_shares. Task/chat attachments can either upload fresh (which also
-- saves a copy here) or link an existing gallery file.
-- =========================================================

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments (id) on delete cascade,
  uploaded_by uuid references public.profiles (id) on delete set null,
  file_name text not null,
  file_url text not null,
  file_size bigint,
  created_at timestamptz not null default now()
);

create table if not exists public.file_shares (
  file_id uuid not null references public.files (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  shared_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (file_id, profile_id)
);

-- optional link back to the gallery file a task attachment came from
-- (the chat_messages equivalent is added further below, after that table exists)
alter table public.task_attachments add column if not exists gallery_file_id uuid references public.files (id) on delete set null;

-- =========================================================
-- MEETINGS (calendar, optionally linked to a task or chat, with an
-- auto-generated Zoom link when ZOOM_* env vars are configured)
-- =========================================================

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  task_id uuid references public.tasks (id) on delete cascade,
  channel_id uuid references public.chat_channels (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  start_time timestamptz not null,
  end_time timestamptz,
  zoom_join_url text,
  zoom_start_url text,
  zoom_meeting_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.meeting_attendees (
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  primary key (meeting_id, profile_id)
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  date date not null default current_date,
  check_in timestamptz,
  check_out timestamptz,
  status text not null default 'present' check (status in ('present', 'late', 'absent', 'leave')),
  note text,
  unique (profile_id, date)
);

create table if not exists public.chat_channels (
  id uuid primary key default gen_random_uuid(),
  name text,
  department_id uuid references public.departments (id) on delete cascade,
  is_dm boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_channel_members (
  channel_id uuid not null references public.chat_channels (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  primary key (channel_id, profile_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.chat_channels (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text,
  attachment_url text,
  attachment_name text,
  created_at timestamptz not null default now()
);

-- optional link back to the gallery file a chat attachment came from
alter table public.chat_messages add column if not exists gallery_file_id uuid references public.files (id) on delete set null;

-- =========================================================
-- updated_at trigger for tasks
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- =========================================================
-- Helper: is_admin (security definer avoids RLS recursion)
-- =========================================================

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_admin from public.profiles where id = uid), false);
$$;

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

alter table public.departments enable row level security;
alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.task_assignees enable row level security;
alter table public.task_comments enable row level security;
alter table public.task_attachments enable row level security;
alter table public.task_status_updates enable row level security;
alter table public.files enable row level security;
alter table public.file_shares enable row level security;
alter table public.meetings enable row level security;
alter table public.meeting_attendees enable row level security;
alter table public.attendance enable row level security;
alter table public.chat_channels enable row level security;
alter table public.chat_channel_members enable row level security;
alter table public.chat_messages enable row level security;

-- departments: readable by anyone, including signed-out visitors, so the
-- signup form can list departments before an account exists; only admins manage
drop policy if exists "departments_select" on public.departments;
create policy "departments_select" on public.departments
  for select to anon, authenticated using (true);

drop policy if exists "departments_write" on public.departments;
create policy "departments_write" on public.departments
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- profiles: directory is visible to every signed-in employee;
-- a user can only create/edit their own row, admins can edit/remove anyone
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profiles_insert" on public.profiles;
create policy "profiles_insert" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles
  for update to authenticated
  using (auth.uid() = id or public.is_admin(auth.uid()))
  with check (auth.uid() = id or public.is_admin(auth.uid()));

drop policy if exists "profiles_delete" on public.profiles;
create policy "profiles_delete" on public.profiles
  for delete to authenticated using (public.is_admin(auth.uid()));

-- tasks: workspace-wide visibility (Basecamp-style), so cross-department
-- collaborators can see tasks they're pulled into
drop policy if exists "tasks_select" on public.tasks;
create policy "tasks_select" on public.tasks
  for select to authenticated using (true);

drop policy if exists "tasks_insert" on public.tasks;
create policy "tasks_insert" on public.tasks
  for insert to authenticated with check (auth.uid() = created_by);

drop policy if exists "tasks_update" on public.tasks;
create policy "tasks_update" on public.tasks
  for update to authenticated
  using (
    auth.uid() = created_by
    or public.is_admin(auth.uid())
    or exists (
      select 1 from public.task_assignees ta
      where ta.task_id = tasks.id and ta.profile_id = auth.uid()
    )
  );

drop policy if exists "tasks_delete" on public.tasks;
create policy "tasks_delete" on public.tasks
  for delete to authenticated
  using (auth.uid() = created_by or public.is_admin(auth.uid()));

-- task_assignees
drop policy if exists "task_assignees_select" on public.task_assignees;
create policy "task_assignees_select" on public.task_assignees
  for select to authenticated using (true);

drop policy if exists "task_assignees_write" on public.task_assignees;
create policy "task_assignees_write" on public.task_assignees
  for all to authenticated
  using (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.tasks t
      where t.id = task_assignees.task_id and t.created_by = auth.uid()
    )
  )
  with check (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.tasks t
      where t.id = task_assignees.task_id and t.created_by = auth.uid()
    )
  );

-- task_comments
drop policy if exists "task_comments_select" on public.task_comments;
create policy "task_comments_select" on public.task_comments
  for select to authenticated using (true);

drop policy if exists "task_comments_insert" on public.task_comments;
create policy "task_comments_insert" on public.task_comments
  for insert to authenticated with check (auth.uid() = profile_id);

drop policy if exists "task_comments_delete" on public.task_comments;
create policy "task_comments_delete" on public.task_comments
  for delete to authenticated
  using (auth.uid() = profile_id or public.is_admin(auth.uid()));

-- task_attachments: workspace-wide visibility, like tasks themselves
drop policy if exists "task_attachments_select" on public.task_attachments;
create policy "task_attachments_select" on public.task_attachments
  for select to authenticated using (true);

drop policy if exists "task_attachments_insert" on public.task_attachments;
create policy "task_attachments_insert" on public.task_attachments
  for insert to authenticated with check (auth.uid() = uploaded_by);

drop policy if exists "task_attachments_delete" on public.task_attachments;
create policy "task_attachments_delete" on public.task_attachments
  for delete to authenticated
  using (auth.uid() = uploaded_by or public.is_admin(auth.uid()));

-- task_status_updates: workspace-wide visibility, like tasks themselves;
-- only the person recording the change can insert their own row
drop policy if exists "task_status_updates_select" on public.task_status_updates;
create policy "task_status_updates_select" on public.task_status_updates
  for select to authenticated using (true);

drop policy if exists "task_status_updates_insert" on public.task_status_updates;
create policy "task_status_updates_insert" on public.task_status_updates
  for insert to authenticated with check (auth.uid() = changed_by);

-- files: visible to your own department, anyone it's individually shared
-- with, the uploader, and admins; anyone can upload into their own department
drop policy if exists "files_select" on public.files;
create policy "files_select" on public.files
  for select to authenticated
  using (
    public.is_admin(auth.uid())
    or uploaded_by = auth.uid()
    or department_id = (select department_id from public.profiles where id = auth.uid())
    or exists (
      select 1 from public.file_shares fs
      where fs.file_id = files.id and fs.profile_id = auth.uid()
    )
  );

drop policy if exists "files_insert" on public.files;
create policy "files_insert" on public.files
  for insert to authenticated with check (auth.uid() = uploaded_by);

drop policy if exists "files_delete" on public.files;
create policy "files_delete" on public.files
  for delete to authenticated
  using (auth.uid() = uploaded_by or public.is_admin(auth.uid()));

-- file_shares: visible to anyone (so "shared with" lists resolve without
-- recursive checks); only the file's owner or an admin can share/unshare it
drop policy if exists "file_shares_select" on public.file_shares;
create policy "file_shares_select" on public.file_shares
  for select to authenticated using (true);

drop policy if exists "file_shares_insert" on public.file_shares;
create policy "file_shares_insert" on public.file_shares
  for insert to authenticated
  with check (
    shared_by = auth.uid()
    and exists (
      select 1 from public.files f
      where f.id = file_shares.file_id
      and (f.uploaded_by = auth.uid() or public.is_admin(auth.uid()))
    )
  );

drop policy if exists "file_shares_delete" on public.file_shares;
create policy "file_shares_delete" on public.file_shares
  for delete to authenticated
  using (
    shared_by = auth.uid()
    or profile_id = auth.uid()
    or public.is_admin(auth.uid())
    or exists (
      select 1 from public.files f
      where f.id = file_shares.file_id and f.uploaded_by = auth.uid()
    )
  );

-- meetings: task-linked meetings are workspace-wide visible (like tasks
-- themselves); channel-linked meetings are only visible to channel members;
-- otherwise visible to the creator, attendees, and admins
drop policy if exists "meetings_select" on public.meetings;
create policy "meetings_select" on public.meetings
  for select to authenticated
  using (
    public.is_admin(auth.uid())
    or created_by = auth.uid()
    or task_id is not null
    or exists (
      select 1 from public.meeting_attendees ma
      where ma.meeting_id = meetings.id and ma.profile_id = auth.uid()
    )
    or (
      channel_id is not null
      and exists (
        select 1 from public.chat_channel_members m
        where m.channel_id = meetings.channel_id and m.profile_id = auth.uid()
      )
    )
  );

drop policy if exists "meetings_insert" on public.meetings;
create policy "meetings_insert" on public.meetings
  for insert to authenticated with check (auth.uid() = created_by);

drop policy if exists "meetings_update" on public.meetings;
create policy "meetings_update" on public.meetings
  for update to authenticated
  using (auth.uid() = created_by or public.is_admin(auth.uid()));

drop policy if exists "meetings_delete" on public.meetings;
create policy "meetings_delete" on public.meetings
  for delete to authenticated
  using (auth.uid() = created_by or public.is_admin(auth.uid()));

-- meeting_attendees: visible to any signed-in user (needed to resolve
-- "who's invited" without recursive checks); only the meeting's creator or
-- an admin can add/remove attendees, and attendees can remove themselves
drop policy if exists "meeting_attendees_select" on public.meeting_attendees;
create policy "meeting_attendees_select" on public.meeting_attendees
  for select to authenticated using (true);

drop policy if exists "meeting_attendees_insert" on public.meeting_attendees;
create policy "meeting_attendees_insert" on public.meeting_attendees
  for insert to authenticated
  with check (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.meetings mt
      where mt.id = meeting_attendees.meeting_id and mt.created_by = auth.uid()
    )
  );

drop policy if exists "meeting_attendees_delete" on public.meeting_attendees;
create policy "meeting_attendees_delete" on public.meeting_attendees
  for delete to authenticated
  using (
    profile_id = auth.uid()
    or public.is_admin(auth.uid())
    or exists (
      select 1 from public.meetings mt
      where mt.id = meeting_attendees.meeting_id and mt.created_by = auth.uid()
    )
  );

-- attendance: private to the employee and admins
drop policy if exists "attendance_select" on public.attendance;
create policy "attendance_select" on public.attendance
  for select to authenticated
  using (auth.uid() = profile_id or public.is_admin(auth.uid()));

drop policy if exists "attendance_insert" on public.attendance;
create policy "attendance_insert" on public.attendance
  for insert to authenticated with check (auth.uid() = profile_id);

drop policy if exists "attendance_update" on public.attendance;
create policy "attendance_update" on public.attendance
  for update to authenticated
  using (auth.uid() = profile_id or public.is_admin(auth.uid()));

-- chat_channels: only members (or admins) can see a channel
drop policy if exists "chat_channels_select" on public.chat_channels;
create policy "chat_channels_select" on public.chat_channels
  for select to authenticated
  using (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.chat_channel_members m
      where m.channel_id = chat_channels.id and m.profile_id = auth.uid()
    )
  );

drop policy if exists "chat_channels_insert" on public.chat_channels;
create policy "chat_channels_insert" on public.chat_channels
  for insert to authenticated with check (auth.uid() = created_by);

-- chat_channel_members: membership rows are visible to any signed-in user
-- (needed to resolve "who's in this DM" without recursive policy checks);
-- only existing members or admins can add new members
drop policy if exists "chat_channel_members_select" on public.chat_channel_members;
create policy "chat_channel_members_select" on public.chat_channel_members
  for select to authenticated using (true);

drop policy if exists "chat_channel_members_insert" on public.chat_channel_members;
create policy "chat_channel_members_insert" on public.chat_channel_members
  for insert to authenticated
  with check (
    profile_id = auth.uid()
    or public.is_admin(auth.uid())
    or exists (
      select 1 from public.chat_channel_members m
      where m.channel_id = chat_channel_members.channel_id and m.profile_id = auth.uid()
    )
  );

drop policy if exists "chat_channel_members_delete" on public.chat_channel_members;
create policy "chat_channel_members_delete" on public.chat_channel_members
  for delete to authenticated
  using (profile_id = auth.uid() or public.is_admin(auth.uid()));

-- chat_messages: only channel members can read/write
drop policy if exists "chat_messages_select" on public.chat_messages;
create policy "chat_messages_select" on public.chat_messages
  for select to authenticated
  using (
    exists (
      select 1 from public.chat_channel_members m
      where m.channel_id = chat_messages.channel_id and m.profile_id = auth.uid()
    )
  );

drop policy if exists "chat_messages_insert" on public.chat_messages;
create policy "chat_messages_insert" on public.chat_messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.chat_channel_members m
      where m.channel_id = chat_messages.channel_id and m.profile_id = auth.uid()
    )
  );

-- =========================================================
-- REALTIME
-- =========================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tasks'
  ) then
    alter publication supabase_realtime add table public.tasks;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'meetings'
  ) then
    alter publication supabase_realtime add table public.meetings;
  end if;
end $$;

-- =========================================================
-- STORAGE BUCKETS
-- Public read is used here for simplicity (internal-tool tradeoff):
-- files are only reachable by an unguessable URL, but anyone with the
-- link could view it. Switch to signed URLs later if that's not enough.
-- =========================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('chat-attachments', 'chat-attachments', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('task-attachments', 'task-attachments', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('gallery-files', 'gallery-files', true)
on conflict (id) do nothing;

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars_auth_write" on storage.objects;
create policy "avatars_auth_write" on storage.objects
  for insert to authenticated with check (bucket_id = 'avatars');

drop policy if exists "avatars_auth_update" on storage.objects;
create policy "avatars_auth_update" on storage.objects
  for update to authenticated using (bucket_id = 'avatars');

drop policy if exists "chat_attachments_public_read" on storage.objects;
create policy "chat_attachments_public_read" on storage.objects
  for select using (bucket_id = 'chat-attachments');

drop policy if exists "chat_attachments_auth_write" on storage.objects;
create policy "chat_attachments_auth_write" on storage.objects
  for insert to authenticated with check (bucket_id = 'chat-attachments');

drop policy if exists "task_attachments_public_read" on storage.objects;
create policy "task_attachments_public_read" on storage.objects
  for select using (bucket_id = 'task-attachments');

drop policy if exists "task_attachments_auth_write" on storage.objects;
create policy "task_attachments_auth_write" on storage.objects
  for insert to authenticated with check (bucket_id = 'task-attachments');

drop policy if exists "task_attachments_auth_delete" on storage.objects;
create policy "task_attachments_auth_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'task-attachments');

drop policy if exists "gallery_files_public_read" on storage.objects;
create policy "gallery_files_public_read" on storage.objects
  for select using (bucket_id = 'gallery-files');

drop policy if exists "gallery_files_auth_write" on storage.objects;
create policy "gallery_files_auth_write" on storage.objects
  for insert to authenticated with check (bucket_id = 'gallery-files');

drop policy if exists "gallery_files_auth_delete" on storage.objects;
create policy "gallery_files_auth_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'gallery-files');

-- =========================================================
-- NOTIFICATIONS
-- Auto-populated by triggers below when: a task is assigned to you,
-- you're added to a chat, or someone joins your department.
-- =========================================================

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  message text not null,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

drop policy if exists "notifications_select" on public.notifications;
create policy "notifications_select" on public.notifications
  for select to authenticated using (auth.uid() = profile_id);

drop policy if exists "notifications_update" on public.notifications;
create policy "notifications_update" on public.notifications
  for update to authenticated using (auth.uid() = profile_id);

-- task assigned -> notify the assignee
create or replace function public.notify_task_assignee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  task_title text;
begin
  select title into task_title from public.tasks where id = new.task_id;
  insert into public.notifications (profile_id, type, message, link)
  values (
    new.profile_id,
    'task_assigned',
    'You were assigned to: ' || coalesce(task_title, 'a task'),
    '/dashboard/tasks/' || new.task_id
  );
  return new;
end;
$$;

drop trigger if exists on_task_assignee_insert on public.task_assignees;
create trigger on_task_assignee_insert
  after insert on public.task_assignees
  for each row execute function public.notify_task_assignee();

-- task status changed -> notify assignees + the creator (except whoever made the change)
create or replace function public.notify_task_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient uuid;
  actor uuid;
  status_label text;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  actor := auth.uid();
  status_label := replace(new.status, '_', ' ');

  for recipient in
    select profile_id from public.task_assignees where task_id = new.id
    union
    select new.created_by where new.created_by is not null
  loop
    if actor is null or recipient <> actor then
      insert into public.notifications (profile_id, type, message, link)
      values (
        recipient,
        'task_status_changed',
        '"' || new.title || '" was moved to ' || status_label,
        '/dashboard/tasks/' || new.id
      );
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists on_task_status_change on public.tasks;
create trigger on_task_status_change
  after update of status on public.tasks
  for each row execute function public.notify_task_status_change();

-- a file was shared with you -> notify you
create or replace function public.notify_file_shared()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  fname text;
begin
  select file_name into fname from public.files where id = new.file_id;
  if new.shared_by is null or new.shared_by <> new.profile_id then
    insert into public.notifications (profile_id, type, message, link)
    values (
      new.profile_id,
      'file_shared',
      'A file was shared with you: ' || coalesce(fname, 'a file'),
      '/dashboard/files'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_file_share_insert on public.file_shares;
create trigger on_file_share_insert
  after insert on public.file_shares
  for each row execute function public.notify_file_shared();

-- invited to a meeting -> notify the attendee (not the meeting's creator)
create or replace function public.notify_meeting_scheduled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  mt record;
begin
  select * into mt from public.meetings where id = new.meeting_id;
  if mt.created_by is distinct from new.profile_id then
    insert into public.notifications (profile_id, type, message, link)
    values (
      new.profile_id,
      'meeting_scheduled',
      'You were invited to a meeting: ' || coalesce(mt.title, 'Untitled meeting')
        || ' at ' || to_char(mt.start_time, 'Mon DD, HH24:MI'),
      case
        when mt.task_id is not null then '/dashboard/tasks/' || mt.task_id
        when mt.channel_id is not null then '/dashboard/chat/' || mt.channel_id
        else '/dashboard/calendar'
      end
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_meeting_attendee_insert on public.meeting_attendees;
create trigger on_meeting_attendee_insert
  after insert on public.meeting_attendees
  for each row execute function public.notify_meeting_scheduled();

-- added to a chat channel/DM -> notify the person added (not the creator)
create or replace function public.notify_chat_member_added()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  chan record;
begin
  select * into chan from public.chat_channels where id = new.channel_id;
  if chan.created_by is distinct from new.profile_id then
    insert into public.notifications (profile_id, type, message, link)
    values (
      new.profile_id,
      'chat_added',
      case
        when chan.is_dm then 'You have a new direct message conversation'
        else 'You were added to #' || coalesce(chan.name, 'a channel')
      end,
      '/dashboard/chat/' || new.channel_id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_chat_member_insert on public.chat_channel_members;
create trigger on_chat_member_insert
  after insert on public.chat_channel_members
  for each row execute function public.notify_chat_member_added();

-- someone joins your department -> notify existing department members
create or replace function public.notify_department_new_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  member record;
  new_name text;
begin
  if new.department_id is null then
    return new;
  end if;
  if TG_OP = 'UPDATE' and old.department_id is not distinct from new.department_id then
    return new;
  end if;

  select full_name into new_name from public.profiles where id = new.id;

  for member in
    select id from public.profiles
    where department_id = new.department_id and id <> new.id
  loop
    insert into public.notifications (profile_id, type, message, link)
    values (
      member.id,
      'department_member',
      coalesce(new_name, 'Someone') || ' joined your department',
      '/dashboard/directory/' || new.id
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists on_profile_department_insert on public.profiles;
create trigger on_profile_department_insert
  after insert on public.profiles
  for each row execute function public.notify_department_new_member();

drop trigger if exists on_profile_department_update on public.profiles;
create trigger on_profile_department_update
  after update of department_id on public.profiles
  for each row execute function public.notify_department_new_member();

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;

-- =========================================================
-- ROLE TIERS: super_admin (sees/manages everything) / admin
-- (scoped to their own department) / employee. The old "is_admin"
-- boolean is kept in sync automatically so every existing check
-- across the app (files, tasks, meetings, etc.) keeps working exactly
-- as before - both admin tiers still count as "is_admin" there.
-- =========================================================

alter table public.profiles add column if not exists role text not null default 'employee';
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('super_admin', 'admin', 'employee'));

create or replace function public.sync_is_admin_from_role()
returns trigger
language plpgsql
as $$
begin
  new.is_admin := (new.role in ('admin', 'super_admin'));
  return new;
end;
$$;

drop trigger if exists profiles_sync_is_admin on public.profiles;
create trigger profiles_sync_is_admin
  before insert or update of role on public.profiles
  for each row execute function public.sync_is_admin_from_role();

-- one-time backfill: anyone already marked admin becomes a department-scoped Admin
update public.profiles set role = 'admin' where is_admin = true and role = 'employee';

-- promote the workspace owner to Super Admin
update public.profiles set role = 'super_admin' where email = 'finance@brandrev.ai';

create or replace function public.is_super_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select role = 'super_admin' from public.profiles where id = uid), false);
$$;

-- the single department a department-scoped Admin manages (their own),
-- or null if they're a Super Admin or a regular employee
create or replace function public.admin_department(uid uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select case
    when (select role from public.profiles where id = uid) = 'admin'
      then (select department_id from public.profiles where id = uid)
    else null
  end;
$$;

-- department hierarchy: lets a "People" Admin also manage the "Specialists"
-- department underneath it. Added here (before admin_manages_department)
-- since that function references this column.
alter table public.departments add column if not exists parent_department_id uuid references public.departments (id) on delete set null;

-- true if uid is a department-scoped Admin whose own department is either
-- dept_id itself, or dept_id's parent department (so a "People" Admin also
-- oversees the "Specialists" - helpers/doctors - department underneath it)
create or replace function public.admin_manages_department(uid uuid, dept_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles pr
    join public.departments d on d.id = dept_id
    where pr.id = uid
      and pr.role = 'admin'
      and (pr.department_id = dept_id or pr.department_id = d.parent_department_id)
  );
$$;

-- department-scoped admin management: Admins can only manage profiles in
-- their own department (or, for People, the Specialists department below
-- it); Super Admins can manage anyone
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles
  for update to authenticated
  using (
    auth.uid() = id
    or public.is_super_admin(auth.uid())
    or (department_id is not null and public.admin_manages_department(auth.uid(), department_id))
  )
  with check (
    auth.uid() = id
    or public.is_super_admin(auth.uid())
    or (department_id is not null and public.admin_manages_department(auth.uid(), department_id))
  );

drop policy if exists "profiles_delete" on public.profiles;
create policy "profiles_delete" on public.profiles
  for delete to authenticated
  using (
    public.is_super_admin(auth.uid())
    or (department_id is not null and public.admin_manages_department(auth.uid(), department_id))
  );

-- only Super Admins add/rename/remove departments themselves
drop policy if exists "departments_write" on public.departments;
create policy "departments_write" on public.departments
  for all to authenticated
  using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

-- attendance: Super Admin sees everyone, department Admin sees only their
-- own department (People admins also see Specialists), everyone else sees
-- just their own record
drop policy if exists "attendance_select" on public.attendance;
create policy "attendance_select" on public.attendance
  for select to authenticated
  using (
    auth.uid() = profile_id
    or public.is_super_admin(auth.uid())
    or exists (
      select 1 from public.profiles pr
      where pr.id = attendance.profile_id
        and pr.department_id is not null
        and public.admin_manages_department(auth.uid(), pr.department_id)
    )
  );

drop policy if exists "attendance_update" on public.attendance;
create policy "attendance_update" on public.attendance
  for update to authenticated
  using (
    auth.uid() = profile_id
    or public.is_super_admin(auth.uid())
    or exists (
      select 1 from public.profiles pr
      where pr.id = attendance.profile_id
        and pr.department_id is not null
        and public.admin_manages_department(auth.uid(), pr.department_id)
    )
  );

-- =========================================================
-- CONTENT ANALYSIS (Marketing) - paste a link, get an AI read on it,
-- plus manually-entered performance numbers; rolled up into weekly/
-- monthly reports. Visible to the owning department's members and to
-- any admin/super admin (for oversight); only admins/super admins can
-- export the reports (enforced in the app, exporting has no separate
-- write to the DB).
-- =========================================================

create table if not exists public.content_posts (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  link_url text not null,
  title text,
  ai_summary text,
  ai_tone text,
  ai_topics text[],
  ai_suggestions text,
  likes bigint not null default 0,
  views bigint not null default 0,
  comments bigint not null default 0,
  shares bigint not null default 0,
  posted_at date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.content_posts enable row level security;

drop policy if exists "content_posts_select" on public.content_posts;
create policy "content_posts_select" on public.content_posts
  for select to authenticated
  using (
    public.is_super_admin(auth.uid())
    or department_id = (select department_id from public.profiles where id = auth.uid())
    or public.admin_manages_department(auth.uid(), department_id)
  );

drop policy if exists "content_posts_insert" on public.content_posts;
create policy "content_posts_insert" on public.content_posts
  for insert to authenticated
  with check (
    auth.uid() = created_by
    and department_id = (select department_id from public.profiles where id = auth.uid())
  );

drop policy if exists "content_posts_update" on public.content_posts;
create policy "content_posts_update" on public.content_posts
  for update to authenticated
  using (
    auth.uid() = created_by
    or public.is_super_admin(auth.uid())
    or public.admin_manages_department(auth.uid(), department_id)
  );

drop policy if exists "content_posts_delete" on public.content_posts;
create policy "content_posts_delete" on public.content_posts
  for delete to authenticated
  using (
    auth.uid() = created_by
    or public.is_super_admin(auth.uid())
    or public.admin_manages_department(auth.uid(), department_id)
  );

-- =========================================================
-- SPECIALISTS (helpers / doctors / psychologists) - a department under
-- People with extra biodata: specialization, weekly availability, and
-- certificates. Directory only ever shows their name, specialization,
-- WhatsApp, chat, and availability for this group - never other
-- private info.
-- =========================================================

alter table public.departments add column if not exists parent_department_id uuid references public.departments (id) on delete set null;

insert into public.departments (name)
select 'Specialists'
where not exists (select 1 from public.departments where name = 'Specialists');

update public.departments
set parent_department_id = (select id from public.departments where name = 'People')
where name = 'Specialists'
  and exists (select 1 from public.departments where name = 'People');

create table if not exists public.specialist_profiles (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  specialization text,
  availability_days smallint[] not null default '{}',
  availability_start_time time,
  availability_end_time time,
  updated_at timestamptz not null default now()
);

alter table public.specialist_profiles enable row level security;

drop policy if exists "specialist_profiles_select" on public.specialist_profiles;
create policy "specialist_profiles_select" on public.specialist_profiles
  for select to authenticated using (true);

drop policy if exists "specialist_profiles_write" on public.specialist_profiles;
create policy "specialist_profiles_write" on public.specialist_profiles
  for all to authenticated
  using (
    profile_id = auth.uid()
    or public.is_super_admin(auth.uid())
    or exists (
      select 1 from public.profiles pr
      where pr.id = specialist_profiles.profile_id
        and pr.department_id is not null
        and public.admin_manages_department(auth.uid(), pr.department_id)
    )
  )
  with check (
    profile_id = auth.uid()
    or public.is_super_admin(auth.uid())
    or exists (
      select 1 from public.profiles pr
      where pr.id = specialist_profiles.profile_id
        and pr.department_id is not null
        and public.admin_manages_department(auth.uid(), pr.department_id)
    )
  );

create table if not exists public.specialist_certificates (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  file_name text not null,
  file_url text not null,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.specialist_certificates enable row level security;

drop policy if exists "specialist_certificates_select" on public.specialist_certificates;
create policy "specialist_certificates_select" on public.specialist_certificates
  for select to authenticated
  using (
    profile_id = auth.uid()
    or public.is_super_admin(auth.uid())
    or exists (
      select 1 from public.profiles pr
      where pr.id = specialist_certificates.profile_id
        and pr.department_id is not null
        and public.admin_manages_department(auth.uid(), pr.department_id)
    )
  );

drop policy if exists "specialist_certificates_insert" on public.specialist_certificates;
create policy "specialist_certificates_insert" on public.specialist_certificates
  for insert to authenticated
  with check (
    profile_id = auth.uid()
    or public.is_super_admin(auth.uid())
    or exists (
      select 1 from public.profiles pr
      where pr.id = specialist_certificates.profile_id
        and pr.department_id is not null
        and public.admin_manages_department(auth.uid(), pr.department_id)
    )
  );

drop policy if exists "specialist_certificates_delete" on public.specialist_certificates;
create policy "specialist_certificates_delete" on public.specialist_certificates
  for delete to authenticated
  using (
    profile_id = auth.uid()
    or public.is_super_admin(auth.uid())
    or exists (
      select 1 from public.profiles pr
      where pr.id = specialist_certificates.profile_id
        and pr.department_id is not null
        and public.admin_manages_department(auth.uid(), pr.department_id)
    )
  );

insert into storage.buckets (id, name, public)
values ('certificates', 'certificates', true)
on conflict (id) do nothing;

drop policy if exists "certificates_public_read" on storage.objects;
create policy "certificates_public_read" on storage.objects
  for select using (bucket_id = 'certificates');

drop policy if exists "certificates_auth_write" on storage.objects;
create policy "certificates_auth_write" on storage.objects
  for insert to authenticated with check (bucket_id = 'certificates');

drop policy if exists "certificates_auth_delete" on storage.objects;
create policy "certificates_auth_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'certificates');

-- =========================================================
-- FILE FOLDERS: lets a department organize its Files gallery into
-- folders (one level deep). A file with folder_id = null sits at the
-- department's root; deleting a folder cascades to the files inside it.
-- =========================================================

create table if not exists public.file_folders (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments (id) on delete cascade,
  name text not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.files add column if not exists folder_id uuid references public.file_folders (id) on delete cascade;

alter table public.file_folders enable row level security;

drop policy if exists "file_folders_select" on public.file_folders;
create policy "file_folders_select" on public.file_folders
  for select to authenticated
  using (
    public.is_admin(auth.uid())
    or department_id = (select department_id from public.profiles where id = auth.uid())
  );

drop policy if exists "file_folders_insert" on public.file_folders;
create policy "file_folders_insert" on public.file_folders
  for insert to authenticated
  with check (
    auth.uid() = created_by
    and department_id = (select department_id from public.profiles where id = auth.uid())
  );

drop policy if exists "file_folders_delete" on public.file_folders;
create policy "file_folders_delete" on public.file_folders
  for delete to authenticated
  using (auth.uid() = created_by or public.is_admin(auth.uid()));

-- =========================================================
-- ACCOUNT DELETION: a Super Admin can remove anyone (except themselves);
-- a department Admin can remove an Employee within a department they
-- manage. Deleting the auth.users row cascades to profiles and
-- everything referencing it (tasks, attendance, files, chat, etc.)
-- since profiles.id references auth.users(id) on delete cascade.
-- =========================================================

create or replace function public.admin_delete_profile(target_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  caller_role text;
  target_role text;
  target_dept uuid;
begin
  if target_id = auth.uid() then
    raise exception 'You cannot delete your own account here.';
  end if;

  select role into caller_role from public.profiles where id = auth.uid();
  select role, department_id into target_role, target_dept
    from public.profiles where id = target_id;

  if caller_role is null then
    raise exception 'Not authorized.';
  end if;

  if caller_role = 'super_admin' then
    -- a Super Admin can remove anyone else
    null;
  elsif caller_role = 'admin'
    and target_role = 'employee'
    and target_dept is not null
    and public.admin_manages_department(auth.uid(), target_dept) then
    -- a department Admin can remove an Employee in a department they manage
    null;
  else
    raise exception 'Not authorized to delete this account.';
  end if;

  delete from auth.users where id = target_id;
end;
$$;

grant execute on function public.admin_delete_profile(uuid) to authenticated;

-- =========================================================
-- WEB PUSH: lets a profile register one or more browser/phone push
-- subscriptions (one per device/browser they've enabled notifications on).
-- Delivery itself happens server-side (Next.js API route using the
-- web-push library + VAPID keys); this table just stores what to push to.
-- =========================================================

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
create policy "push_subscriptions_select_own" on public.push_subscriptions
  for select to authenticated
  using (profile_id = auth.uid());

drop policy if exists "push_subscriptions_insert_own" on public.push_subscriptions;
create policy "push_subscriptions_insert_own" on public.push_subscriptions
  for insert to authenticated
  with check (profile_id = auth.uid());

drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;
create policy "push_subscriptions_delete_own" on public.push_subscriptions
  for delete to authenticated
  using (profile_id = auth.uid());

-- lets the /api/push/notify route (running as whichever signed-in user
-- triggered the notification, e.g. a chat sender or task creator) look up
-- push subscriptions belonging to OTHER profiles so it can deliver to them -
-- normal RLS above only lets someone see their own rows.
create or replace function public.get_push_subscriptions_for(target_ids uuid[])
returns table(profile_id uuid, endpoint text, p256dh text, auth text)
language sql
security definer
set search_path = public
as $$
  select profile_id, endpoint, p256dh, auth
  from public.push_subscriptions
  where profile_id = any(target_ids);
$$;

grant execute on function public.get_push_subscriptions_for(uuid[]) to authenticated;
