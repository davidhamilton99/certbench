import "server-only";

import { publicEnv } from "@/env";
import type { Db } from "@/server/supabase/server";
import { createAdminClient } from "@/server/supabase/admin";
import { getProfile } from "@/server/data/profiles";
import { listEnrollments } from "@/server/data/enrollments";
import { getCertification } from "@/server/data/certifications";
import { getPathProgress } from "@/server/data/path-progress";
import { loadPathBank } from "@/server/path/bank";
import { sendEmail } from "@/server/email/resend";
import {
  checkpointResultEmail,
  pathCountdownEmail,
  pathEmailLink,
  pathNudgeEmail,
  postExamEmail,
  welcomeEmail,
  type EmailContent,
} from "@/server/email/templates";
import { buildPlan } from "@/core/path/plan";
import { checkpointFollowUp, FOLLOW_UP_MAX_HOURS, FOLLOW_UP_MIN_HOURS } from "@/core/path/follow-up";
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

/** email_log type for the one-time checkpoint follow-up: one per exam, ever. */
export const pathOfferType = (cert: PathCert) => `path_offer_${cert}`;

interface EmailPrefs {
  digestEnabled: boolean;
  /** Turns off all lifecycle mail. */
  unsubscribeUrl: string;
}

/** Fetch-or-create the user's email preferences row. */
async function getPrefs(admin: Db, userId: string): Promise<EmailPrefs> {
  const cols = "digest_enabled, unsubscribe_token";
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
  return {
    digestEnabled: row.digest_enabled,
    unsubscribeUrl: `${publicEnv.NEXT_PUBLIC_APP_URL}/api/email/unsubscribe?token=${row.unsubscribe_token}`,
  };
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
  /** Users whose pass threw: each is logged, and counted here for the run's log line. */
  failed: number;
  countdowns: number;
  postExam: number;
  pathNudges: number;
  pathOffers: number;
}

/** A path someone saved progress on, as of its last save. */
interface SavedPath {
  cert: PathCert;
  progress: PathProgress;
  updatedAt: number;
}

interface RunContext {
  now: Date;
  /** Accounts with Pro, or admin: no path nudge or follow-up, which sell Pro. */
  pro: Set<string>;
  /** Paths last saved inside the path emails' window (20 hours to 7 days ago), by user. */
  recent: Map<string, SavedPath[]>;
}

/**
 * Daily lifecycle pass, driven by the Vercel cron. Every email is about their
 * path and links back to it; a member is never sent into the old workspace.
 *  - exam-countdown emails at T-14/7/3/1 for every enrollment with a date:
 *    where they are on their path, Pro or not
 *  - a "how did it go?" two days after the exam date
 *  - without Pro: a one-time "pick up where you left off" if their path
 *    stalls before the readiness checkpoint, and a one-time look at their
 *    checkpoint result and the rest of the path if they took it and didn't buy
 * All sends respect digest_enabled and are deduped per day via email_log.
 * Apart from countdowns, which are tied to a date, a user gets at most one
 * "study" email a day (see sentStudyEmailToday).
 */
export async function runLifecycleEmails(
  now: Date = new Date()
): Promise<LifecycleRunResult> {
  const admin = createAdminClient();
  const result: LifecycleRunResult = {
    users: 0,
    failed: 0,
    countdowns: 0,
    postExam: 0,
    pathNudges: 0,
    pathOffers: 0,
  };

  const { data: userPage, error } = await admin.auth.admin.listUsers({
    perPage: 1000,
  });
  if (error) throw new Error(`listUsers failed: ${error.message}`);

  const [pro, recent] = await Promise.all([loadProUsers(admin), loadRecentPaths(admin, now)]);
  const ctx: RunContext = { now, pro, recent };

  for (const user of userPage.users) {
    if (!user.email || !user.email_confirmed_at) continue;
    if (isTestAccount(user.email)) continue;
    result.users += 1;

    // One user's failure (bad data, missing prefs table, transient error)
    // must not sink the whole run.
    try {
      await processUser(admin, user.id, user.email, ctx, result);
    } catch (err) {
      result.failed += 1;
      console.error(`lifecycle emails failed for user ${user.id}:`, err);
    }
  }

  return result;
}

/**
 * Who has Pro: an active subscription, or the owner's admin role — the same
 * test as the app's paywall. If this can't be read, the run stops: better no
 * email today than an offer to someone who already bought.
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

/** Path progress last saved inside either path email's window, by user. */
async function loadRecentPaths(admin: Db, now: Date): Promise<Map<string, SavedPath[]>> {
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString();
  const { data, error } = await admin
    .from("path_progress")
    .select("user_id, cert_slug, progress, updated_at")
    .gte("updated_at", hoursAgo(Math.max(NUDGE_MAX_HOURS, FOLLOW_UP_MAX_HOURS)))
    .lte("updated_at", hoursAgo(Math.min(NUDGE_MIN_HOURS, FOLLOW_UP_MIN_HOURS)));
  if (error) {
    // The path emails are the optional part; the rest of the run goes ahead.
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
  const recent = pro ? [] : (ctx.recent.get(userId) ?? []);
  if (enrollments.length === 0 && recent.length === 0) return;

  const prefs = await getPrefs(admin, userId);
  if (!prefs.digestEnabled) return;

  const profile = await getProfile(admin, userId);
  const displayName = profile?.displayName ?? "there";

  // One "study" email a day. Countdowns are tied to a date and always go; the
  // path emails only go on a day nothing else did.
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
    const content = await pathCountdown(admin, userId, cert.slug, days, displayName, pro, prefs.unsubscribeUrl);
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

  // ---- without Pro: their path, at a stall or after the checkpoint ----
  if (!pro && !sentStudyEmailToday) {
    const sent = await sendPathEmail(admin, userId, email, displayName, prefs.unsubscribeUrl, recent, ctx.now);
    if (sent === "nudge") result.pathNudges += 1;
    if (sent === "offer") result.pathOffers += 1;
  }
}

/** The exam countdown: where they are on their path. */
async function pathCountdown(
  admin: Db,
  userId: string,
  slug: string,
  days: number,
  displayName: string,
  pro: boolean,
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
    pro,
    href: pathEmailLink(slug, "countdown"),
    unsubscribeUrl,
  });
}

/**
 * The one-time path emails, for the path they were on most recently. If it
 * stalled short of the readiness checkpoint, "pick up where you left off". If
 * they took the checkpoint and didn't buy, their result and what the rest of
 * the path holds. Each goes once per exam, ever. Returns which one went out.
 */
async function sendPathEmail(
  admin: Db,
  userId: string,
  email: string,
  displayName: string,
  unsubscribeUrl: string,
  recent: SavedPath[],
  now: Date
): Promise<"nudge" | "offer" | null> {
  for (const saved of [...recent].sort((a, b) => b.updatedAt - a.updatedAt)) {
    const bank = await loadPathBank(saved.cert);
    if (!bank) continue;
    const plan = buildPlan(bank.structure);
    const { examName, domains } = bank.structure;
    const followUp = checkpointFollowUp(plan, domains, saved.progress, saved.updatedAt, now.getTime());
    const nudge = followUp ? null : pathNudge(plan, saved.progress, saved.updatedAt, now.getTime());
    let kind: "nudge" | "offer";
    let content: EmailContent;
    if (followUp) {
      kind = "offer";
      content = checkpointResultEmail({
        displayName,
        examName,
        domains,
        followUp,
        questionCount: bank.questions.length,
        href: pathEmailLink(saved.cert, "path_offer"),
        unsubscribeUrl,
      });
    } else if (nudge) {
      kind = "nudge";
      content = pathNudgeEmail({
        displayName,
        examName,
        nudge,
        href: pathEmailLink(saved.cert, "path_nudge"),
        unsubscribeUrl,
      });
    } else continue;
    const type = kind === "offer" ? pathOfferType(saved.cert) : pathNudgeType(saved.cert);
    if (await sentBefore(admin, userId, type)) continue;
    if (!(await claimSend(admin, userId, type))) continue;
    const sent = await sendEmail({ to: email, headers: { "List-Unsubscribe": `<${unsubscribeUrl}>` }, ...content });
    return sent ? kind : null;
  }
  return null;
}
