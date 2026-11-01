-- Enrollments decide which exams a Pro plan unlocks, so accounts may only
-- READ their own. Until now the policy let a signed-in user insert, update or
-- delete their own rows directly through the API, which meant anyone could
-- add every exam to their plan without paying for it.
--
-- After this, only the server (service role, which bypasses RLS) changes
-- enrollments: see src/server/services/enrollment-writes.ts.
--
-- Run AFTER the code that writes enrollments through the service role is
-- deployed. Run before it, and enrolling from the guided path fails.

drop policy if exists "Users manage own enrollments" on public.user_enrollments;

create policy "Users read own enrollments"
  on public.user_enrollments
  for select
  using (auth.uid() = user_id);
