create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  name text,
  timezone text default 'Europe/Belgrade',
  created_at timestamptz default now()
);

create table if not exists user_settings (
  user_id uuid primary key references auth.users on delete cascade default auth.uid(),
  default_target_minutes int default 720,
  checklist_threshold numeric default 0.9,
  created_at timestamptz default now()
);

create table if not exists areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  name text not null,
  created_at timestamptz default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  area_id uuid references areas on delete set null,
  name text not null,
  status text default 'active',
  created_at timestamptz default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  project_id uuid references projects on delete set null,
  title text not null,
  notes text,
  status text default 'active',
  created_at timestamptz default now()
);

create table if not exists daily_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  date date not null,
  target_minutes int not null,
  notes text,
  created_at timestamptz default now(),
  unique (user_id, date)
);

create table if not exists daily_plan_top_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  date date not null,
  task_id uuid references tasks on delete cascade,
  rank int not null,
  unique (user_id, date, rank)
);

create table if not exists obligation_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  title text not null,
  frequency text not null check (frequency in ('daily', 'weekly')),
  weekdays int[] null,
  target_type text not null check (target_type in ('checkbox', 'minutes', 'count')),
  target_value int not null,
  created_at timestamptz default now()
);

create table if not exists obligation_instances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  template_id uuid references obligation_templates on delete cascade,
  date date not null,
  done boolean default false,
  actual_value int null,
  created_at timestamptz default now(),
  unique (user_id, template_id, date)
);

create table if not exists time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  task_id uuid references tasks on delete set null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  duration_sec int not null,
  note text,
  source text not null check (source in ('timer', 'manual')),
  created_at timestamptz default now()
);

create table if not exists active_timer (
  user_id uuid primary key references auth.users on delete cascade default auth.uid(),
  task_id uuid references tasks on delete set null,
  started_at timestamptz,
  is_running boolean not null default false,
  is_paused boolean not null default false,
  last_state_change timestamptz,
  accumulated_sec int default 0
);

create table if not exists daily_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  date date not null,
  target_minutes int not null,
  worked_minutes int not null,
  checklist_ratio numeric not null,
  win boolean not null,
  locked boolean default false,
  created_at timestamptz default now(),
  unique (user_id, date)
);

alter table profiles enable row level security;
alter table user_settings enable row level security;
alter table areas enable row level security;
alter table projects enable row level security;
alter table tasks enable row level security;
alter table daily_plans enable row level security;
alter table daily_plan_top_tasks enable row level security;
alter table obligation_templates enable row level security;
alter table obligation_instances enable row level security;
alter table time_entries enable row level security;
alter table active_timer enable row level security;
alter table daily_scores enable row level security;

create policy "Profiles are self-only"
  on profiles
  for all
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "Settings are user-owned"
  on user_settings
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Areas are user-owned"
  on areas
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Projects are user-owned"
  on projects
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Tasks are user-owned"
  on tasks
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Daily plans are user-owned"
  on daily_plans
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Daily plan top tasks are user-owned"
  on daily_plan_top_tasks
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Obligation templates are user-owned"
  on obligation_templates
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Obligation instances are user-owned"
  on obligation_instances
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Time entries are user-owned"
  on time_entries
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Active timer is user-owned"
  on active_timer
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Daily scores are user-owned"
  on daily_scores
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
