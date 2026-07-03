-- ============================================================
-- CampusQuest — Supabase schema
-- The app currently runs fully client-side on localStorage.
-- Apply this schema when migrating to a Supabase backend.
-- ============================================================

-- users: profile data extending Supabase auth.users
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text not null,
  avatar_url text,
  total_xp integer not null default 0,
  level integer not null default 1,
  streak_days integer not null default 0,
  last_login date
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  category text not null check (category in ('Assignments', 'Exams', 'Projects', 'Study Sessions', 'Readings')),
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  due_date date not null,
  completed boolean not null default false,
  completed_at timestamptz,
  xp_earned integer not null default 0
);

create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  logo_url text,
  category text not null check (category in ('Academic', 'Social', 'Sports', 'Arts'))
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  title text not null,
  description text,
  event_date timestamptz not null,
  location text not null,
  max_attendees integer
);

create table public.event_attendees (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  checked_in boolean not null default false,
  xp_earned integer not null default 0,
  unique (event_id, user_id)
);

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  icon text,
  requirement_type text not null,
  requirement_value integer not null
);

create table public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  achievement_id uuid not null references public.achievements (id) on delete cascade,
  earned_at timestamptz not null default now(),
  unique (user_id, achievement_id)
);

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  url text not null,
  subject text not null,
  upvotes integer not null default 0
);

-- ============================================================
-- Row Level Security: personal-first privacy
-- Your detailed rows are only visible to you; leaderboard data
-- is exposed through a summarised view.
-- ============================================================

alter table public.users enable row level security;
alter table public.tasks enable row level security;
alter table public.event_attendees enable row level security;
alter table public.user_achievements enable row level security;
alter table public.resources enable row level security;
alter table public.clubs enable row level security;
alter table public.events enable row level security;
alter table public.achievements enable row level security;

-- Own-data policies
create policy "users read own profile" on public.users for select using (auth.uid() = id);
create policy "users update own profile" on public.users for update using (auth.uid() = id);

create policy "tasks are private" on public.tasks for all using (auth.uid() = user_id);
create policy "attendance is private" on public.event_attendees for all using (auth.uid() = user_id);
create policy "achievements earned are private" on public.user_achievements for select using (auth.uid() = user_id);

-- Shared/public content
create policy "clubs are public" on public.clubs for select using (true);
create policy "events are public" on public.events for select using (true);
create policy "achievement definitions are public" on public.achievements for select using (true);
create policy "resources are public" on public.resources for select using (true);
create policy "share own resources" on public.resources for insert with check (auth.uid() = user_id);

-- Leaderboard: summarised info only (level, total XP, weekly tasks)
create view public.leaderboard as
select
  u.id,
  u.display_name,
  u.avatar_url,
  u.level,
  u.total_xp,
  count(t.id) filter (
    where t.completed and t.completed_at >= now() - interval '7 days'
  ) as weekly_tasks
from public.users u
left join public.tasks t on t.user_id = u.id
group by u.id;
