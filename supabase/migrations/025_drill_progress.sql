-- Saved progress for the free public drills (port numbers, Security+
-- acronyms, subnetting).
--
-- The first round of each drill is free for anyone; a free account keeps
-- going. This row is what that account saves: one per user per drill, holding
-- a per-item map (attempts, correct, streak, last answered) that powers the
-- progress map and builds each new round from what the user missed.
--
-- `items` is shaped and size-capped by the API (src/core/drill-rounds/drill-rounds.ts);
-- the check below is only a backstop against an oversized blob.

create table if not exists public.drill_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  tool text not null check (tool in ('ports', 'acronyms', 'subnetting')),
  items jsonb not null default '{}'::jsonb
    check (pg_column_size(items) < 262144),
  rounds integer not null default 0 check (rounds >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, tool)
);

alter table public.drill_progress enable row level security;

-- Users can read/write/delete only their own drill progress.
create policy "Users manage own drill progress"
  on public.drill_progress
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
