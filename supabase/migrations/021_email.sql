-- Lifecycle email: per-user preferences + a send log for idempotent crons.
-- Additive only. Neither table has client policies — only the service role
-- reads or writes them (RLS enabled with no policies = deny all).

create table if not exists email_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  digest_enabled boolean not null default true,
  unsubscribe_token uuid not null default gen_random_uuid(),
  updated_at timestamptz not null default now()
);

alter table email_preferences enable row level security;

create table if not exists email_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  email_type text not null,
  sent_on date not null default current_date,
  created_at timestamptz not null default now(),
  unique (user_id, email_type, sent_on)
);

alter table email_log enable row level security;

create index if not exists email_log_user_idx on email_log (user_id);
