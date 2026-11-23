-- Accounts that unsubscribed before this version are not sent the study plan
-- email either.
--
-- THIS FILE HAS NOT BEEN RUN. The owner runs it by hand in the Supabase SQL
-- editor, once the read-only query below has shown that it is needed. The
-- migration files and the live database have differed before, so the query
-- comes first.
--
-- Why it is needed:
--
--   An account that presses "Unsubscribe" in a study email is told that it
--   will no longer receive study emails from CertBench. The study plan email
--   is one of them, and anyone can ask for it for any address on a free
--   tool's page. From this version, the unsubscribe also records the
--   account's address in tool_leads, with source 'account-unsubscribe' and
--   unsubscribed = true (recordAccountAddress in
--   src/server/email/unsubscribe.ts), and the study plan email is never sent
--   to an address that has any unsubscribed row (claimLead in
--   src/server/services/tool-leads.ts). An account that unsubscribed before
--   this version has no such row, so its address could still be sent the
--   study plan.
--
-- What this migration does:
--
--   For every account whose email_preferences row has digest_enabled = false,
--   it writes the same row that the unsubscribe now writes: the address in
--   lower case without spaces, source 'account-unsubscribe', unsubscribed =
--   true. An address that already has that row is marked unsubscribed again.
--   Nothing else changes: no other row, column, table or policy. The address
--   is copied from auth.users into tool_leads, which only the service role can
--   read (024_tool_leads.sql); the privacy policy should mention that an
--   address is kept after it unsubscribes, so that it is not written to again.
--
-- Run this read-only query first. It changes nothing.
--
--   select count(*) as unsubscribed_accounts,
--          count(*) filter (
--            where not exists (
--              select 1 from public.tool_leads l
--              where l.email = lower(trim(u.email))
--                and l.source = 'account-unsubscribe'
--            )
--          ) as without_a_row
--   from public.email_preferences p
--   join auth.users u on u.id = p.user_id
--   where p.digest_enabled = false
--     and u.email is not null;
--
-- What to expect: two numbers. If without_a_row is 0, nothing needs to be
-- done and this file need not be run. Otherwise it is the number of rows the
-- statement below writes.
--
-- Checked on the live database on 23 November 2026: no account had
-- unsubscribed (both numbers 0), so the file was not run. Run it once, right
-- after the version that writes the 'account-unsubscribe' row is deployed,
-- to cover any account that unsubscribes before then.
--
-- When it is safe to run: at any time after the version that writes the
-- 'account-unsubscribe' row is live. Before that, it is still correct, but
-- later unsubscribes would again have no row until that version is live.
--
-- Undo, straight after running it only (it also removes the rows the new
-- code writes when an account unsubscribes):
--
--   delete from public.tool_leads where source = 'account-unsubscribe';

insert into public.tool_leads (email, source, unsubscribed, updated_at)
select distinct lower(trim(u.email)), 'account-unsubscribe', true, now()
from public.email_preferences p
join auth.users u on u.id = p.user_id
where p.digest_enabled = false
  and u.email is not null
  and trim(u.email) <> ''
on conflict (email, source) do update
  set unsubscribed = true,
      updated_at = now();
