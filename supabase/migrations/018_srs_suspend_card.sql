-- Migration 018: Add suspended_at to question_performance so users can
-- remove individual cards from SRS scheduling without deleting their
-- accuracy history. A non-null timestamp means "suspended as of that
-- time"; NULL means "active". Existing RLS ("Users manage own
-- performance") already covers mutations of this column.

alter table public.question_performance
  add column if not exists suspended_at timestamptz;

-- Partial index on the non-suspended cards speeds up the due-cards
-- lookup (the common path). Index is partial so suspended rows don't
-- bloat it.
create index if not exists question_performance_due_idx
  on public.question_performance (user_id, certification_id, srs_next_review_at)
  where suspended_at is null and srs_next_review_at is not null;
