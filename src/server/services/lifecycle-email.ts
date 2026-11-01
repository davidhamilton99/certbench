import "server-only";

import { publicEnv } from "@/env";
import type { Db } from "@/server/supabase/server";
import { createAdminClient } from "@/server/supabase/admin";
import { getProfile } from "@/server/data/profiles";
import { listEnrollments } from "@/server/data/enrollments";
import { getCertification } from "@/server/data/certifications";
import { getPathProgress } from "@/server/data/path-progress";
import { getSessionPlan } from "@/server/services/session-plan";
import { loadPathBank } from "@/server/path/bank";
import { sendEmail } from "@/server/email/resend";
import {
  countdownEmail,
  dailyReminderEmail,
  digestEmail,
  pathCountdownEmail,
  pathEmailLink,
  pathNudgeEmail,
  postExamEmail,
  welcomeEmail,
  type EmailContent,
} from "@/server/email/templates";
import { buildPlan } from "@/core/path/plan";
import { NUDGE_MAX_HOURS, NUDGE_MIN_HOURS, pathNudge, pathStanding } from "@/core/path/nudge";
import { sanitizePathProgress } from "@/core/path/progress";
import { isPathCert, type PathCert, type PathProgress } from "@/core/path/types";

/** Exam-countdown days that trigger an email. */
export const COUNTDOWN_DAYS = [14, 7, 3, 1] as const;

/** Days AFTER the exam date to send the "how did it go?" story request. */
export const POST_EXAM_DAY = 2;

/** Whole days from `now` until a yyyy-mm-dd exam date (UTC calendar). */
export function daysUntil(examDate: string, now: Date): number {
  const [y, m, d] = examDate.split("-").map(Number);
  const exam = Date.UTC(y, m - 1, d);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((exam - today) / 86_400_000);
}

/** Accounts that must never receive lifecycle mail (test conventions). */
export function isTestAccount(email: string): boolean {
  return email.includes("+e2e") || email.includes("+rb");
}

/** email_log type for the one-time path nudge: one per exam, ever. */
export const pathNudgeType = (cert: PathCert) => `path_nudge_${cert}`;

interface EmailPrefs {
  digestEnabled: boolean;
  dailyReminderEnabled: boolean;
  /** Turns off all lifecycle mail. */
  unsubscribeUrl: string;
  /** Turns off just the daily reminder (keeps exam countdowns + digest). */
  dailyUnsubscribeUrl: string;
}

/** Fetch-or-create the user's email preferences row. */
async function getPrefs(admin: Db, userId: string): Promise<EmailPrefs> {
  const cols = "digest_enabled, daily_reminder_enabled, unsubscribe_token";
  const { data } = await admin
    .from("email_preferences")
    .select(cols)
    .eq("user_id", userId)
    .maybeSingle();

  let row = data;
  if (!row) {
    const { data: inserted, error } = await admin
      .from("email_preferences")
      .upsert({ user_id: userId }, { onConflict: "user_id" })
      .select(cols)
      .single();
    if (error) throw new Error(`email prefs upsert failed: ${error.message}`);
    row = inserted;
  }
  const base = `${publicEnv.NEXT_PUBLIC_APP_URL}/api/email/unsubscribe?token=${row.unsubscribe_token}`;
  return {
    digestEnabled: row.digest_enabled,
    dailyReminderEnabled: row.daily_reminder_enabled,
    unsubscribeUrl: base,
    dailyUnsubscribeUrl: `${base}&scope=daily`,
  };
}

/**
 * Gate for the daily study reminder — pure so the cron's trickiest decision
 * is unit-testable. Only nudge learners who have real reviews waiting, have
 * the channel on, and haven't already gotten a study email today (so a
 * countdown or the Monday digest never doubles up with a reminder).
 */
export function shouldSendDailyReminder(input: {
  dailyReminderEnabled: boolean;
  hasActivity: boolean;
  dueCards: number;
  sentStudyEmailToday: boolean;
}): boolean {
  return (
    input.dailyReminderEnabled &&
    input.hasActivity &&
    input.dueCards > 0 &&
    !input.sentStudyEmailToday
  );
}

/**
 * Idempotency gate: claims (user, type, today) in email_log. Returns false
 * when today's row already exists — the email was (or is being) sent.
 */
async function claimSend(
  admin: Db,
  userId: string,
  emailType: string
): Promise<boolean> {
  const { data, error } = await admin
    .from("email_log")
    .upsert(
      { user_id: userId, email_type: emailType },
      { onConflict: "user_id,email_type,sent_on", ignoreDuplicates: true }
    )
    .select("id");
  if (error) {
    // Missing migration or transient failure: skip rather than double-send.
    console.error("email_log claim failed:", error.message);
    return false;
  }
  return (data ?? []).length > 0;
}

/** Whether this email type ever went to them (claimSend only covers today). */
async function sentBefore(admin: Db, userId: string, emailType: string): Promise<boolean> {
  const { data, error } = await admin
    .from("email_log")
    .select("id")
    .eq("user_id", userId)
    .eq("email_type", emailType)
    .limit(1);
  if (error) {
    // Can't tell: a one-time email must not risk going twice.
    console.error("email_log read failed:", error.message);
    return true;
  }
  return (data ?? []).length > 0;
}

/**
 * Welcome email after onboarding. Transactional — no digest opt-out check,
 * but still deduped via email_log so re-running onboarding can't resend it.
 * Never throws: onboarding must not fail because email is down.
 */
export async function sendWelcome(
  userId: string,
  email: string,
  certId: string
): Promise<void> {
  try {
    if (isTestAccount(email)) return;
    const admin = createAdminClient();
    if (!(await claimSend(admin, userId, "welcome"))) return;
    const [profile, cert] = await Promise.all([
      getProfile(admin, userId),
      getCertification(admin, certId),
    ]);
    if (!cert) return;
    await sendEmail({
      to: email,
      ...welcomeEmail({
        displayName: profile?.displayName ?? "there",
        certName: cert.name,
      }),
    });
  } catch (err) {
    console.error("welcome email failed:", err);
  }
}

export interface LifecycleRunResult {
  users: number;
  digests: number;
  countdowns: number;
  postExam: number;
  dailyReminders: number;
  pathNudges: number;
}

/** A path someone saved progress on, as of its last save. */
interface SavedPath {
  cert: PathCert;
  progress: PathProgress;
  updatedAt: number;
}

interface RunContext {
  now: Date;
  isMonday: boolean;
  /** Accounts that get the toolkit's emails: active Pro, or admin. */
  pro: Set<string>;
  /** Paths last saved two to seven days ago, by user. */
  stalled: Map<string, SavedPath[]>;
}

/**
 * Daily lifecycle pass, driven by the Vercel cron:
 *  - exam-countdown emails at T-14/7/3/1 for every enrollment with a date
 *  - Pro: weekly readiness digest on Mondays (UTC) for users with activity,
 *    and a daily study reminder on any day they have SRS cards due
 *  - without Pro: a one-time "pick up where you left off" when their path
 *    stalls before the readiness checkpoint (the digest and reminders are
 *    about the toolkit, which is Pro-only; for everyone else it's the path)
 * All sends respect digest_enabled, are deduped per day via email_log, and
 * are capped at one "study" email per user per day (see sentStudyEmailToday).
 */
export async function runLifecycleEmails(
  now: Date = new Date()
): Promise<LifecycleRunResult> {
  const admin = createAdminClient();
  const result: LifecycleRunResult = {
    users: 0,
    digests: 0,
    countdowns: 0,
    postExam: 0,
    dailyReminders: 0,
    pathNudges: 0,
  };

  const { data: userPage, error } = await admin.auth.admin.listUsers({
    perPage: 1000,
  });
  if (error) throw new Error(`listUsers failed: ${error.message}`);

  const [pro, stalled] = await Promise.all([loadProUsers(admin), loadStalledPaths(admin, now)]);
  const ctx: RunContext = { now, isMonday: now.getUTCDay() === 1, pro, stalled };

  for (const user of userPage.users) {
    if (!user.email || !user.email_confirmed_at) continue;
    if (isTestAccount(user.email)) continue;
    result.users += 1;

    // One user's failure (bad data, missing prefs table, transient error)
    // must not sink the whole run.
    try {
      await processUser(admin, user.id, user.email, ctx, result);
    } catch (err) {
      console.error(`lifecycle emails failed for user ${user.id}:`, err);
    }
  }

  return result;
}

/**
 * Who gets the toolkit's emails: active Pro, or the owner's admin role — the
 * same test as the app's paywall. If this can't be read, the run stops: better
 * no email today than Pro emails to free accounts or the reverse.
 */
async function loadProUsers(admin: Db): Promise<Set<string>> {
  const [subs, admins] = await Promise.all([
    admin
      .from("user_subscriptions")
      .select("user_id")
      .eq("plan", "pro")
      .in("status", ["active", "trialing"]),
    admin.from("profiles").select("id").eq("role", "admin"),
  ]);
  const error = subs.error ?? admins.error;
  if (error) throw new Error(`pro lookup failed: ${error.message}`);
  return new Set([
    ...(subs.data ?? []).map((s) => s.user_id),
    ...(admins.data ?? []).map((p) => p.id),
  ]);
}

/** Path progress last saved inside the nudge window, by user. */
async function loadStalledPaths(admin: Db, now: Date): Promise<Map<string, SavedPath[]>> {
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString();
  const { data, error } = await admin
    .from("path_progress")
    .select("user_id, cert_slug, progress, updated_at")
    .gte("updated_at", hoursAgo(NUDGE_MAX_HOURS))
    .lte("updated_at", hoursAgo(NUDGE_MIN_HOURS));
  if (error) {
    // Nudges are the optional part; the rest of the run goes ahead.
    console.error("path_progress read failed:", error.message);
    return new Map();
  }
  const out = new Map<string, SavedPath[]>();
  for (const row of data ?? []) {
    if (!isPathCert(row.cert_slug)) continue;
    const list = out.get(row.user_id) ?? [];
    list.push({
      cert: row.cert_slug,
      progress: sanitizePathProgress(row.progress),
      updatedAt: Date.parse(row.updated_at),
    });
    out.set(row.user_id, list);
  }
  return out;
}

async function processUser(
  admin: Db,
  userId: string,
  email: string,
  ctx: RunContext,
  result: LifecycleRunResult
): Promise<void> {
  const pro = ctx.pro.has(userId);
  const enrollments = await listEnrollments(admin, userId);
  const stalled = pro ? [] : (ctx.stalled.get(userId) ?? []);
  if (enrollments.length === 0 && stalled.length === 0) return;

  const prefs = await getPrefs(admin, userId);
  if (!prefs.digestEnabled) return;

  const profile = await getProfile(admin, userId);
  const displayName = profile?.displayName ?? "there";

  // At most one "study" email (countdown / digest / reminder / nudge) per user per day.
  let sentStudyEmailToday = false;

  // ---- exam countdowns + post-exam story request (per enrollment) ----
  for (const enrollment of enrollments) {
    if (!enrollment.examDate) continue;
    const days = daysUntil(enrollment.examDate, ctx.now);

    // Post-exam: a couple of days after the date, ask how it went. This is
    // the testimonial-flywheel trigger. Keyed per cert so a reschedule of a
    // different cert can still fire.
    if (days === -POST_EXAM_DAY) {
      const cert = await getCertification(admin, enrollment.certificationId);
      if (cert && (await claimSend(admin, userId, `postexam_${cert.id}`))) {
        const sent = await sendEmail({
          to: email,
          headers: { "List-Unsubscribe": `<${prefs.unsubscribeUrl}>` },
          ...postExamEmail({
            displayName,
            certName: cert.name,
            unsubscribeUrl: prefs.unsubscribeUrl,
          }),
        });
        if (sent) result.postExam += 1;
      }
      continue;
    }

    if (!COUNTDOWN_DAYS.includes(days as (typeof COUNTDOWN_DAYS)[number])) {
      continue;
    }
    const cert = await getCertification(admin, enrollment.certificationId);
    if (!cert) continue;
    // Pro: readiness and the toolkit's plan. Otherwise: where they are on their path.
    const content = pro
      ? countdownEmail({
          displayName,
          certName: cert.name,
          daysUntilExam: days,
          readinessScore: (await getSessionPlan(admin, userId, cert.id, enrollment.examDate))
            .readinessScore,
          unsubscribeUrl: prefs.unsubscribeUrl,
        })
      : await pathCountdown(admin, userId, cert.slug, days, displayName, prefs.unsubscribeUrl);
    if (!content) continue;
    if (!(await claimSend(admin, userId, `countdown_${days}`))) continue;
    const sent = await sendEmail({
      to: email,
      headers: { "List-Unsubscribe": `<${prefs.unsubscribeUrl}>` },
      ...content,
    });
    if (sent) {
      result.countdowns += 1;
      sentStudyEmailToday = true;
    }
  }

  // ---- without Pro: the path, once, if it has stalled ----
  if (!pro) {
    if (
      !sentStudyEmailToday &&
      (await sendPathNudge(admin, userId, email, displayName, prefs.unsubscribeUrl, stalled, ctx.now))
    ) {
      result.pathNudges += 1;
    }
    return;
  }

  // ---- primary-enrollment plan (drives the digest + the daily reminder) ----
  const primary = enrollments[0];
  const cert = await getCertification(admin, primary.certificationId);
  if (!cert) return;
  const plan = await getSessionPlan(admin, userId, cert.id, primary.examDate);
  const hasActivity = plan.totalQuestionsSeen > 0;
  const dueCards =
    plan.blocks.find((b) => b.type === "srs_review")?.questionCount ?? 0;

  // ---- weekly digest (Mondays only, needs activity) ----
  if (ctx.isMonday && hasActivity && (await claimSend(admin, userId, "digest"))) {
    const sent = await sendEmail({
      to: email,
      headers: { "List-Unsubscribe": `<${prefs.unsubscribeUrl}>` },
      ...digestEmail({
        displayName,
        certName: cert.name,
        readinessScore: plan.readinessScore,
        trendDelta: plan.readinessTrend?.delta ?? null,
        dueCards,
        daysUntilExam: plan.daysUntilExam,
        unsubscribeUrl: prefs.unsubscribeUrl,
      }),
    });
    if (sent) {
      result.digests += 1;
      sentStudyEmailToday = true;
    }
  }

  // ---- daily study reminder (any day the learner has reviews waiting) ----
  if (
    shouldSendDailyReminder({
      dailyReminderEnabled: prefs.dailyReminderEnabled,
      hasActivity,
      dueCards,
      sentStudyEmailToday,
    }) &&
    (await claimSend(admin, userId, "daily_reminder"))
  ) {
    const sent = await sendEmail({
      to: email,
      headers: { "List-Unsubscribe": `<${prefs.dailyUnsubscribeUrl}>` },
      ...dailyReminderEmail({
        displayName,
        certName: cert.name,
        dueCards,
        readinessScore: plan.readinessScore,
        unsubscribeUrl: prefs.dailyUnsubscribeUrl,
      }),
    });
    if (sent) result.dailyReminders += 1;
  }
}

/** The countdown for an account without Pro: where they are on their path. */
async function pathCountdown(
  admin: Db,
  userId: string,
  slug: string,
  days: number,
  displayName: string,
  unsubscribeUrl: string
): Promise<EmailContent | null> {
  if (!isPathCert(slug)) return null;
  const bank = await loadPathBank(slug);
  if (!bank) return null;
  const { progress } = await getPathProgress(admin, userId, slug);
  return pathCountdownEmail({
    displayName,
    examName: bank.structure.examName,
    daysUntilExam: days,
    standing: pathStanding(buildPlan(bank.structure), progress),
    href: pathEmailLink(slug, "countdown"),
    unsubscribeUrl,
  });
}

/**
 * "Pick up where you left off" for the path they were on most recently, if it
 * has stalled short of the readiness checkpoint and they've never had one for
 * that exam. Returns whether an email went out.
 */
async function sendPathNudge(
  admin: Db,
  userId: string,
  email: string,
  displayName: string,
  unsubscribeUrl: string,
  stalled: SavedPath[],
  now: Date
): Promise<boolean> {
  for (const saved of [...stalled].sort((a, b) => b.updatedAt - a.updatedAt)) {
    const bank = await loadPathBank(saved.cert);
    if (!bank) continue;
    const nudge = pathNudge(buildPlan(bank.structure), saved.progress, saved.updatedAt, now.getTime());
    if (!nudge) continue;
    const type = pathNudgeType(saved.cert);
    if (await sentBefore(admin, userId, type)) continue;
    if (!(await claimSend(admin, userId, type))) continue;
    return sendEmail({
      to: email,
      headers: { "List-Unsubscribe": `<${unsubscribeUrl}>` },
      ...pathNudgeEmail({
        displayName,
        examName: bank.structure.examName,
        nudge,
        href: pathEmailLink(saved.cert, "path_nudge"),
        unsubscribeUrl,
      }),
    });
  }
  return false;
}
