-- Only an approved pass story can be read through the public API.
--
-- RUN on the live database on 23 November 2026, after the read-only queries
-- below had shown that it was needed, and checked afterwards with the same
-- queries. On any other database, the owner runs it by hand in the Supabase SQL
-- editor, once the read-only query below has shown that it is needed. The
-- migration files and the live database have differed before, so the query
-- comes first.
--
-- What the migration files allow today:
--
--   testimonials carries the policy "Anyone reads approved testimonials"
--   (022_testimonials.sql), which lets anyone, signed in or not, read a row
--   whose status is 'approved'. It does not ask whether the person passed.
--   The post-exam link also stores a comment from someone who did not pass
--   ("What you found difficult"), as a row with passed = false, and it waits
--   in the same queue for review. Such a row, once approved, could be read by
--   anyone who holds the site's public key (it is sent to every browser), with
--   the name that was given and the result. Nothing on the site shows it: the
--   home page asks only for approved rows with passed = true.
--
-- What this migration does:
--
--   It recreates that policy, with the same name and for SELECT as before,
--   with the condition status = 'approved' and passed. A comment from someone
--   who did not pass can then be read only by its own account (the policy
--   "Users read own testimonial", which this file does not touch) and by the
--   server's service role. Nothing else changes: no row, column or other
--   policy.
--
-- No application code depends on what is removed, in the version that is
-- live or in the one that follows it. The home page reads the approved
-- testimonials with the public key and asks for passed = true itself
-- (listApprovedTestimonials in src/server/data/testimonials.ts). The owner's
-- queue and the post-exam link use the service role, which row level
-- security does not apply to. From the version that follows the live one, the
-- queue also says on each row whether the person passed, and the server
-- refuses to approve a comment from someone who did not pass. The migration
-- can therefore be run before or after a deployment.
--
-- Run this read-only query first. It changes nothing.
--
-- Query 1: the policies on testimonials, with the condition of each.
--
--   select policyname, cmd, qual, with_check
--   from pg_policies
--   where schemaname = 'public'
--     and tablename = 'testimonials'
--   order by policyname;
--
-- The migration files expect three rows:
--
--   "Anyone reads approved testimonials"   | SELECT | (status = 'approved'::text)          |
--   "Users read own testimonial"           | SELECT | (auth.uid() = user_id)               |
--   "Users submit own pending testimonial" | INSERT |                                      | ((auth.uid() = user_id) AND (status = 'pending'::text))
--
-- If the first row's qual is (status = 'approved'::text), the migration is
-- needed. If it already reads ((status = 'approved'::text) AND passed), it is
-- in place, and running the file only makes it again as it is. If the policy
-- has another name, stop: the file drops it by the name above, and with
-- another name the policy would stay and a second one would be added beside
-- it. If any further SELECT policy is listed, it is not in the migration files
-- and this file does not change it: have it looked at before going on,
-- because PostgreSQL lets a row through when any one SELECT policy allows it.
--
-- Query 2 (also read-only, for the owner's information): how many approved
-- comments from people who did not pass can be read today.
--
--   select count(*) as readable_did_not_pass
--   from public.testimonials
--   where status = 'approved' and not passed;
--
-- Afterwards, run query 1 again. The first row's qual should read
-- ((status = 'approved'::text) AND passed), and the other two rows should be
-- as they were.
--
-- To check the application afterwards: the home page shows the same
-- testimonials as before (it shows them only when three or more are approved).
--
-- If this has to be undone, these two statements return the policy to where
-- the migration files left it:
--
--   drop policy "Anyone reads approved testimonials" on public.testimonials;
--   create policy "Anyone reads approved testimonials" on public.testimonials for select using (status = 'approved');

begin;

-- A comment from someone who did not pass is never public, approved or not.
drop policy "Anyone reads approved testimonials" on public.testimonials;
create policy "Anyone reads approved testimonials"
  on public.testimonials
  for select
  using (status = 'approved' and passed);

commit;
