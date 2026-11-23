-- Only the server may call the function that adds questions to the bank.
--
-- RUN on the live database on 23 November 2026, after the read-only query
-- below had shown that it was needed, and checked afterwards with the same
-- query.
--
-- Found on the live database on 23 November 2026, while the read-only query of
-- 032 was run: public.seed_question(...) is a SECURITY DEFINER function that
-- inserts a row into cert_questions, and anon and authenticated could both
-- call it. It is not made by any file in supabase/migrations: it was created
-- by hand in the SQL editor for the early seeding scripts.
--
-- What that allowed:
--
--   The public schema is served by the API, and the site's public key is sent
--   to every browser. So anyone, signed in or not, could call the function
--   directly and add a question of their own wording, options and answer to
--   any exam's bank. A new row is active by default, so it would be shown on
--   the study paths, the practice exams and the public pages. The read-only
--   check on 23 November 2026 found no such row: in the last 60 days questions
--   were added on two days only, 308 on 10 November (migration 029) and 1,008
--   on 21 November (migration 030).
--
-- What this migration does:
--
--   It revokes EXECUTE on the function from PUBLIC, anon and authenticated, and
--   grants it to service_role by name, as 032 does for the request counter.
--   No application code calls the function, in the version that is live or in
--   the one that follows it. Only scripts/seed-cert.ts and
--   scripts/seed-via-rpc.ts do, with the public key; run again, they need the
--   service role key instead. Questions are now added by migrations such as
--   029 and 030, which the SQL editor runs with full rights.
--
-- Run this read-only query first. It changes nothing.
--
--   select r.rolname as role_name,
--          has_function_privilege(
--            r.rolname,
--            'public.seed_question(text, text, text, text, jsonb, integer, text, integer)',
--            'EXECUTE'
--          ) as may_execute
--   from pg_roles r
--   where r.rolname in ('anon', 'authenticated', 'service_role')
--   order by r.rolname;
--
-- If may_execute is true for anon or for authenticated, the migration is
-- needed. If the query fails because the function does not exist, nothing is
-- needed. Afterwards, run it again: false, false and true.
--
-- Undo, with one statement:
--
--   grant execute on function public.seed_question(text, text, text, text, jsonb, integer, text, integer) to public;
--
-- This file changes permissions only: no table, column, row or function body
-- is altered.

begin;

revoke execute on function public.seed_question(text, text, text, text, jsonb, integer, text, integer) from public, anon, authenticated;
grant execute on function public.seed_question(text, text, text, text, jsonb, integer, text, integer) to service_role;

commit;
