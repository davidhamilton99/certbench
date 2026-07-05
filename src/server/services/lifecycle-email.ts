import "server-only";

import { publicEnv } from "@/env";
import type { Db } from "@/server/supabase/server";
import { createAdminClient } from "@/server/supabase/admin";
import { getProfile } from "@/server/data/profiles";
import { listEnrollments } from "@/server/data/enrollments";
import { getCertification } from "@/server/data/certifications";
import { getSessionPlan } from "@/server/services/session-plan";
import { sendEmail } from "@/server/email/resend";
import {
  countdownEmail,
  digestEmail,
  welcomeEmail,
} from "@/server/email/templates";

/** Exam-countdown days that trigger an email. */
export const COUNTDOWN_DAYS = [14, 7, 3, 1] as const;

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

interface EmailPrefs {
  digestEnabled: boolean;
  unsubscribeUrl: string;
}

/** Fetch-or-create the user's email preferences row. */
async function getPrefs(admin: Db, userId: string): Promise<EmailPrefs> {
  const { data } = await admin
    .from("email_preferences")
    .select("digest_enabled, unsubscribe_token")
    .eq("user_id", userId)
    .maybeSingle();

  let row = data;
  if (!row) {
    const { data: inserted, error } = await admin
      .from("email_preferences")
      .upsert({ user_id: userId }, { onConflict: "user_id" })
      .select("digest_enabled, unsubscribe_token")
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
}

/**
 * Daily lifecycle pass, driven by the Vercel cron:
 *  - exam-countdown emails at T-14/7/3/1 for every enrollment with a date
 *  - weekly readiness digest on Mondays (UTC) for users with activity
 * All sends respect digest_enabled and are deduped per day via email_log.
 */
export async function runLifecycleEmails(
  now: Date = new Date()
): Promise<LifecycleRunResult> {
  const admin = createAdminClient();
  const isMonday = now.getUTCDay() === 1;
  const result: LifecycleRunResult = { users: 0, digests: 0, countdowns: 0 };

  const { data: userPage, error } = await admin.auth.admin.listUsers({
    perPage: 1000,
  });
  if (error) throw new Error(`listUsers failed: ${error.message}`);

  for (const user of userPage.users) {
    if (!user.email || !user.email_confirmed_at) continue;
    if (isTestAccount(user.email)) continue;
    result.users += 1;

    // One user's failure (bad data, missing prefs table, transient error)
    // must not sink the whole run.
    try {
      await processUser(admin, user.id, user.email, now, isMonday, result);
    } catch (err) {
      console.error(`lifecycle emails failed for user ${user.id}:`, err);
    }
  }

  return result;
}

async function processUser(
  admin: Db,
  userId: string,
  email: string,
  now: Date,
  isMonday: boolean,
  result: LifecycleRunResult
): Promise<void> {
  const enrollments = await listEnrollments(admin, userId);
  if (enrollments.length === 0) return;

  const prefs = await getPrefs(admin, userId);
  if (!prefs.digestEnabled) return;

  const profile = await getProfile(admin, userId);
  const displayName = profile?.displayName ?? "there";

  // ---- exam countdowns (any enrollment with a date) ----
  for (const enrollment of enrollments) {
    if (!enrollment.examDate) continue;
    const days = daysUntil(enrollment.examDate, now);
    if (!COUNTDOWN_DAYS.includes(days as (typeof COUNTDOWN_DAYS)[number])) {
      continue;
    }
    const cert = await getCertification(admin, enrollment.certificationId);
    if (!cert) continue;
    if (!(await claimSend(admin, userId, `countdown_${days}`))) continue;
    const plan = await getSessionPlan(admin, userId, cert.id, enrollment.examDate);
    const sent = await sendEmail({
      to: email,
      headers: { "List-Unsubscribe": `<${prefs.unsubscribeUrl}>` },
      ...countdownEmail({
        displayName,
        certName: cert.name,
        daysUntilExam: days,
        readinessScore: plan.readinessScore,
        unsubscribeUrl: prefs.unsubscribeUrl,
      }),
    });
    if (sent) result.countdowns += 1;
  }

  // ---- weekly digest (Mondays, primary enrollment, needs activity) ----
  if (!isMonday) return;
  const primary = enrollments[0];
  const cert = await getCertification(admin, primary.certificationId);
  if (!cert) return;
  const plan = await getSessionPlan(admin, userId, cert.id, primary.examDate);
  if (plan.totalQuestionsSeen === 0) return; // nothing to report yet
  if (!(await claimSend(admin, userId, "digest"))) return;
  const dueCards =
    plan.blocks.find((b) => b.type === "srs_review")?.questionCount ?? 0;
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
  if (sent) result.digests += 1;
}
