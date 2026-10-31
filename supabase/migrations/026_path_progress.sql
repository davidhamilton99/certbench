-- Saved progress on the guided path, one row per user per exam.
--
-- The path is the main way to study: an exam's objectives as a sequence of
-- short stops. Anonymous visitors keep progress on their device; an account
-- saves it here so it follows them across devices. `progress` holds the
-- per-rep answer records, finished stops, the latest checkpoint result and the
-- goal (exam date, minutes a day). Its shape and size are enforced by the API
-- (src/core/path/progress.ts); the check below is only a backstop.
--
-- Without this table the path still works: progress stays on the device and
-- the API reports it wasn't stored.

create table if not exists public.path_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  cert_slug text not null check (cert_slug in (
    'security-plus-sy0-701',
    'network-plus-n10-009',
    'a-plus-core1-220-1101',
    'a-plus-core2-220-1102'
  )),
  progress jsonb not null default '{}'::jsonb
    check (pg_column_size(progress) < 524288),
  updated_at timestamptz not null default now(),
  primary key (user_id, cert_slug)
);

alter table public.path_progress enable row level security;

-- Users can read/write/delete only their own path progress.
create policy "Users manage own path progress"
  on public.path_progress
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
