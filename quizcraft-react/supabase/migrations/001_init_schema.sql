-- Extensions
create extension if not exists "pgcrypto";

-- Enums
DO $$ BEGIN
  create type account_tier as enum ('free','paid','team');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  create type quiz_status as enum ('draft','published','archived');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  create type question_type as enum ('multiple_choice','true_false','enumeration','short','essay');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Users (teacher only auth)
create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null default 'teacher',
  tier account_tier not null default 'free',
  email_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Subscriptions
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  tier account_tier not null,
  status text not null default 'active',
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null,
  created_at timestamptz not null default now()
);

-- Quizzes
create table if not exists quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  description text,
  source_type text not null default 'ai',
  file_path text,
  time_limit integer,
  total_questions integer not null default 0,
  is_published boolean not null default false,
  sections_config jsonb,
  ai_response jsonb,
  allow_score boolean not null default true,
  status quiz_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Questions
create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  question_text text not null,
  question_type question_type not null default 'multiple_choice',
  correct_answer text not null,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

-- Options
create table if not exists options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  option_text text not null,
  option_label text not null,
  order_index integer not null default 0
);

-- Shareable quiz links
create table if not exists quiz_links (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  token text not null unique,
  is_active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- Assignments (optional for legacy flow)
create table if not exists quiz_assignments (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  student_id uuid references users(id) on delete set null,
  assigned_by uuid not null references users(id) on delete cascade,
  due_date timestamptz,
  status text not null default 'pending',
  assigned_at timestamptz not null default now(),
  unique (quiz_id, student_id)
);

-- Attempts (supports visitor flow)
create table if not exists attempts (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid references quiz_assignments(id) on delete set null,
  student_id uuid references users(id) on delete set null,
  quiz_id uuid not null references quizzes(id) on delete cascade,
  quiz_link_token text,
  visitor_name text,
  visitor_photo_url text,
  score numeric(7,2),
  total_correct integer not null default 0,
  time_taken integer,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  status text not null default 'in_progress'
);

-- Answers
create table if not exists answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references attempts(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  selected_option_id uuid references options(id) on delete set null,
  answer_text text,
  is_correct boolean not null default false,
  feedback text,
  score numeric(7,2)
);

create unique index if not exists answers_attempt_question_idx
  on answers (attempt_id, question_id);

-- Notifications
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Usage tracking for free tier
create table if not exists quiz_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  window_start timestamptz not null,
  window_end timestamptz not null,
  quizzes_created integer not null default 0,
  unique (user_id, window_start, window_end)
);

-- Team referrals
create table if not exists team_referrals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
  referral_code text not null unique,
  created_at timestamptz not null default now(),
  is_active boolean not null default true
);

-- RLS enable
alter table users enable row level security;
alter table subscriptions enable row level security;
alter table quizzes enable row level security;
alter table questions enable row level security;
alter table options enable row level security;
alter table quiz_links enable row level security;
alter table quiz_assignments enable row level security;
alter table attempts enable row level security;
alter table answers enable row level security;
alter table notifications enable row level security;
alter table quiz_usage enable row level security;
alter table team_referrals enable row level security;

-- RLS policies
create policy "users_select_own" on users
  for select using (auth.uid() = id);

create policy "users_update_own" on users
  for update using (auth.uid() = id);

create policy "subscriptions_owner" on subscriptions
  for select using (auth.uid() = user_id);

create policy "quizzes_owner" on quizzes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "questions_owner" on questions
  for all using (
    exists (select 1 from quizzes q where q.id = questions.quiz_id and q.user_id = auth.uid())
  ) with check (
    exists (select 1 from quizzes q where q.id = questions.quiz_id and q.user_id = auth.uid())
  );

create policy "options_owner" on options
  for all using (
    exists (
      select 1 from questions qs
      join quizzes q on q.id = qs.quiz_id
      where qs.id = options.question_id and q.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from questions qs
      join quizzes q on q.id = qs.quiz_id
      where qs.id = options.question_id and q.user_id = auth.uid()
    )
  );

create policy "quiz_links_owner" on quiz_links
  for all using (
    exists (select 1 from quizzes q where q.id = quiz_links.quiz_id and q.user_id = auth.uid())
  ) with check (
    exists (select 1 from quizzes q where q.id = quiz_links.quiz_id and q.user_id = auth.uid())
  );

create policy "quiz_assignments_owner" on quiz_assignments
  for all using (
    exists (select 1 from quizzes q where q.id = quiz_assignments.quiz_id and q.user_id = auth.uid())
  ) with check (
    exists (select 1 from quizzes q where q.id = quiz_assignments.quiz_id and q.user_id = auth.uid())
  );

create policy "attempts_owner_read" on attempts
  for select using (
    exists (select 1 from quizzes q where q.id = attempts.quiz_id and q.user_id = auth.uid())
  );

create policy "answers_owner_read" on answers
  for select using (
    exists (
      select 1 from attempts a
      join quizzes q on q.id = a.quiz_id
      where a.id = answers.attempt_id and q.user_id = auth.uid()
    )
  );

create policy "notifications_owner" on notifications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "quiz_usage_owner" on quiz_usage
  for select using (auth.uid() = user_id);

create policy "team_referrals_owner" on team_referrals
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- RPC: free-tier quiz quota
create or replace function can_create_quiz(p_user_id uuid)
returns boolean
language plpgsql
security definer
as $$
declare
  wnd_start timestamptz := date_trunc('day', now());
  wnd_end timestamptz := wnd_start + interval '14 days';
  current_count int;
  user_tier account_tier;
begin
  select tier into user_tier from users where id = p_user_id;
  if user_tier is null then
    return false;
  end if;

  if user_tier <> 'free' then
    return true;
  end if;

  select quizzes_created into current_count
  from quiz_usage
  where user_id = p_user_id
    and window_start = wnd_start
    and window_end = wnd_end;

  if current_count is null then
    insert into quiz_usage (user_id, window_start, window_end, quizzes_created)
    values (p_user_id, wnd_start, wnd_end, 1);
    return true;
  end if;

  if current_count >= 5 then
    return false;
  end if;

  update quiz_usage
  set quizzes_created = quizzes_created + 1
  where user_id = p_user_id
    and window_start = wnd_start
    and window_end = wnd_end;

  return true;
end;
$$;

-- RPC: visitor attempt creation by link token
create or replace function start_attempt_by_token(
  p_token text,
  p_name text,
  p_photo_url text
) returns uuid
language plpgsql
security definer
as $$
declare
  v_quiz_id uuid;
  v_attempt_id uuid;
begin
  select ql.quiz_id into v_quiz_id
  from quiz_links ql
  where ql.token = p_token
    and ql.is_active = true
    and (ql.expires_at is null or ql.expires_at > now());

  if v_quiz_id is null then
    raise exception 'invalid quiz link';
  end if;

  insert into attempts (quiz_id, quiz_link_token, visitor_name, visitor_photo_url)
  values (v_quiz_id, p_token, p_name, p_photo_url)
  returning id into v_attempt_id;

  return v_attempt_id;
end;
$$;

-- RPC: visitor answer save
create or replace function save_answer_by_token(
  p_attempt_id uuid,
  p_question_id uuid,
  p_selected_option_id uuid,
  p_answer_text text
) returns void
language plpgsql
security definer
as $$
begin
  insert into answers (attempt_id, question_id, selected_option_id, answer_text)
  values (p_attempt_id, p_question_id, p_selected_option_id, p_answer_text)
  on conflict (attempt_id, question_id)
  do update set
    selected_option_id = excluded.selected_option_id,
    answer_text = excluded.answer_text;
end;
$$;
