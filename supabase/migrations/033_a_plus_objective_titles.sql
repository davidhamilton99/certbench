-- Two A+ Core 1 objective titles are written without a contraction.
--
-- THIS FILE HAS NOT BEEN RUN. The owner runs it by hand in the Supabase SQL
-- editor, once the read-only query below has shown that it is needed. The
-- migration files and the live database have differed before, so the query
-- comes first.
--
-- What the database holds today, if it matches the migration files:
--
--   Migration 029 (029_a_plus_v15.sql) wrote the 27 objectives of A+ Core 1
--   (220-1201) in CertBench's own words. Two of those titles end with a
--   contraction:
--
--     2.1  TCP and UDP ports, protocols and what they're for
--     2.8  Networking tools and what they're for
--
--   The public pages print a title as it is stored. The two titles are on the
--   A+ practice test page, on the A+ Core 1 practice test page, on the index
--   of the 220-1201 objectives, and on the page of each of the two objectives,
--   in its heading and in its description. The site's house style has no
--   contractions, and no code changes a stored title on its way to a page.
--
-- What this migration does:
--
--   It changes the last words of those two titles from "what they're for" to
--   "what they are for", and nothing else: two rows of cert_sub_objectives,
--   one column (title). The two objectives keep their ids, their codes and
--   their order, so every question, every saved study path and every page
--   address stays as it is.
--
-- The file that 029 was generated from (src/data/a-plus-v15/core1.ts) and 029
-- itself keep the old words. 029 is the record of what was run, and a test
-- holds it to that file. Nothing reads the titles in that file when the site
-- runs.
--
-- No application code depends on the wording of a title, in the version that
-- is live or in the one that follows it, so the migration can be run before or
-- after a deployment. The pages that print the titles are rebuilt once a day
-- and at every deployment, so the new words appear within a day.
--
-- Run this read-only query first. It changes nothing.
--
-- Query 1: the two titles as the database holds them.
--
--   select s.code, s.title
--   from public.cert_sub_objectives s
--   join public.cert_domains d on d.id = s.domain_id
--   join public.certifications c on c.id = d.certification_id
--   where c.slug = 'a-plus-core1-220-1201'
--     and s.code in ('2.1', '2.8')
--   order by s.code;
--
-- Expect two rows, 2.1 and 2.8, each with a title that ends "what they're
-- for". If both already end "what they are for", the migration is not needed.
-- If the query returns no row, or a title that reads differently from both of
-- these, stop: the database does not match the migration files, and the update
-- below would not do what this file says.
--
-- The update names the old words, so it changes two rows the first time it is
-- run and none if it is run again.
--
-- Afterwards, run Query 1 again. Both titles should end "what they are for".
--
-- To undo it, run the same update with the two phrases exchanged. This returns
-- both titles to what 029 wrote:
--
--   update public.cert_sub_objectives s
--   set title = replace(s.title, 'what they are for', 'what they''re for')
--   from public.cert_domains d
--   join public.certifications c on c.id = d.certification_id
--   where s.domain_id = d.id
--     and c.slug = 'a-plus-core1-220-1201'
--     and s.code in ('2.1', '2.8')
--     and s.title like '%what they are for';
--
-- This file changes the words of two titles only: no table, column, permission
-- or other row is altered.

begin;

-- The two titles lose their contraction.
update public.cert_sub_objectives s
set title = replace(s.title, 'what they''re for', 'what they are for')
from public.cert_domains d
join public.certifications c on c.id = d.certification_id
where s.domain_id = d.id
  and c.slug = 'a-plus-core1-220-1201'
  and s.code in ('2.1', '2.8')
  and s.title like '%what they''re for';

commit;
