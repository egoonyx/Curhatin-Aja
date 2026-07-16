# Curhatin Aja - Team Workspace

Internal workspace for Curhatin Aja: daily attendance, department task boards with
cross-department collaboration, an employee directory, and team chat.

Stack: Next.js (App Router) + Tailwind CSS + Supabase (Postgres, Auth, Storage, Realtime),
deployed on Vercel.

## 1. Create your Supabase project

1. Go to [supabase.com](https://supabase.com), sign up, and create a new project.
2. Choose a database password and region, then wait for it to finish provisioning.
3. In the project, go to **SQL Editor -> New query**, paste the entire contents of
   [`supabase/schema.sql`](supabase/schema.sql), and run it. This creates every table,
   security policy, and the `avatars` / `chat-attachments` storage buckets.
4. Go to **Authentication -> Providers -> Email** and turn **off** "Confirm email"
   (recommended for an internal tool - people can start using their account right after
   signing up, no email step). If you leave it on, the app still works: it just asks the
   person to confirm their email and finish profile setup on first login.
5. Go to **Project Settings -> API** and copy the **Project URL** and **anon public** key.

## 2. Configure the app

1. Copy `.env.local.example` to `.env.local`.
2. Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from step 1.4.

## 3. Run it locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up as yourself first - the very
first account created automatically becomes an admin. From the Admin page you can then
add departments and adjust anyone's department or admin access.

## 4. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-empty-github-repo-url>
git push -u origin main
```

## 5. Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import the GitHub repo.
2. In the import screen, add the same two environment variables from `.env.local`
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
3. Deploy. Every push to `main` redeploys automatically.

## How it's organized

- `supabase/schema.sql` - every table, row-level security policy, and storage bucket.
  Re-running it is safe (it drops/recreates policies).
- `src/lib/supabase/` - browser client, server client, and the middleware that keeps
  the session cookie fresh and redirects signed-out visitors to `/login`.
- `src/app/(auth)/` - login and signup (signup doubles as the "fill this out before you
  get credentials" form: name, role, job desk, WhatsApp, department, photo).
- `src/app/(dashboard)/` - everything behind login: overview, attendance, departments +
  tasks, chat, directory, your own profile, and (for admins) the admin page.

## Known trade-offs (fine for an internal MVP, revisit if it grows)

- Profile pictures and chat attachments are stored in **public** Supabase Storage
  buckets - anyone with the exact file link can view it, but links aren't discoverable
  or listed anywhere. Switch to signed URLs later if you need stricter access control.
- Attendance "late" cutoff is hardcoded to 9:00 AM local device time
  (`src/components/AttendanceButton.tsx`) - change `LATE_CUTOFF_HOUR` if needed.
- Roles are a simple admin/employee flag, no per-department manager tier.

## Ideas for what to add next

- Push/browser notifications for deadlines, mentions, and new DMs.
- Leave requests that need admin approval, tied into the attendance table.
- CSV export of attendance and task reports from the admin page.
- Emoji reactions and threaded replies in chat.
- A calendar view of task deadlines across departments.
