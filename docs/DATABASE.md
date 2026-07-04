# Database — the schema contract

The Supabase Postgres schema is the one thing the 2026 rebuild did NOT change.
It holds live user accounts, 2,376 seeded questions, SRS history, and Stripe
billing state. **Treat it as append-only: new migrations must be additive**
(nullable columns, new tables, new functions) and are applied manually via the
Supabase SQL editor.

Source of truth for types: `npm run db:types` regenerates
`src/types/database.gen.ts`; `npm run db:types:check` fails CI on drift.
(The committed file is currently a verified hand-maintained stopgap with a
`Relationships` wrapper supabase-js requires — replace wholesale after the
first generated run.)

## Table families

**Content (global, read-only to users):**
- `certifications` → `cert_domains` (exam_weight sums to 100) → `cert_sub_objectives`
- `cert_questions` — options JSONB `[{text, is_correct}]`, `correct_index`,
  `difficulty` (1–3, mostly the default 2), `is_diagnostic_eligible`

**Per-user progress:**
- `profiles` — 1:1 with auth.users (`role`: user|admin, `onboarding_completed`)
- `user_enrollments` — cert + optional `exam_date`
- `diagnostic_attempts` / `diagnostic_responses`
- `practice_exam_attempts` / `practice_exam_responses` — `exam_type`:
  full | domain_drill | weak_points; both attempt tables carry
  `progress_state` JSONB + `progress_saved_at` (migration 016) for resume
- `question_performance` — the SRS + accuracy ledger: `times_seen`,
  `times_correct`, `srs_interval_days`, `srs_ease_factor`,
  `srs_next_review_at`, `streak`, `suspended_at` (migration 018)
- `readiness_snapshots` — one row per recompute; `overall_score`,
  `domain_scores` JSONB, `is_preliminary`

**User study materials** (deliberately no FKs to cert content):
- `user_study_sets` — `is_public`, denormalised `question_count`,
  `attempt_count`, `bookmark_count` (trigger-maintained)
- `user_study_questions` — `question_type` (migration 004): multiple_choice |
  true_false | multiple_select | ordering | matching; options JSONB shape
  varies by type
- `study_set_progress`, `study_set_bookmarks`, `study_set_cert_tags`,
  `community_reports`

**Moderation & billing:**
- `question_flags` — one per user per question; status pending|actioned|dismissed
- `user_subscriptions` — plan free|pro, status, Stripe ids, synced only by the
  webhook (service role)
- `ai_generation_usage` — per-user per-month counter
- `rate_limit_buckets` (migration 020) — no RLS policies; service-role only

## RPCs

- `increment_generation_count(p_user_id, p_month)` — atomic quota bump
- `increment_attempt_count(set_id)` — public-set play counter (no-op if private)
- `check_rate_limit(p_key, p_limit, p_window_seconds)` — fixed-window limiter,
  SECURITY DEFINER, revoked from anon/authenticated

## Migration history gotchas

- Migrations 001–020 are in `supabase/migrations/`. Numbering skips 006–009.
- Migration **018 was historically never applied to production** (discovered
  during the rebuild — the old suspend feature was silently broken). 018 and
  020 were applied together on 2026-07-02. If a column seems missing in prod,
  probe before assuming: the migration folder and the live schema have
  diverged before.
- The Supabase free tier auto-pauses on inactivity and the project hostname
  stops resolving entirely — resume from the dashboard.
