import "server-only";

import { publicEnv } from "@/env";

/**
 * Hand-rolled HTML email templates. Inline styles only (email clients strip
 * stylesheets), 560px column, system font stack. Every lifecycle email
 * carries an unsubscribe link; the welcome email is transactional and
 * doesn't need one.
 */

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

const APP = () => publicEnv.NEXT_PUBLIC_APP_URL;

function layout(bodyHtml: string, unsubscribeUrl?: string): string {
  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#f4f4f5;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#18181b;">
    <div style="margin-bottom:24px;">
      <span style="display:inline-block;background:#2563eb;color:#ffffff;border-radius:6px;padding:3px 7px;font-size:12px;font-weight:700;font-family:ui-monospace,monospace;">CB</span>
      <span style="font-size:16px;font-weight:600;margin-left:8px;">CertBench</span>
    </div>
    <div style="background:#ffffff;border:1px solid #e4e4e7;border-radius:12px;padding:28px;">
      ${bodyHtml}
    </div>
    <p style="font-size:12px;color:#71717a;margin-top:20px;line-height:1.6;">
      CertBench · adaptive CompTIA exam prep
      ${unsubscribeUrl ? `· <a href="${unsubscribeUrl}" style="color:#71717a;">Unsubscribe from these emails</a>` : ""}
    </p>
  </div>
</body>
</html>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;padding:11px 20px;font-size:14px;font-weight:600;margin-top:8px;">${label}</a>`;
}

const scoreColor = (score: number) =>
  score >= 75 ? "#16a34a" : score >= 40 ? "#d97706" : "#dc2626";

export function welcomeEmail(input: {
  displayName: string;
  certName: string;
}): EmailContent {
  const { displayName, certName } = input;
  const first = displayName.split(" ")[0] || displayName;
  return {
    subject: `Your ${certName} study plan is ready`,
    html: layout(`
      <h1 style="font-size:20px;margin:0 0 12px;">Welcome, ${first} 👋</h1>
      <p style="font-size:14px;line-height:1.7;margin:0 0 12px;">
        You're set up for <strong>${certName}</strong>. Here's how CertBench works:
      </p>
      <ol style="font-size:14px;line-height:1.9;margin:0 0 16px;padding-left:20px;">
        <li><strong>Take the diagnostic</strong> — 25 questions, ~20 minutes, sets your baseline readiness score.</li>
        <li><strong>Follow the daily plan</strong> — every day we order the highest-impact work for you: reviews first, then your weakest domain.</li>
        <li><strong>Book the exam when the gauge turns green</strong> — the readiness score is deliberately conservative.</li>
      </ol>
      ${button(`${APP()}/dashboard`, "Open your study plan")}
    `),
    text: `Welcome, ${first}!\n\nYou're set up for ${certName}. Take the 25-question diagnostic to set your baseline, then follow your daily plan.\n\nOpen your study plan: ${APP()}/dashboard`,
  };
}

export function digestEmail(input: {
  displayName: string;
  certName: string;
  readinessScore: number;
  trendDelta: number | null;
  dueCards: number;
  daysUntilExam: number | null;
  unsubscribeUrl: string;
}): EmailContent {
  const score = Math.round(input.readinessScore);
  const first = input.displayName.split(" ")[0] || input.displayName;
  const trendLine =
    input.trendDelta !== null && input.trendDelta !== 0
      ? `<span style="color:${input.trendDelta > 0 ? "#16a34a" : "#dc2626"};font-weight:600;">${input.trendDelta > 0 ? "▲" : "▼"} ${Math.abs(input.trendDelta)}% this week</span>`
      : `<span style="color:#71717a;">no change this week</span>`;
  const examLine =
    input.daysUntilExam !== null
      ? `<p style="font-size:14px;margin:0 0 4px;color:#71717a;">${input.daysUntilExam} days until your exam.</p>`
      : "";
  return {
    subject: `${input.certName} readiness: ${score}%${input.trendDelta ? ` (${input.trendDelta > 0 ? "+" : ""}${input.trendDelta}%)` : ""}`,
    html: layout(
      `
      <h1 style="font-size:18px;margin:0 0 16px;">Your week, ${first}</h1>
      <div style="text-align:center;padding:12px 0 20px;">
        <div style="font-size:44px;font-weight:700;font-family:ui-monospace,monospace;color:${scoreColor(score)};">${score}%</div>
        <div style="font-size:13px;margin-top:4px;">${trendLine}</div>
      </div>
      ${examLine}
      <p style="font-size:14px;line-height:1.7;margin:0 0 12px;">
        You have <strong>${input.dueCards} card${input.dueCards === 1 ? "" : "s"} due for review</strong> — clearing them is today's highest-impact work.
      </p>
      ${button(`${APP()}/dashboard`, "See today's plan")}
    `,
      input.unsubscribeUrl
    ),
    text: `${input.certName} readiness: ${score}%\n${input.daysUntilExam !== null ? `${input.daysUntilExam} days until your exam.\n` : ""}${input.dueCards} cards due for review.\n\nSee today's plan: ${APP()}/dashboard\n\nUnsubscribe: ${input.unsubscribeUrl}`,
  };
}

export function postExamEmail(input: {
  displayName: string;
  certName: string;
  unsubscribeUrl: string;
}): EmailContent {
  const first = input.displayName.split(" ")[0] || input.displayName;
  const app = APP();
  return {
    subject: `How did your ${input.certName} exam go?`,
    html: layout(
      `
      <h1 style="font-size:18px;margin:0 0 12px;">How did it go, ${first}?</h1>
      <p style="font-size:14px;line-height:1.7;margin:0 0 16px;">
        Your ${input.certName} exam date has passed — we're pulling for you.
        Let us know how it went:
      </p>
      <div style="margin:0 0 8px;">
        ${button(`${app}/feedback?r=pass`, "I passed 🎉")}
      </div>
      <p style="font-size:14px;line-height:1.7;margin:8px 0 0;">
        Didn't get it this time?
        <a href="${app}/feedback?r=fail" style="color:#2563eb;">We'll help you regroup →</a>
      </p>
    `,
      input.unsubscribeUrl
    ),
    text: `How did your ${input.certName} exam go?\n\nPassed? Tell us: ${app}/feedback?r=pass\nNot this time? We'll help you regroup: ${app}/feedback?r=fail\n\nUnsubscribe: ${input.unsubscribeUrl}`,
  };
}

export function countdownEmail(input: {
  displayName: string;
  certName: string;
  daysUntilExam: number;
  readinessScore: number;
  unsubscribeUrl: string;
}): EmailContent {
  const score = Math.round(input.readinessScore);
  const first = input.displayName.split(" ")[0] || input.displayName;
  const advice =
    input.daysUntilExam <= 1
      ? "No cramming tonight — clear your due reviews, skim your weakest domain's notes, and sleep. You've done the work."
      : input.daysUntilExam <= 3
        ? "Final stretch: due reviews every day, plus one timed practice exam to calibrate pacing."
        : input.daysUntilExam <= 7
          ? "This week: a full timed practice exam, then drill whatever domain scores lowest."
          : "Two weeks out is where consistent daily reviews pay off most — keep the streak alive.";
  return {
    subject:
      input.daysUntilExam <= 1
        ? `Tomorrow's the day — ${input.certName}`
        : `${input.daysUntilExam} days to your ${input.certName} exam`,
    html: layout(
      `
      <h1 style="font-size:18px;margin:0 0 12px;">${input.daysUntilExam <= 1 ? "Exam day is tomorrow" : `${input.daysUntilExam} days to go`}, ${first}</h1>
      <p style="font-size:14px;line-height:1.7;margin:0 0 8px;">
        Your ${input.certName} readiness is
        <strong style="color:${scoreColor(score)};">${score}%</strong>.
      </p>
      <p style="font-size:14px;line-height:1.7;margin:0 0 12px;">${advice}</p>
      ${button(`${APP()}/dashboard`, "Open your plan")}
    `,
      input.unsubscribeUrl
    ),
    text: `${input.daysUntilExam} days to your ${input.certName} exam.\nReadiness: ${score}%.\n${advice}\n\nOpen your plan: ${APP()}/dashboard\n\nUnsubscribe: ${input.unsubscribeUrl}`,
  };
}
