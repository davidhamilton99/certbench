-- Email leads captured from the free public tools (port quiz, subnetting,
-- acronyms). Lets us re-engage the anonymous tool audience, which is the
-- largest top-of-funnel cohort. Service-role only (RLS on, no policies =
-- deny all), like email_preferences / email_log.

create table if not exists tool_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null,
  context jsonb not null default '{}'::jsonb,
  unsubscribe_token uuid not null default gen_random_uuid(),
  unsubscribed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (email, source)
);

alter table tool_leads enable row level security;

create index if not exists tool_leads_email_idx on tool_leads (email);
