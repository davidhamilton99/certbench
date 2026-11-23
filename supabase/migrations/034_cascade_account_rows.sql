-- Deleting an account also deletes its question flags and study set reports.
--
-- THIS FILE HAS NOT BEEN RUN. The owner runs it by hand in the Supabase SQL
-- editor, once the read-only queries below have shown that it is needed. The
-- migration files and the live database have differed before, so the queries
-- come first.
--
-- What the migration files allow today:
--
--   Every table that holds an account's rows references profiles (or
--   auth.users) with ON DELETE CASCADE, so deleting the user deletes them.
--   Two do not:
--
--     1. question_flags.user_id (015_question_flags.sql)
--     2. community_reports.reporter_id (013_community_production.sql)
--
--   Both reference profiles with no delete rule, which PostgreSQL reads as NO
--   ACTION: while an account holds a flag on a question or a report on a study
--   set, the database refuses to delete it. That refusal reaches account
--   deletion on the profile page and a deletion made in the Supabase
--   dashboard alike.
--
-- What this migration does:
--
--   It recreates both foreign keys, with the same names and the same columns,
--   with ON DELETE CASCADE. Deleting an account then deletes its flags and its
--   reports with it. Nothing else changes: no row, column or policy.
--
-- The application does not need this file to delete an account. From the
-- version that follows the live one, it deletes the account's rows in both
-- tables itself before it does anything at Stripe or deletes the account
-- (src/server/services/delete-account.ts). This file makes the database agree,
-- so that a deletion made anywhere else works as well. In the live version,
-- which deletes the user and nothing else, it is what makes deletion work for
-- these accounts. It can therefore be run before or after a deployment.
--
-- Run these two read-only queries first. Neither changes anything.
--
-- Query 1: the two foreign keys and what each does when the account is deleted.
--
--   select tc.table_name, kcu.column_name, tc.constraint_name, rc.delete_rule
--   from information_schema.table_constraints tc
--   join information_schema.key_column_usage kcu
--     on kcu.constraint_schema = tc.constraint_schema
--    and kcu.constraint_name = tc.constraint_name
--   join information_schema.referential_constraints rc
--     on rc.constraint_schema = tc.constraint_schema
--    and rc.constraint_name = tc.constraint_name
--   where tc.table_schema = 'public'
--     and tc.constraint_type = 'FOREIGN KEY'
--     and (tc.table_name, kcu.column_name) in
--         (('question_flags', 'user_id'), ('community_reports', 'reporter_id'))
--   order by tc.table_name;
--
-- The migration files expect two rows:
--
--   community_reports | reporter_id | community_reports_reporter_id_fkey | NO ACTION
--   question_flags    | user_id     | question_flags_user_id_fkey        | NO ACTION
--
-- If both rows say NO ACTION, the migration is needed. If a row already says
-- CASCADE, that part is in place, and running the file only makes it again as
-- it is. If a constraint has another name, stop:
-- the file drops each constraint by the name above, and with another name its
-- statement fails and the whole file changes nothing. If a table has no row at
-- all, stop and have it looked at: the table, or its key, is not as the
-- migration files describe, and the statement for it would fail in the same
-- way.
--
-- Query 2: every foreign key, in any table, that refers to an account and
-- would refuse the deletion of that account (a delete rule of NO ACTION, shown
-- as a, or RESTRICT, shown as r).
--
--   select conrelid::regclass as table_name, conname, confdeltype
--   from pg_constraint
--   where contype = 'f'
--     and confrelid in ('public.profiles'::regclass, 'auth.users'::regclass)
--     and confdeltype in ('a', 'r')
--   order by 1, 2;
--
-- The migration files expect the two rows of Query 1 and no other. Any other
-- row is a key that the migration files do not have: while it is there, an
-- account that holds a row in that table has its subscription canceled and is
-- then not deleted, because the application deletes rows in the two tables
-- above only. This file does not change it: have it looked at.
--
-- Afterwards, run both again. Both rows of Query 1 should say CASCADE, and
-- Query 2 should return no row.
--
-- To check the application afterwards: nothing changes on the site. A member
-- who has flagged a question can now also be deleted from the Supabase
-- dashboard.
--
-- If this has to be undone, these two statements return both foreign keys to
-- where the migration files left them:
--
--   alter table public.question_flags drop constraint question_flags_user_id_fkey, add constraint question_flags_user_id_fkey foreign key (user_id) references public.profiles (id);
--   alter table public.community_reports drop constraint community_reports_reporter_id_fkey, add constraint community_reports_reporter_id_fkey foreign key (reporter_id) references public.profiles (id);

begin;

-- 1. A flag on a question goes with the account that made it.
alter table public.question_flags
  drop constraint question_flags_user_id_fkey,
  add constraint question_flags_user_id_fkey
    foreign key (user_id) references public.profiles (id) on delete cascade;

-- 2. A report on a study set goes with the account that made it.
alter table public.community_reports
  drop constraint community_reports_reporter_id_fkey,
  add constraint community_reports_reporter_id_fkey
    foreign key (reporter_id) references public.profiles (id) on delete cascade;

commit;
