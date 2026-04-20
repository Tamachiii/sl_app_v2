-- =========================================================================
-- Coaching app schema
-- Run in Supabase SQL editor. Order matters: types → tables → RLS → policies.
-- =========================================================================

create extension if not exists "pgcrypto";

-- ---------- enums ----------
do $$ begin
  create type user_role as enum ('coach', 'student');
exception when duplicate_object then null; end $$;

-- ---------- profiles ----------
-- One row per auth.users entry. `coach_id` links a student to their coach.
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        user_role not null default 'student',
  full_name   text not null default '',
  coach_id    uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists profiles_coach_id_idx on profiles(coach_id);

-- Auto-create a profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- exercise library (shared) ----------
create table if not exists exercises (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  type       text not null,           -- e.g. "compound", "accessory", "cardio"
  notes      text,
  created_at timestamptz not null default now()
);
create index if not exists exercises_type_idx on exercises(type);

-- ---------- programs → weeks → sessions → slots → set logs ----------
create table if not exists programs (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references profiles(id) on delete cascade,
  coach_id    uuid not null references profiles(id) on delete restrict,
  title       text not null,
  created_at  timestamptz not null default now()
);
create index if not exists programs_student_idx on programs(student_id);
create index if not exists programs_coach_idx on programs(coach_id);

create table if not exists weeks (
  id          uuid primary key default gen_random_uuid(),
  program_id  uuid not null references programs(id) on delete cascade,
  index       int not null,
  notes       text,
  unique (program_id, index)
);

create table if not exists sessions (
  id            uuid primary key default gen_random_uuid(),
  week_id       uuid not null references weeks(id) on delete cascade,
  name          text not null,
  day_index     int not null,
  student_note  text,
  confirmed_at  timestamptz,
  unique (week_id, day_index)
);
create index if not exists sessions_confirmed_idx on sessions(confirmed_at) where confirmed_at is not null;

create table if not exists exercise_slots (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references sessions(id) on delete cascade,
  exercise_id  uuid not null references exercises(id) on delete restrict,
  order_index  int not null,
  coach_notes  text
);
create index if not exists exercise_slots_session_idx on exercise_slots(session_id);

create table if not exists set_logs (
  id         uuid primary key default gen_random_uuid(),
  slot_id    uuid not null references exercise_slots(id) on delete cascade,
  set_index  int not null,
  reps       int not null,
  weight     numeric(6,2) not null,
  rpe        numeric(3,1),
  logged_at  timestamptz not null default now(),
  unique (slot_id, set_index)
);

create table if not exists goals (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references profiles(id) on delete cascade,
  title       text not null,
  target      text,
  due_date    date,
  created_at  timestamptz not null default now()
);
create index if not exists goals_student_idx on goals(student_id);

-- =========================================================================
-- Row Level Security
-- =========================================================================
alter table profiles        enable row level security;
alter table exercises       enable row level security;
alter table programs        enable row level security;
alter table weeks           enable row level security;
alter table sessions        enable row level security;
alter table exercise_slots  enable row level security;
alter table set_logs        enable row level security;
alter table goals           enable row level security;

-- Helper: is the current user a coach?
create or replace function public.is_coach() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'coach')
$$;

-- Helper: does the current coach own this student?
create or replace function public.owns_student(student uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = student and coach_id = auth.uid()
  )
$$;

-- ---------- profiles policies ----------
drop policy if exists "profiles: self read"          on profiles;
drop policy if exists "profiles: coach reads own"    on profiles;
drop policy if exists "profiles: self update"        on profiles;

create policy "profiles: self read" on profiles
  for select using (id = auth.uid());

create policy "profiles: coach reads own" on profiles
  for select using (coach_id = auth.uid());

create policy "profiles: self update" on profiles
  for update using (id = auth.uid());

-- ---------- exercises (public catalog, coach-authored) ----------
drop policy if exists "exercises: all read"    on exercises;
drop policy if exists "exercises: coach write" on exercises;

create policy "exercises: all read" on exercises
  for select using (auth.uid() is not null);

create policy "exercises: coach write" on exercises
  for all using (public.is_coach()) with check (public.is_coach());

-- ---------- programs ----------
drop policy if exists "programs: student reads own"    on programs;
drop policy if exists "programs: coach reads own"      on programs;
drop policy if exists "programs: coach writes own"     on programs;

create policy "programs: student reads own" on programs
  for select using (student_id = auth.uid());

create policy "programs: coach reads own" on programs
  for select using (coach_id = auth.uid());

create policy "programs: coach writes own" on programs
  for all using (coach_id = auth.uid()) with check (coach_id = auth.uid());

-- ---------- weeks (inherit via program) ----------
drop policy if exists "weeks: participants read" on weeks;
drop policy if exists "weeks: coach writes"      on weeks;

create policy "weeks: participants read" on weeks
  for select using (
    exists (select 1 from programs p
            where p.id = weeks.program_id
              and (p.student_id = auth.uid() or p.coach_id = auth.uid()))
  );

create policy "weeks: coach writes" on weeks
  for all using (
    exists (select 1 from programs p where p.id = weeks.program_id and p.coach_id = auth.uid())
  ) with check (
    exists (select 1 from programs p where p.id = weeks.program_id and p.coach_id = auth.uid())
  );

-- ---------- sessions ----------
drop policy if exists "sessions: participants read"   on sessions;
drop policy if exists "sessions: coach writes"        on sessions;
drop policy if exists "sessions: student confirms"    on sessions;

create policy "sessions: participants read" on sessions
  for select using (
    exists (
      select 1 from weeks w join programs p on p.id = w.program_id
      where w.id = sessions.week_id
        and (p.student_id = auth.uid() or p.coach_id = auth.uid())
    )
  );

create policy "sessions: coach writes" on sessions
  for all using (
    exists (
      select 1 from weeks w join programs p on p.id = w.program_id
      where w.id = sessions.week_id and p.coach_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from weeks w join programs p on p.id = w.program_id
      where w.id = sessions.week_id and p.coach_id = auth.uid()
    )
  );

-- Students can update confirmation + their own note but not the structure.
create policy "sessions: student confirms" on sessions
  for update using (
    exists (
      select 1 from weeks w join programs p on p.id = w.program_id
      where w.id = sessions.week_id and p.student_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from weeks w join programs p on p.id = w.program_id
      where w.id = sessions.week_id and p.student_id = auth.uid()
    )
  );

-- ---------- exercise_slots ----------
drop policy if exists "slots: participants read" on exercise_slots;
drop policy if exists "slots: coach writes"      on exercise_slots;

create policy "slots: participants read" on exercise_slots
  for select using (
    exists (
      select 1 from sessions s join weeks w on w.id = s.week_id
      join programs p on p.id = w.program_id
      where s.id = exercise_slots.session_id
        and (p.student_id = auth.uid() or p.coach_id = auth.uid())
    )
  );

create policy "slots: coach writes" on exercise_slots
  for all using (
    exists (
      select 1 from sessions s join weeks w on w.id = s.week_id
      join programs p on p.id = w.program_id
      where s.id = exercise_slots.session_id and p.coach_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from sessions s join weeks w on w.id = s.week_id
      join programs p on p.id = w.program_id
      where s.id = exercise_slots.session_id and p.coach_id = auth.uid()
    )
  );

-- ---------- set_logs ----------
-- Coach prescribes (insert/update/delete). Student fills in actuals (update only).
drop policy if exists "set_logs: participants read"        on set_logs;
drop policy if exists "set_logs: student writes"           on set_logs;
drop policy if exists "set_logs: coach writes"             on set_logs;
drop policy if exists "set_logs: student updates actuals"  on set_logs;

create policy "set_logs: participants read" on set_logs
  for select using (
    exists (
      select 1 from exercise_slots es
      join sessions s on s.id = es.session_id
      join weeks w on w.id = s.week_id
      join programs p on p.id = w.program_id
      where es.id = set_logs.slot_id
        and (p.student_id = auth.uid() or p.coach_id = auth.uid())
    )
  );

create policy "set_logs: coach writes" on set_logs
  for all using (
    exists (
      select 1 from exercise_slots es
      join sessions s on s.id = es.session_id
      join weeks w on w.id = s.week_id
      join programs p on p.id = w.program_id
      where es.id = set_logs.slot_id and p.coach_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from exercise_slots es
      join sessions s on s.id = es.session_id
      join weeks w on w.id = s.week_id
      join programs p on p.id = w.program_id
      where es.id = set_logs.slot_id and p.coach_id = auth.uid()
    )
  );

create policy "set_logs: student updates actuals" on set_logs
  for update using (
    exists (
      select 1 from exercise_slots es
      join sessions s on s.id = es.session_id
      join weeks w on w.id = s.week_id
      join programs p on p.id = w.program_id
      where es.id = set_logs.slot_id and p.student_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from exercise_slots es
      join sessions s on s.id = es.session_id
      join weeks w on w.id = s.week_id
      join programs p on p.id = w.program_id
      where es.id = set_logs.slot_id and p.student_id = auth.uid()
    )
  );

-- ---------- goals ----------
drop policy if exists "goals: student reads"  on goals;
drop policy if exists "goals: coach manages"  on goals;

create policy "goals: student reads" on goals
  for select using (student_id = auth.uid());

create policy "goals: coach manages" on goals
  for all using (public.owns_student(student_id))
  with check (public.owns_student(student_id));
