-- Daily study reminder: a per-day nudge when the learner has SRS cards due.
-- Rides the existing lifecycle cron (/api/cron/lifecycle). Additive — one
-- preference column, default on, so existing users are enrolled and can opt
-- out of just the daily reminder (scope=daily) without losing exam reminders.

alter table email_preferences
  add column if not exists daily_reminder_enabled boolean not null default true;
