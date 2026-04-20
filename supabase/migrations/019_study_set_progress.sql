-- Cross-device progress for study-set practice quizzes.
--
-- Each user has at most one row per study set — a simple "where did I leave off"
-- marker. We don't need full attempt history (attempt_count on user_study_sets
-- already tracks aggregate popularity); we just need enough to resume the quiz
-- from the same question on another device.
--
-- `correct_count` is the number of questions the user has answered correctly
-- so far in the current run. `total_questions` is a snapshot of the set size
-- at save time — if the owner edits the set and the counts diverge, the client
-- treats the saved progress as stale.

create table if not exists public.study_set_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  study_set_id uuid not null references public.user_study_sets(id) on delete cascade,
  current_index integer not null default 0 check (current_index >= 0),
  correct_count integer not null default 0 check (correct_count >= 0),
  total_questions integer not null check (total_questions > 0),
  saved_at timestamptz not null default now(),
  primary key (user_id, study_set_id)
);

alter table public.study_set_progress enable row level security;

-- Users can read/write/delete only their own progress rows.
create policy "Users manage own study-set progress"
  on public.study_set_progress
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- For the common "does this user have saved progress for this set?" lookup.
create index if not exists idx_study_set_progress_user_set
  on public.study_set_progress (user_id, study_set_id);
