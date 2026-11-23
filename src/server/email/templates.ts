import "server-only";

import { publicEnv } from "@/env";
import type { ToolSource } from "@/contracts/tools";
import { CHECKPOINT_SIZE, MINUTES_PER_STOP, PRACTICE_SIZE } from "@/core/path/plan";
import { REHEARSAL_FORMATS } from "@/core/path/rehearsal";
import type { CheckpointFollowUp } from "@/core/path/follow-up";
import type { PathNudge, PathStanding } from "@/core/path/nudge";
import type { PathDomain } from "@/core/path/types";
import { PASS_GUARANTEE_HREF, PASS_GUARANTEE_TERMS } from "@/lib/pricing/guarantee";
import { PRO_PRICE_TERMS } from "@/lib/pricing/terms";
import { READINESS_TARGET, bandFor } from "@/lib/readiness/band";
import { EMAIL_BAND_COLORS, EMAIL_COLORS as C } from "./colors";

/**
 * Hand-rolled HTML email templates. Inline styles only (email clients strip
 * stylesheets), 560px column, system font stack. The colours are the site's
 * own (./colors.ts): its ink on a sheet of paper, on the desk-coloured ground.
 * Every lifecycle email carries an unsubscribe link; the welcome email is
 * transactional and doesn't need one.
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
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:${C.ground};">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>` : ""}
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${C.ink};">
    <div style="margin-bottom:24px;">
      <img src="https://certbench.dev/icon-192.png" width="24" height="24" alt="" style="display:inline-block;vertical-align:middle;border:0;border-radius:5px;" />
      <span style="font-size:16px;font-weight:600;margin-left:8px;">CertBench</span>
    </div>
    <div style="background:${C.paper};border:1px solid ${C.rule};border-radius:8px;padding:28px;">
      ${bodyHtml}
    </div>
    <p style="font-size:12px;color:${C.muted};margin-top:20px;line-height:1.6;">
      CertBench is an independent study program for CompTIA exams.
      ${unsubscribeUrl ? `<a href="${esc(unsubscribeUrl)}" style="color:${C.muted};">Unsubscribe from these emails</a>.` : ""}
    </p>
  </div>
</body>
</html>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:${C.primary};color:${C.onPrimary};text-decoration:none;border-radius:6px;padding:11px 20px;font-size:14px;font-weight:600;margin-top:8px;">${label}</a>`;
}

/** For names and titles going into email HTML. */
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const stopCount = (n: number) => `${n} step${n === 1 ? "" : "s"}`;

/**
 * A link into someone's path from an email. It goes through sign-in so it
 * works on any device: signed in, /login forwards straight to the path; signed
 * out, they sign in and land on it with their saved progress.
 */
/** The post-exam email's links: the signed story page, preset to their answer. */
export function storyEmailLink(token: string, answer: "pass" | "fail"): string {
  return `${APP()}/story?t=${encodeURIComponent(token)}&r=${answer}&utm_source=email&utm_medium=lifecycle&utm_campaign=postexam`;
}

export function pathEmailLink(cert: string, campaign: string): string {
  const next = `/path/${cert}?utm_source=email&utm_medium=lifecycle&utm_campaign=${campaign}`;
  return `${APP()}/login?next=${encodeURIComponent(next)}`;
}

/**
 * The free stretch of a path as a row of stops: played ones filled and
 * checked, the next one ringed, the checkpoint flagged at the end. Tables and
 * borders only, so it holds up in every mail client. It is drawn in the ink
 * that can be pressed and in the page's rule: green, amber and red are kept
 * for marks on answers and for scores.
 */
function pathStrip(stretch: PathNudge["stretch"]): string {
  const next = stretch.findIndex((s) => !s.done);
  const dot = (s: PathNudge["stretch"][number], i: number) => {
    const [bg, fg, ring, mark] = s.done
      ? [C.primary, C.onPrimary, C.primary, "&#10003;"]
      : s.kind === "checkpoint"
        ? [C.paper, i === next ? C.primary : C.muted, i === next ? C.primary : C.rule, "&#9873;"]
        : i === next
          ? [C.paper, C.primary, C.primary, String(i + 1)]
          : [C.ground, C.muted, C.rule, String(i + 1)];
    return `<td width="28" style="width:28px;padding:0;"><div style="width:24px;height:24px;line-height:24px;border:2px solid ${ring};border-radius:14px;background:${bg};color:${fg};font-size:12px;font-weight:700;text-align:center;">${mark}</div></td>`;
  };
  const line = (lit: boolean) =>
    `<td style="padding:0 3px;"><div style="height:2px;line-height:2px;font-size:0;background:${lit ? C.primary : C.rule};">&nbsp;</div></td>`;
  const cells = stretch
    .map((s, i) => (i === 0 ? "" : line(stretch[i - 1].done && s.done)) + dot(s, i))
    .join("");
  return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:4px 0 6px;"><tr>${cells}</tr></table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 16px;font-size:11px;color:${C.muted};"><tr>
        <td style="padding:0;">Introductory questions</td><td style="padding:0;text-align:right;">Readiness checkpoint</td>
      </tr></table>`;
}

export function welcomeEmail(input: {
  displayName: string;
  certName: string;
}): EmailContent {
  const { displayName, certName } = input;
  const first = displayName.split(" ")[0] || displayName;
  return {
    subject: `Your ${certName} study path is saved`,
    html: layout(`
      <h1 style="font-size:20px;margin:0 0 12px;">Welcome to CertBench, ${first}</h1>
      <p style="font-size:14px;line-height:1.7;margin:0 0 12px;">
        Your account is set up for <strong>${certName}</strong>. This is how CertBench works.
      </p>
      <ol style="font-size:14px;line-height:1.9;margin:0 0 16px;padding-left:20px;">
        <li><strong>Follow your study path.</strong> Every exam objective is a short step, and the steps are in order, so you do not have to decide what to study next.</li>
        <li><strong>Review what you miss.</strong> A question that you answer incorrectly returns in a later step until you answer it correctly.</li>
        <li><strong>Take the readiness checkpoint.</strong> Exam-style questions from every domain show where you stand.</li>
      </ol>
      ${button(`${APP()}/start`, "Continue the study path")}
    `),
    text: `Welcome to CertBench, ${first}.\n\nYour account is set up for ${certName}. Follow your study path one short step at a time. A question that you answer incorrectly returns in a later step until you answer it correctly, and the readiness checkpoint shows where you stand.\n\nContinue your study path: ${APP()}/start`,
  };
}

const TOOL_INTRO: Record<ToolSource, string> = {
  "port-numbers-quiz": "You have been practicing port numbers on CertBench",
  "subnetting-practice": "You have been practicing subnetting on CertBench",
  "security-plus-acronyms-quiz":
    "You have been practicing Security+ acronyms on CertBench",
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
    subject: "Your CompTIA study plan",
    html: layout(
      `
      <h1 style="font-size:18px;margin:0 0 12px;">Your study plan</h1>
      <p style="font-size:14px;line-height:1.7;margin:0 0 12px;">
        ${intro}. Drills of that kind cover the facts. These three steps cover the rest of the exam.
      </p>
      <ol style="font-size:14px;line-height:1.9;margin:0 0 16px;padding-left:20px;">
        <li><strong>Choose your exam.</strong> CertBench sets out every objective as a study path of short steps, so you do not have to decide what to study next.</li>
        <li><strong>Complete one step or more each day.</strong> Each step is about three minutes of short questions on one objective. A question that you miss returns until you answer it correctly.</li>
        <li><strong>Take the readiness checkpoint.</strong> It has exam-style questions from every domain, weighted in the same way as the real exam.</li>
      </ol>
      <p style="font-size:14px;line-height:1.7;margin:0 0 12px;">
        You do not need an account for your first step.
      </p>
      ${button(`${app}/start`, "Start the study path for my exam")}
    `,
      input.unsubscribeUrl
    ),
    text: `This is your CompTIA study plan.\n\n${intro}. Drills of that kind cover the facts. These three steps cover the rest of the exam.\n1. Choose your exam. Every objective is set out as a study path of short steps.\n2. Complete one step or more each day. Each step takes about three minutes, and a question that you miss returns until you answer it correctly.\n3. Take the readiness checkpoint to see where you stand in every domain.\n\nStart the study path (you do not need an account): ${app}/start\n\nUnsubscribe: ${input.unsubscribeUrl}`,
  };
}

export function postExamEmail(input: {
  displayName: string;
  certName: string;
  unsubscribeUrl: string;
  /** The signed /story links: no sign-in between the button and the form. */
  passHref: string;
  failHref: string;
}): EmailContent {
  const first = input.displayName.split(" ")[0] || input.displayName;
  return {
    subject: `How did your ${input.certName} exam go?`,
    html: layout(
      `
      <h1 style="font-size:18px;margin:0 0 12px;">How did your exam go, ${first}?</h1>
      <p style="font-size:14px;line-height:1.7;margin:0 0 16px;">
        The date of your ${input.certName} exam has passed, and we hope that it went well.
        Please let us know the result.
      </p>
      <div style="margin:0 0 8px;">
        ${button(input.passHref, "I passed the exam")}
      </div>
      <p style="font-size:14px;line-height:1.7;margin:8px 0 0;">
        If you did not pass this time,
        <a href="${esc(input.failHref)}" style="color:${C.primary};">CertBench can help you prepare for a retake</a>.
      </p>
    `,
      input.unsubscribeUrl
    ),
    text: `How did your ${input.certName} exam go?\n\nIf you passed, please tell us: ${input.passHref}\nIf you did not pass this time, CertBench can help you prepare for a retake: ${input.failHref}\n\nUnsubscribe: ${input.unsubscribeUrl}`,
  };
}

const countdownSubject = (days: number, name: string) =>
  days <= 1 ? `Your ${name} exam is tomorrow` : `${days} days until your ${name} exam`;

const countdownHeading = (days: number) =>
  days <= 1 ? "Your exam is tomorrow" : `Your exam is in ${days} days`;

/**
 * The exam countdown: where they are on their path and the way back to it.
 * Pro gets the whole path counted, with no talk of free stops.
 */
export function pathCountdownEmail(input: {
  displayName: string;
  examName: string;
  daysUntilExam: number;
  standing: PathStanding;
  pro: boolean;
  href: string;
  unsubscribeUrl: string;
}): EmailContent {
  const { examName, daysUntilExam: days, standing, href } = input;
  const first = input.displayName.split(" ")[0] || input.displayName;
  const left = standing.total - standing.done;
  const where =
    standing.done === 0
      ? `Your ${examName} study path is ready. It has ${stopCount(standing.total)} of about ${MINUTES_PER_STOP} minutes each.`
      : left === 0
        ? `You have completed every step of your ${examName} study path.`
        : standing.freeLeft === 0 && !input.pro
          ? `You have completed every free step of your ${examName} study path, including the readiness checkpoint. ${left === 1 ? "One more step remains" : `${left} more steps remain`}.`
          : `You have completed ${standing.done} of the ${standing.total} steps in your ${examName} study path.`;
  const advice =
    days <= 1
      ? "Do not study late tonight. Rest well: you have done the work."
      : days <= 3
        ? "In these last days, a few steps each day will keep the material fresh, and a question that you miss returns until you answer it correctly."
        : days <= 7
          ? `This week, complete a few steps every day. Each step takes about ${MINUTES_PER_STOP} minutes.`
          : `With two weeks remaining, a few steps each day make a real difference. Each step takes about ${MINUTES_PER_STOP} minutes.`;
  const label = standing.done === 0 ? "Start the study path" : "Continue the study path";
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
    const what = `Your next step is the readiness checkpoint. It has ${CHECKPOINT_SIZE} exam-style questions from every domain, weighted in the same way as the real exam.`;
    const then =
      "When you finish, you will see a first measure of your readiness, your result in each domain, and the date by which you would finish the rest of your study path.";
    return {
      subject: `Your ${examName} readiness checkpoint is next`,
      html: layout(
        `
        <h1 style="font-size:18px;margin:0 0 12px;">Your readiness checkpoint is next, ${esc(first)}</h1>
        ${pathStrip(nudge.stretch)}
        <p style="font-size:14px;line-height:1.7;margin:0 0 8px;">
          You have completed ${stopCount(nudge.done)} of your ${examName} study path. ${what}
        </p>
        <p style="font-size:14px;line-height:1.7;margin:0 0 12px;color:${C.muted};">${then}</p>
        ${button(href, "Take the checkpoint")}
      `,
        input.unsubscribeUrl
      ),
      text: `Your readiness checkpoint is next, ${first}.\n\nYou have completed ${stopCount(nudge.done)} of your ${examName} study path. ${what}\n${then}\n\nTake the checkpoint: ${href}\n\nUnsubscribe: ${input.unsubscribeUrl}`,
    };
  }

  const where =
    nudge.done > 0
      ? `You have completed ${stopCount(nudge.done)} of your ${examName} study path.`
      : `You have started your ${examName} study path.`;
  const length =
    nudge.next.kind === "practice"
      ? `It has ${PRACTICE_SIZE} exam-style questions`
      : `It takes about ${MINUTES_PER_STOP} minutes`;
  const after =
    nudge.toCheckpoint === 1
      ? `Your readiness checkpoint follows it. The checkpoint has ${CHECKPOINT_SIZE} exam-style questions that show where you stand in every domain.`
      : `There are ${nudge.toCheckpoint} short steps between here and your readiness checkpoint, where ${CHECKPOINT_SIZE} exam-style questions show where you stand in every domain.`;
  return {
    subject: `Your next ${examName} step: ${nudge.next.title}`,
    html: layout(
      `
      <h1 style="font-size:18px;margin:0 0 12px;">Continue your study path, ${esc(first)}</h1>
      ${pathStrip(nudge.stretch)}
      <p style="font-size:14px;line-height:1.7;margin:0 0 8px;">
        ${where} Your next step is <strong>${esc(nudge.next.title)}</strong>. ${length}.
      </p>
      <p style="font-size:14px;line-height:1.7;margin:0 0 12px;color:${C.muted};">${after}</p>
      ${button(href, "Go to the next step")}
    `,
      input.unsubscribeUrl
    ),
    text: `Continue your study path, ${first}.\n\n${where} Your next step is ${nudge.next.title}. ${length}.\n${after}\n\nGo to the next step: ${href}\n\nUnsubscribe: ${input.unsubscribeUrl}`,
  };
}

/** A share out of 100 as a bar. Table cells, so every mail client draws it. */
function bar(pct: number, color: string): string {
  const filled = Math.max(0, Math.min(100, Math.round(pct)));
  const td = (w: number, bg: string) =>
    `<td width="${w}%" style="width:${w}%;height:6px;line-height:6px;font-size:0;background:${bg};">&nbsp;</td>`;
  const cells = (filled > 0 ? td(filled, color) : "") + (filled < 100 ? td(100 - filled, C.rule) : "");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr>${cells}</tr></table>`;
}

/** The band a score falls into, in an email's colours. The words and the thresholds are `bandFor`'s. */
const emailBand = (score: number) => {
  const band = bandFor(score);
  return { key: band.key, label: band.label, ...EMAIL_BAND_COLORS[band.key] };
};

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
  const band = emailBand(score);
  const guarantee = `${APP()}${PASS_GUARANTEE_HREF}`;

  // A checkpoint is a dozen questions: a score at the target is a strong first result, never "ready".
  const read =
    band.key === "ready"
      ? `You scored ${score}% on your ${examName} readiness checkpoint, which has ${asked} exam-style questions weighted in the same way as the domains of the real exam. This is a strong first result, but it is not a final measure. The real exam has up to ${REHEARSAL_FORMATS.full.questions} questions, and the rest of your study path and full timed practice exams will confirm it.`
      : `You scored ${score}% on your ${examName} readiness checkpoint, which has ${asked} exam-style questions weighted in the same way as the domains of the real exam. The readiness target is ${READINESS_TARGET}%.`;
  const rows = domains.map((d) => {
    const r = result.domains.find((x) => x.number === d.number);
    return {
      n: d.number.replace(/\.0$/, ""),
      title: d.title,
      tally: r ? `${r.correct} of ${r.total}` : "Not asked",
      pct: r && r.total > 0 ? (r.correct / r.total) * 100 : 0,
    };
  });
  const gain = opportunity
    ? `The area to focus on next is ${opportunity.title}, which accounts for ${opportunity.weight}% of the exam.`
    : "";
  const includes = [
    ...(remaining > 0 ? [`All ${remaining} remaining ${remaining === 1 ? "step" : "steps"} of your ${examName} study path`] : []),
    `Practice across all ${input.questionCount.toLocaleString("en-US")} ${examName} questions`,
    "Timed practice exams, hands-on labs and spaced review",
  ];
  // The price itself is worded once for the whole site (src/lib/pricing/terms.ts):
  // the three plans, the currency and the regional adjustment.
  const terms = "Each plan renews automatically. You can cancel at any time.";

  return {
    subject: `Your ${examName} checkpoint: ${score}%`,
    html: layout(
      `
      <h1 style="font-size:18px;margin:0 0 16px;">Your checkpoint result, ${esc(first)}</h1>
      <div style="padding:0 0 18px;">
        <div style="font-size:13px;color:${C.muted};">${examName} readiness checkpoint</div>
        <div style="font-size:44px;line-height:1.15;font-weight:700;letter-spacing:-0.02em;font-variant-numeric:tabular-nums;color:${C.ink};margin-top:6px;">${score}%</div>
        <div style="font-size:13px;font-weight:600;color:${band.ink};">${band.label}</div>
      </div>
      <p style="font-size:14px;line-height:1.7;margin:0 0 6px;">${read}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 14px;">
        ${rows
          .map(
            (r) => `<tr>
          <td style="padding:10px 0 5px;font-size:13px;"><span style="color:${C.muted};margin-right:6px;">${r.n}</span>${esc(r.title)}</td>
          <td style="padding:10px 0 5px;font-size:12px;text-align:right;color:${C.muted};font-variant-numeric:tabular-nums;white-space:nowrap;">${r.tally}</td>
        </tr>
        <tr><td colspan="2" style="padding:0;">${bar(r.pct, emailBand(r.pct).fill)}</td></tr>`
          )
          .join("")}
      </table>
      ${
        opportunity
          ? `<p style="font-size:14px;line-height:1.7;margin:0;">The area to focus on next is <strong>${esc(opportunity.title)}</strong>, which accounts for ${opportunity.weight}% of the exam.</p>`
          : ""
      }
      <div style="border:1px solid ${C.rule};border-top:3px solid ${C.navy};background:${C.ground};border-radius:0 0 6px 6px;padding:18px;margin:18px 0 0;">
        <div style="font-size:16px;font-weight:700;margin:0 0 4px;">The rest of your ${examName} study path</div>
        <div style="font-size:13px;color:${C.muted};margin:0 0 10px;">CertBench Pro includes:</div>
        <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;line-height:1.6;">
          ${includes
            .map(
              (line) =>
                `<tr><td style="padding:2px 10px 2px 0;vertical-align:top;color:${C.primary};font-weight:700;">&#10003;</td><td style="padding:2px 0;">${esc(line)}</td></tr>`
            )
            .join("")}
        </table>
        <p style="font-size:14px;line-height:1.7;margin:14px 0 0;">${esc(PRO_PRICE_TERMS)}</p>
        <p style="font-size:12px;line-height:1.6;color:${C.muted};margin:2px 0 6px;">${terms}</p>
        ${button(href, "Continue with Pro")}
        <div style="font-size:12px;line-height:1.6;margin:12px 0 0;color:${C.muted};"><span style="color:${C.ink};font-weight:600;">Pass guarantee.</span> ${esc(PASS_GUARANTEE_TERMS)} <a href="${guarantee}" style="color:${C.muted};">Read the terms</a>.</div>
      </div>
    `,
      input.unsubscribeUrl,
      "Your result in each domain, and what the rest of your study path covers."
    ),
    text: [
      `Your checkpoint result, ${first}.`,
      read,
      rows.map((r) => `${r.n} ${r.title}: ${r.tally}`).join("\n"),
      gain,
      `The rest of your ${examName} study path. CertBench Pro includes:\n${includes.map((l) => `- ${l}`).join("\n")}\n${PRO_PRICE_TERMS} ${terms}\nPass guarantee. ${PASS_GUARANTEE_TERMS} Terms: ${guarantee}`,
      `Continue with Pro: ${href}`,
      `Unsubscribe: ${input.unsubscribeUrl}`,
    ]
      .filter(Boolean)
      .join("\n\n"),
  };
}
