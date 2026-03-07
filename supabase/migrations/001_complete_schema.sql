-- ============================================================
-- CertBench — Complete Database Schema Migration
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ============================================================
-- 1. PROFILES (extends auth.users)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ============================================================
-- 2. CERTIFICATION CONTENT (Admin-Owned)
-- ============================================================
create table public.certifications (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  exam_code text not null,
  vendor text not null,
  total_exam_questions integer not null,
  passing_score integer not null,
  max_score integer not null,
  exam_duration_minutes integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.cert_domains (
  id uuid primary key default gen_random_uuid(),
  certification_id uuid not null references certifications(id) on delete restrict,
  domain_number text not null,
  title text not null,
  exam_weight decimal(5,2) not null,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  unique (certification_id, domain_number)
);

create table public.cert_sub_objectives (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid not null references cert_domains(id) on delete restrict,
  code text not null,
  title text not null,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  unique (domain_id, code)
);

create table public.cert_questions (
  id uuid primary key default gen_random_uuid(),
  certification_id uuid not null references certifications(id) on delete restrict,
  domain_id uuid not null references cert_domains(id) on delete restrict,
  sub_objective_id uuid references cert_sub_objectives(id) on delete set null,
  question_text text not null,
  options jsonb not null,
  correct_index integer not null,
  explanation text not null,
  difficulty integer not null default 2 check (difficulty between 1 and 3),
  is_active boolean not null default true,
  is_diagnostic_eligible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_cert_questions_cert on cert_questions(certification_id) where is_active = true;
create index idx_cert_questions_domain on cert_questions(domain_id) where is_active = true;
create index idx_cert_questions_diagnostic on cert_questions(certification_id)
  where is_active = true and is_diagnostic_eligible = true;


-- ============================================================
-- 3. USER CERTIFICATION PROGRESS
-- ============================================================
create table public.user_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  certification_id uuid not null references certifications(id) on delete restrict,
  exam_date date,
  enrolled_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (user_id, certification_id)
);

create index idx_enrollments_user on user_enrollments(user_id) where is_active = true;

-- Diagnostic exam tracking
create table public.diagnostic_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  certification_id uuid not null references certifications(id) on delete restrict,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  total_questions integer not null,
  correct_count integer,
  is_complete boolean not null default false
);

create table public.diagnostic_responses (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references diagnostic_attempts(id) on delete cascade,
  question_id uuid not null references cert_questions(id) on delete restrict,
  selected_index integer not null,
  is_correct boolean not null,
  time_spent_seconds integer,
  answered_at timestamptz not null default now()
);

-- Practice exam tracking
create table public.practice_exam_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  certification_id uuid not null references certifications(id) on delete restrict,
  exam_type text not null default 'full' check (exam_type in ('full', 'domain_drill', 'weak_points')),
  domain_id uuid references cert_domains(id),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  total_questions integer not null,
  correct_count integer,
  is_complete boolean not null default false
);

create table public.practice_exam_responses (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references practice_exam_attempts(id) on delete cascade,
  question_id uuid not null references cert_questions(id) on delete restrict,
  selected_index integer not null,
  is_correct boolean not null,
  is_flagged boolean not null default false,
  time_spent_seconds integer,
  answered_at timestamptz not null default now()
);

-- SRS and per-question performance tracking
create table public.question_performance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  question_id uuid not null references cert_questions(id) on delete restrict,
  certification_id uuid not null references certifications(id) on delete restrict,
  times_seen integer not null default 0,
  times_correct integer not null default 0,
  last_seen_at timestamptz,
  last_correct_at timestamptz,
  srs_interval_days integer not null default 1,
  srs_ease_factor decimal(4,2) not null default 2.50,
  srs_next_review_at timestamptz,
  streak integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, question_id)
);

create index idx_qperf_user_cert on question_performance(user_id, certification_id);
create index idx_qperf_srs_due on question_performance(user_id, certification_id, srs_next_review_at)
  where srs_next_review_at is not null;
create index idx_qperf_user_question on question_performance(user_id, question_id);

-- Readiness score snapshots
create table public.readiness_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  certification_id uuid not null references certifications(id) on delete restrict,
  overall_score decimal(5,2) not null,
  domain_scores jsonb not null,
  total_questions_seen integer not null,
  is_preliminary boolean not null default true,
  computed_at timestamptz not null default now()
);

create index idx_readiness_latest on readiness_snapshots(user_id, certification_id, computed_at desc);


-- ============================================================
-- 4. USER STUDY MATERIALS (Completely Isolated — NO cert_* FKs)
-- ============================================================
create table public.user_study_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  category text,
  is_public boolean not null default false,
  source_material_preview text,
  question_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_study_sets_user on user_study_sets(user_id);
create index idx_study_sets_public on user_study_sets(is_public, created_at desc)
  where is_public = true;

create table public.user_study_questions (
  id uuid primary key default gen_random_uuid(),
  study_set_id uuid not null references user_study_sets(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  question_text text not null,
  options jsonb not null,
  correct_index integer not null,
  explanation text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_study_questions_set on user_study_questions(study_set_id);

-- Community interaction on public study sets
create table public.study_set_bookmarks (
  user_id uuid not null references profiles(id) on delete cascade,
  study_set_id uuid not null references user_study_sets(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, study_set_id)
);

-- Loose tagging for contextual discovery (NOT a structural FK to certifications)
create table public.study_set_cert_tags (
  study_set_id uuid not null references user_study_sets(id) on delete cascade,
  certification_slug text not null,
  primary key (study_set_id, certification_slug)
);


-- ============================================================
-- 5. ROW-LEVEL SECURITY POLICIES
-- ============================================================

-- Profiles
alter table profiles enable row level security;
create policy "Users read own profile" on profiles for select using (auth.uid() = id);
create policy "Users update own profile" on profiles for update using (auth.uid() = id);

-- Certifications (public read)
alter table certifications enable row level security;
create policy "Public read certifications" on certifications for select using (true);

-- Cert domains (public read)
alter table cert_domains enable row level security;
create policy "Public read domains" on cert_domains for select using (true);

-- Cert sub-objectives (public read)
alter table cert_sub_objectives enable row level security;
create policy "Public read objectives" on cert_sub_objectives for select using (true);

-- Cert questions (public read active only)
alter table cert_questions enable row level security;
create policy "Public read active questions" on cert_questions for select using (is_active = true);

-- Enrollments (user manages own)
alter table user_enrollments enable row level security;
create policy "Users manage own enrollments" on user_enrollments
  for all using (auth.uid() = user_id);

-- Diagnostic attempts (user manages own)
alter table diagnostic_attempts enable row level security;
create policy "Users manage own diagnostics" on diagnostic_attempts
  for all using (auth.uid() = user_id);

-- Diagnostic responses (user manages own via attempt ownership)
alter table diagnostic_responses enable row level security;
create policy "Users manage own diagnostic responses" on diagnostic_responses
  for all using (
    exists (
      select 1 from diagnostic_attempts
      where id = attempt_id and user_id = auth.uid()
    )
  );

-- Practice exam attempts (user manages own)
alter table practice_exam_attempts enable row level security;
create policy "Users manage own practice exams" on practice_exam_attempts
  for all using (auth.uid() = user_id);

-- Practice exam responses (user manages own via attempt ownership)
alter table practice_exam_responses enable row level security;
create policy "Users manage own practice responses" on practice_exam_responses
  for all using (
    exists (
      select 1 from practice_exam_attempts
      where id = attempt_id and user_id = auth.uid()
    )
  );

-- Question performance (user manages own)
alter table question_performance enable row level security;
create policy "Users manage own performance" on question_performance
  for all using (auth.uid() = user_id);

-- Readiness snapshots (user reads own)
alter table readiness_snapshots enable row level security;
create policy "Users read own readiness" on readiness_snapshots
  for select using (auth.uid() = user_id);
create policy "Users insert own readiness" on readiness_snapshots
  for insert with check (auth.uid() = user_id);

-- Study sets (owner manages, public readable)
alter table user_study_sets enable row level security;
create policy "Users manage own sets" on user_study_sets
  for all using (auth.uid() = user_id);
create policy "Public sets readable" on user_study_sets
  for select using (is_public = true);

-- Study questions (owner manages, public set questions readable)
alter table user_study_questions enable row level security;
create policy "Users manage own study questions" on user_study_questions
  for all using (auth.uid() = user_id);
create policy "Public study questions readable" on user_study_questions
  for select using (
    exists (
      select 1 from user_study_sets
      where id = study_set_id and is_public = true
    )
  );

-- Study set bookmarks (user manages own)
alter table study_set_bookmarks enable row level security;
create policy "Users manage own bookmarks" on study_set_bookmarks
  for all using (auth.uid() = user_id);

-- Study set cert tags (owner manages via study set ownership)
alter table study_set_cert_tags enable row level security;
create policy "Users manage own tags" on study_set_cert_tags
  for all using (
    exists (
      select 1 from user_study_sets
      where id = study_set_id and user_id = auth.uid()
    )
  );
create policy "Public tags readable" on study_set_cert_tags
  for select using (
    exists (
      select 1 from user_study_sets
      where id = study_set_id and is_public = true
    )
  );


-- ============================================================
-- 6. HELPER FUNCTIONS
-- ============================================================

-- Updated_at trigger function
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply updated_at triggers
create trigger set_updated_at before update on profiles
  for each row execute procedure update_updated_at();

create trigger set_updated_at before update on cert_questions
  for each row execute procedure update_updated_at();

create trigger set_updated_at before update on question_performance
  for each row execute procedure update_updated_at();

create trigger set_updated_at before update on user_study_sets
  for each row execute procedure update_updated_at();
