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
