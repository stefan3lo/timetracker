# Second Brain for Work

Internal, single-user “second brain” for daily execution. Built with Next.js App Router, TailwindCSS, Supabase, and Recharts.

## Features
- Distraction-free `/today` with timer controls, active task, quick add, checklist, and top 3 focus.
- Planning flow in `/plan` for target minutes, top tasks, and obligations.
- Monthly win/partial/miss calendar with day breakdown.
- Insights with daily trend + time by area/project and top tasks.
- CSV exports for time entries, daily summaries, and obligations.

## Tech Stack
- Next.js (App Router) + TypeScript
- TailwindCSS (dark UI with neon cyan/green)
- Supabase (Postgres, Auth, RLS)
- Recharts

## Setup
1) Install dependencies:
```bash
npm install
```

2) Create a Supabase project and configure the database.
- Run the SQL migration in `supabase/migrations/001_init.sql`.

3) Set environment variables in `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4) Start the dev server:
```bash
npm run dev
```

Open `http://localhost:3000`.

## Notes
- RLS policies enforce `user_id = auth.uid()` for all tables (profiles use `id = auth.uid()`).
- The timer routes use server handlers under `app/api/timer`.
- CSV export routes live in `app/api/export/*`.

## Suggested Next Steps
- Add manual time entry UI and daily streaks to insights.
- Connect reminders or notifications based on obligations.
