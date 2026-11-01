import "server-only";

import { publicEnv } from "@/env";
import type { ToolSource } from "@/contracts/tools";
import { CHECKPOINT_SIZE, MINUTES_PER_STOP, PRACTICE_SIZE } from "@/core/path/plan";
import type { CheckpointFollowUp } from "@/core/path/follow-up";
import type { PathNudge, PathStanding } from "@/core/path/nudge";
import type { PathDomain } from "@/core/path/types";
import { PASS_GUARANTEE_HREF, PASS_GUARANTEE_TERMS } from "@/lib/pricing/guarantee";
import { BASE_PRICES_CENTS, formatUsd } from "@/lib/pricing/ppp";

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

/**
 * `preheader` is the inbox preview line. Without one, clients preview the
 * first text they find, which is the "CB CertBench" logo.
 */
function layout(bodyHtml: string, unsubscribeUrl?: string, preheader?: string): string {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f4f4f5;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>` : ""}
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

/** For names and titles going into email HTML. */
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const stopCount = (n: number) => `${n} stop${n === 1 ? "" : "s"}`;

/**
 * A link into someone's path from an email. It goes through sign-in so it
 * works on any device: signed in, /login forwards straight to the path; signed
 * out, they sign in and land on it with their saved progress.
 */
export function pathEmailLink(cert: string, campaign: string): string {
  const next = `/path/${cert}?utm_source=email&utm_medium=lifecycle&utm_campaign=${campaign}`;
  return `${APP()}/login?next=${encodeURIComponent(next)}`;
}

/**
 * The free stretch of a path as a row of stops: played ones filled and
 * checked, the next one ringed, the checkpoint flagged at the end. Tables and
 * borders only, so it holds up in every mail client.
 */
function pathStrip(stretch: PathNudge["stretch"]): string {
  const next = stretch.findIndex((s) => !s.done);
  const dot = (s: PathNudge["stretch"][number], i: number) => {
    const [bg, fg, ring, mark] = s.done
      ? ["#2563eb", "#ffffff", "#2563eb", "&#10003;"]
      : s.kind === "checkpoint"
        ? ["#fffbeb", "#b45309", i === next ? "#2563eb" : "#f59e0b", "&#9873;"]
        : i === next
          ? ["#ffffff", "#2563eb", "#2563eb", String(i + 1)]
          : ["#fafafa", "#a1a1aa", "#e4e4e7", String(i + 1)];
    return `<td width="28" style="width:28px;padding:0;"><div style="width:24px;height:24px;line-height:24px;border:2px solid ${ring};border-radius:14px;background:${bg};color:${fg};font-size:12px;font-weight:700;text-align:center;">${mark}</div></td>`;
  };
  const line = (lit: boolean) =>
    `<td style="padding:0 3px;"><div style="height:2px;line-height:2px;font-size:0;background:${lit ? "#2563eb" : "#e4e4e7"};">&nbsp;</div></td>`;
  const cells = stretch
    .map((s, i) => (i === 0 ? "" : line(stretch[i - 1].done && s.done)) + dot(s, i))
    .join("");
  return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:4px 0 6px;"><tr>${cells}</tr></table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 16px;font-size:11px;color:#71717a;"><tr>
        <td style="padding:0;">Warm-up</td><td style="padding:0;text-align:right;">Checkpoint</td>
      </tr></table>`;
}

export function welcomeEmail(input: {
  displayName: string;
  certName: string;
}): EmailContent {
  const { displayName, certName } = input;
  const first = displayName.split(" ")[0] || displayName;
  return {
    subject: `Your ${certName} path is saved`,
    html: layout(`
      <h1 style="font-size:20px;margin:0 0 12px;">Welcome, ${first} 👋</h1>
      <p style="font-size:14px;line-height:1.7;margin:0 0 12px;">
        You're set up for <strong>${certName}</strong>. Here's how CertBench works:
      </p>
      <ol style="font-size:14px;line-height:1.9;margin:0 0 16px;padding-left:20px;">
        <li><strong>Follow your path</strong> — every exam objective as a short stop, in order. You never have to decide what to study next.</li>
        <li><strong>Let misses come back</strong> — anything you get wrong returns in a later stop until it sticks.</li>
        <li><strong>Hit the readiness checkpoint</strong> — exam-style questions across every domain show where you stand.</li>
      </ol>
      ${button(`${APP()}/start`, "Continue my path")}
    `),
    text: `Welcome, ${first}!\n\nYou're set up for ${certName}. Follow your path one short stop at a time; anything you miss comes back until it sticks, and the readiness checkpoint shows where you stand.\n\nContinue your path: ${APP()}/start`,
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

export function dailyReminderEmail(input: {
  displayName: string;
  certName: string;
  dueCards: number;
  readinessScore: number;
  unsubscribeUrl: string;
}): EmailContent {
  const first = input.displayName.split(" ")[0] || input.displayName;
  const score = Math.round(input.readinessScore);
  const n = input.dueCards;
  const cards = `${n} card${n === 1 ? "" : "s"}`;
  return {
    subject: `${n} review${n === 1 ? "" : "s"} due today — ${input.certName}`,
    html: layout(
      `
      <h1 style="font-size:18px;margin:0 0 12px;">${cards} due, ${first}</h1>
      <p style="font-size:14px;line-height:1.7;margin:0 0 12px;">
        Spaced repetition only works when you clear reviews the day they come
        due — that's how ${input.certName} facts settle into long-term memory
        before exam day. A few minutes is all it takes.
      </p>
      <p style="font-size:14px;line-height:1.7;margin:0 0 16px;color:#71717a;">
        Current readiness:
        <strong style="color:${scoreColor(score)};">${score}%</strong>
      </p>
      ${button(`${APP()}/dashboard`, `Review ${cards}`)}
    `,
      input.unsubscribeUrl
    ),
    text: `${cards} due for review today.\nReadiness: ${score}%.\nClear them before you forget: ${APP()}/dashboard\n\nStop daily reminders: ${input.unsubscribeUrl}`,
  };
}

const TOOL_INTRO: Record<ToolSource, string> = {
  "port-numbers-quiz": "You've been drilling port numbers on CertBench",
  "subnetting-practice": "You've been drilling subnetting on CertBench",
  "security-plus-acronyms-quiz":
    "You've been drilling Security+ acronyms on CertBench",
};

/**
 * Sent when an anonymous free-tool user hands over their email for a study
 * plan. Delivers a genuinely useful next-steps plan, then routes to building
 * a plan — the whole point of capturing the lead.
 */
export function studyPlanEmail(input: {
  source: ToolSource;
  unsubscribeUrl: string;
}): EmailContent {
  const app = APP();
  const intro = TOOL_INTRO[input.source];
  return {
    subject: "Your CompTIA study plan — start here",
    html: layout(
      `
      <h1 style="font-size:18px;margin:0 0 12px;">Here's your study plan</h1>
      <p style="font-size:14px;line-height:1.7;margin:0 0 12px;">
        ${intro} — nice work. Drills like that are the easy wins; here's how
        to turn them into a pass:
      </p>
      <ol style="font-size:14px;line-height:1.9;margin:0 0 16px;padding-left:20px;">
        <li><strong>Pick your exam</strong> — CertBench lays out every objective as a path of short stops, so you never have to decide what to study next.</li>
        <li><strong>Play a stop a day, or five</strong> — each one is about three minutes of quick questions on one objective. What you miss comes back until it sticks.</li>
        <li><strong>Hit the readiness checkpoint</strong> — exam-style questions across every domain, scored the way the real exam weights them.</li>
      </ol>
      <p style="font-size:14px;line-height:1.7;margin:0 0 12px;">
        Your first stop needs no account:
      </p>
      ${button(`${app}/start`, "Start my exam path")}
    `,
      input.unsubscribeUrl
    ),
    text: `Here's your CompTIA study plan.\n\n${intro}. Here's how to turn it into a pass:\n1. Pick your exam: every objective is laid out as a path of short stops.\n2. Play a stop at a time: about three minutes each, and misses come back until they stick.\n3. Hit the readiness checkpoint to see where you stand across every domain.\n\nStart your path (no account needed): ${app}/start\n\nUnsubscribe: ${input.unsubscribeUrl}`,
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

const countdownSubject = (days: number, name: string) =>
  days <= 1 ? `Tomorrow's the day — ${name}` : `${days} days to your ${name} exam`;

const countdownHeading = (days: number) =>
  days <= 1 ? "Exam day is tomorrow" : `${days} days to go`;

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
    subject: countdownSubject(input.daysUntilExam, input.certName),
    html: layout(
      `
      <h1 style="font-size:18px;margin:0 0 12px;">${countdownHeading(input.daysUntilExam)}, ${first}</h1>
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

/**
 * The exam countdown for an account without Pro: where they are on their path
 * and the way back to it, instead of the toolkit's plan and reviews.
 */
export function pathCountdownEmail(input: {
  displayName: string;
  examName: string;
  daysUntilExam: number;
  standing: PathStanding;
  href: string;
  unsubscribeUrl: string;
}): EmailContent {
  const { examName, daysUntilExam: days, standing, href } = input;
  const first = input.displayName.split(" ")[0] || input.displayName;
  const left = standing.total - standing.done;
  const where =
    standing.done === 0
      ? `Your ${examName} path is ready: ${stopCount(standing.total)}, about ${MINUTES_PER_STOP} minutes each.`
      : standing.freeLeft === 0
        ? `You've played every free stop of your ${examName} path, readiness checkpoint included. ${left === 1 ? "One more stop is" : `${left} more stops are`} waiting for you.`
        : `You're ${standing.done} of ${standing.total} stops into your ${examName} path.`;
  const advice =
    days <= 1
      ? "No cramming tonight. Get some sleep: you've done the work."
      : days <= 3
        ? "Final stretch: a few stops a day keeps it all fresh, and anything you miss comes back until it sticks."
        : days <= 7
          ? `This week, play a few stops every day. Each one takes about ${MINUTES_PER_STOP} minutes.`
          : `Two weeks out, a few stops a day adds up fast. Each one takes about ${MINUTES_PER_STOP} minutes.`;
  const label = standing.done === 0 ? "Start my path" : "Continue my path";
  return {
    subject: countdownSubject(days, examName),
    html: layout(
      `
      <h1 style="font-size:18px;margin:0 0 12px;">${countdownHeading(days)}, ${esc(first)}</h1>
      <p style="font-size:14px;line-height:1.7;margin:0 0 8px;">${where}</p>
      <p style="font-size:14px;line-height:1.7;margin:0 0 12px;">${advice}</p>
      ${button(href, label)}
    `,
      input.unsubscribeUrl
    ),
    text: `${countdownHeading(days)}, ${first}.\n\n${where}\n${advice}\n\n${label}: ${href}\n\nUnsubscribe: ${input.unsubscribeUrl}`,
  };
}

/**
 * The one-time "pick up where you left off", for someone who stopped a few
 * days short of their readiness checkpoint: the next stop by name, how short
 * it is, and how close the checkpoint is.
 */
export function pathNudgeEmail(input: {
  displayName: string;
  examName: string;
  nudge: PathNudge;
  href: string;
  unsubscribeUrl: string;
}): EmailContent {
  const { examName, nudge, href } = input;
  const first = input.displayName.split(" ")[0] || input.displayName;

  if (nudge.next.kind === "checkpoint") {
    const what = `Next is your readiness checkpoint: ${CHECKPOINT_SIZE} exam-style questions across every domain, weighted the way the real exam weights them.`;
    const then =
      "When you finish, you'll see your readiness score, how you did on each domain, and when you could be exam-ready.";
    return {
      subject: `Your ${examName} readiness checkpoint is next`,
      html: layout(
        `
        <h1 style="font-size:18px;margin:0 0 12px;">Your checkpoint is next, ${esc(first)}</h1>
        ${pathStrip(nudge.stretch)}
        <p style="font-size:14px;line-height:1.7;margin:0 0 8px;">
          You've played ${stopCount(nudge.done)} of your ${examName} path. ${what}
        </p>
        <p style="font-size:14px;line-height:1.7;margin:0 0 12px;color:#71717a;">${then}</p>
        ${button(href, "Take my checkpoint")}
      `,
        input.unsubscribeUrl
      ),
      text: `Your checkpoint is next, ${first}.\n\nYou've played ${stopCount(nudge.done)} of your ${examName} path. ${what}\n${then}\n\nTake your checkpoint: ${href}\n\nUnsubscribe: ${input.unsubscribeUrl}`,
    };
  }

  const where =
    nudge.done > 0
      ? `You're ${stopCount(nudge.done)} into your ${examName} path.`
      : `You've started your ${examName} path.`;
  const length =
    nudge.next.kind === "practice"
      ? `${PRACTICE_SIZE} exam-style questions`
      : `about ${MINUTES_PER_STOP} minutes of quick questions`;
  const after =
    nudge.toCheckpoint === 1
      ? `Right after it comes your readiness checkpoint: ${CHECKPOINT_SIZE} exam-style questions that show where you stand on every domain.`
      : `It's ${nudge.toCheckpoint} short stops from here to your readiness checkpoint, where ${CHECKPOINT_SIZE} exam-style questions show where you stand on every domain.`;
  return {
    subject: `Next on your ${examName} path: ${nudge.next.title}`,
    html: layout(
      `
      <h1 style="font-size:18px;margin:0 0 12px;">Pick up where you left off, ${esc(first)}</h1>
      ${pathStrip(nudge.stretch)}
      <p style="font-size:14px;line-height:1.7;margin:0 0 8px;">
        ${where} Next up is <strong>${esc(nudge.next.title)}</strong>: ${length}.
      </p>
      <p style="font-size:14px;line-height:1.7;margin:0 0 12px;color:#71717a;">${after}</p>
      ${button(href, "Play my next stop")}
    `,
      input.unsubscribeUrl
    ),
    text: `Pick up where you left off, ${first}.\n\n${where} Next up is ${nudge.next.title}: ${length}.\n${after}\n\nPlay your next stop: ${href}\n\nUnsubscribe: ${input.unsubscribeUrl}`,
  };
}

/** A share out of 100 as a bar. Table cells, so every mail client draws it. */
function bar(pct: number, color: string): string {
  const filled = Math.max(0, Math.min(100, Math.round(pct)));
  const td = (w: number, bg: string) =>
    `<td width="${w}%" style="width:${w}%;height:6px;line-height:6px;font-size:0;background:${bg};">&nbsp;</td>`;
  const cells = (filled > 0 ? td(filled, color) : "") + (filled < 100 ? td(100 - filled, "#e4e4e7") : "");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr>${cells}</tr></table>`;
}

const bandLabel = (score: number) =>
  score >= 75 ? "Exam ready" : score >= 40 ? "Getting close" : "Your starting point";

/**
 * The one-time follow-up for someone who took their readiness checkpoint and
 * didn't buy: the score, how each domain went, where the biggest gain is, and
 * what the rest of the path holds, with the price stated plainly.
 */
export function checkpointResultEmail(input: {
  displayName: string;
  examName: string;
  domains: PathDomain[];
  followUp: CheckpointFollowUp;
  questionCount: number;
  href: string;
  unsubscribeUrl: string;
}): EmailContent {
  const { examName, domains, href } = input;
  const { result, remaining, opportunity } = input.followUp;
  const first = input.displayName.split(" ")[0] || input.displayName;
  const score = result.score;
  const asked = result.domains.reduce((s, d) => s + d.total, 0);
  const price = formatUsd(BASE_PRICES_CENTS.quarterly);
  const guarantee = `${APP()}${PASS_GUARANTEE_HREF}`;

  const read =
    score >= 75
      ? `You scored ${score}% on your ${examName} readiness checkpoint, past the 75% we call exam-ready. Still, that's a first read from ${asked} questions: the rest of your path and full timed practice exams are how you make sure.`
      : `You scored ${score}% on your ${examName} readiness checkpoint: ${asked} exam-style questions, weighted the way the real exam weights its domains. 75% is where we call it exam-ready.`;
  const rows = domains.map((d) => {
    const r = result.domains.find((x) => x.number === d.number);
    return {
      n: d.number.replace(/\.0$/, ""),
      title: d.title,
      tally: r ? `${r.correct}/${r.total}` : "not asked",
      pct: r && r.total > 0 ? (r.correct / r.total) * 100 : 0,
    };
  });
  const gain = opportunity ? `Your biggest opportunity is ${opportunity.title}, ${opportunity.weight}% of the exam.` : "";
  const includes = [
    ...(remaining > 0 ? [`All ${remaining} remaining ${remaining === 1 ? "stop" : "stops"} of your ${examName} path`] : []),
    `Practice across all ${input.questionCount.toLocaleString("en-US")} ${examName} questions`,
    "Timed practice exams, PBQ labs and spaced review",
  ];
  const terms = "Renews every 3 months. Cancel anytime.";

  return {
    subject: `Your ${examName} checkpoint: ${score}%`,
    html: layout(
      `
      <h1 style="font-size:18px;margin:0 0 16px;">Here's where you stand, ${esc(first)}</h1>
      <div style="text-align:center;padding:0 0 18px;">
        <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#71717a;">Readiness checkpoint · ${examName}</div>
        <div style="font-size:52px;line-height:1.15;font-weight:800;letter-spacing:-0.02em;font-variant-numeric:tabular-nums;color:${scoreColor(score)};margin-top:6px;">${score}%</div>
        <div style="font-size:13px;font-weight:600;color:${scoreColor(score)};">${bandLabel(score)}</div>
      </div>
      <p style="font-size:14px;line-height:1.7;margin:0 0 6px;">${read}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 14px;">
        ${rows
          .map(
            (r) => `<tr>
          <td style="padding:10px 0 5px;font-size:13px;"><span style="color:#a1a1aa;margin-right:6px;">${r.n}</span>${esc(r.title)}</td>
          <td style="padding:10px 0 5px;font-size:12px;text-align:right;color:#71717a;font-variant-numeric:tabular-nums;white-space:nowrap;">${r.tally}</td>
        </tr>
        <tr><td colspan="2" style="padding:0;">${bar(r.pct, scoreColor(r.pct))}</td></tr>`
          )
          .join("")}
      </table>
      ${
        opportunity
          ? `<p style="font-size:14px;line-height:1.7;margin:0;">Your biggest opportunity is <strong>${esc(opportunity.title)}</strong>, ${opportunity.weight}% of the exam.</p>`
          : ""
      }
      <div style="border:1px solid #bfdbfe;background:#eff6ff;border-radius:10px;padding:18px;margin:18px 0 0;">
        <div style="font-size:16px;font-weight:700;margin:0 0 10px;">The rest of your ${examName} path</div>
        <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;line-height:1.6;">
          ${includes
            .map(
              (line) =>
                `<tr><td style="padding:2px 10px 2px 0;vertical-align:top;color:#2563eb;font-weight:700;">&#10003;</td><td style="padding:2px 0;">${esc(line)}</td></tr>`
            )
            .join("")}
        </table>
        <div style="margin:14px 0 0;"><span style="font-size:28px;font-weight:700;">${price}</span> <span style="font-size:13px;color:#71717a;">for 3 months</span></div>
        <div style="font-size:12px;color:#71717a;margin:2px 0 6px;">${terms}</div>
        ${button(href, "Unlock my path")}
        <div style="font-size:12px;line-height:1.6;margin:12px 0 0;color:#71717a;"><span style="color:#15803d;font-weight:600;">&#10003; Pass guarantee:</span> ${esc(PASS_GUARANTEE_TERMS)} <a href="${guarantee}" style="color:#71717a;">Terms</a></div>
      </div>
    `,
      input.unsubscribeUrl,
      "How each domain went, and what the rest of your path covers."
    ),
    text: [
      `Here's where you stand, ${first}.`,
      read,
      rows.map((r) => `${r.n} ${r.title}: ${r.tally}`).join("\n"),
      gain,
      `The rest of your ${examName} path:\n${includes.map((l) => `- ${l}`).join("\n")}\n${price} for 3 months. ${terms}\nPass guarantee: ${PASS_GUARANTEE_TERMS} Terms: ${guarantee}`,
      `Unlock your path: ${href}`,
      `Unsubscribe: ${input.unsubscribeUrl}`,
    ]
      .filter(Boolean)
      .join("\n\n"),
  };
}
