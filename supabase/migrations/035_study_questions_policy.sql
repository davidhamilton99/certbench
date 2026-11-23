-- An account may write questions only into a study set of its own.
--
-- THIS FILE HAS NOT BEEN RUN. The owner runs it by hand in the Supabase SQL
-- editor, once the read-only queries below have shown that it is needed. The
-- migration files and the live database have differed before, so the queries
-- come first.
--
-- What the migration files allow today:
--
--   user_study_questions carries the policy "Users manage own study
--   questions" (001_complete_schema.sql), for every command, with the rule
--   auth.uid() = user_id. It checks the row's own user_id and never the set
--   the row is written into. So any signed-in account can insert a question
--   with its own user_id into another member's study set, through the public
--   API. If that set is public, the policy "Public study questions readable"
--   shows the question to everyone, on the set's public share page among
--   them, as part of that member's work. The member cannot remove it: the
--   application deletes a question only when its user_id is the member's own.
--   Compare "Users manage own tags" on study_set_cert_tags in the same file,
--   which does check that the set belongs to the account.
--
-- What this migration does:
--
--   It replaces "Users manage own study questions" with a policy of the same
--   name whose USING and WITH CHECK both require two things: the row's
--   user_id is the account's own, and the study set the row belongs to is the
--   account's own. Nothing else changes: "Public study questions readable" is
--   kept, and no table, column or row is altered.
--
-- The application writes questions only into a set the account owns, and
-- checks that before it writes (upsertQuestion and deleteQuestion in
-- src/server/data/study-sets.ts, the same in the version that is live and in
-- the one that follows it). No code depends on what is removed, so the
-- migration can be run before or after a deployment.
--
-- Not in this file, and a separate decision: the policy "Users manage own
-- sets" on user_study_sets lets an owner change any column of their own set
-- by a direct update, is_featured, attempt_count and bookmark_count among
-- them (the first two order the community list). Limiting that
-- needs the two functions that update the counters (increment_attempt_count
-- and update_bookmark_count, migration 013) to run with their owner's rights
-- first, and then a column grant like the one in migration 031. This file
-- changes neither.
--
-- Run these two read-only queries first. Neither changes anything.
--
-- Query 1: the policies on user_study_questions.
--
--   select policyname, cmd, qual, with_check
--   from pg_policies
--   where schemaname = 'public'
--     and tablename = 'user_study_questions'
--   order by policyname;
--
-- The migration files expect two rows: "Public study questions readable"
-- (SELECT), and "Users manage own study questions" (ALL) whose qual is
-- (auth.uid() = user_id) and whose with_check is empty. If the second row's
-- qual already names user_study_sets, the migration is not needed. If any
-- further policy is listed with the cmd INSERT, UPDATE, DELETE or ALL, it is
-- not in the migration files and this file does not remove it: have it looked
-- at before going on, because it may allow the same write.
--
-- Query 2: questions already written into a set by an account that does not
-- own it.
--
--   select q.id, q.study_set_id, q.user_id as written_by,
--          s.user_id as set_owner, s.is_public
--   from public.user_study_questions q
--   join public.user_study_sets s on s.id = q.study_set_id
--   where q.user_id <> s.user_id;
--
-- It should return no row. This file does not delete any row it returns, and
-- after it has run only the service role (the SQL editor) can change or delete
-- such a row, while a public set still shows it. Have every row it returns
-- looked at.
--
-- Afterwards, run Query 1 again. The row "Users manage own study questions"
-- should show the check on user_study_sets in both qual and with_check.
--
-- To check the application afterwards: on the page of one of your own study
-- sets (under /study-materials), add a question and then delete it.
--
-- If one of those fails with a message about row level security, these two
-- statements return the policy to where the migration files left it:
--
--   drop policy if exists "Users manage own study questions" on public.user_study_questions;
--   create policy "Users manage own study questions" on public.user_study_questions for all using (auth.uid() = user_id);

begin;

drop policy if exists "Users manage own study questions" on public.user_study_questions;

-- The row must be the account's own, and so must the set it is written into.
create policy "Users manage own study questions" on public.user_study_questions
  for all
  using (
    auth.uid() = user_id
    and exists (
      select 1 from public.user_study_sets s
      where s.id = user_study_questions.study_set_id
        and s.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.user_study_sets s
      where s.id = user_study_questions.study_set_id
        and s.user_id = auth.uid()
    )
  );

commit;
