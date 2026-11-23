import "server-only";

import { publicEnv, serverEnvOptional } from "@/env";
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
 *
 * Every email names its sender in its footer ("Sent by CertBench.", followed
 * by the postal address once the owner has supplied one) and carries the
 * address that stops these emails, in the footer and at the end of its text
 * part. The welcome email does too: it goes to an address that nobody has
 * confirmed, so the person who reads it may never have asked for an account.
 */

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

const APP = () => publicEnv.NEXT_PUBLIC_APP_URL;

/**
 * Every value that is not written in this file passes through this on its way
 * into email HTML: a name, an exam's name, an objective's title, a figure, a
 * link's address. It covers text between tags and a value inside a quoted
 * attribute. A sentence is built as plain text, which is also what the text
 * part of the email prints, and is escaped where it enters the HTML.
 */
const esc = (value: string | number) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** The longest display name that a greeting uses. */
export const GREETING_NAME_MAX = 40;

/** A control character (a line break and a tab are two of them) or a Unicode line or paragraph separator. */
function hasLineBreak(text: string): boolean {
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (code < 0x20 || (code >= 0x7f && code <= 0x9f) || code === 0x2028 || code === 0x2029) return true;
  }
  return false;
}

/**
 * Whether text holds something that a mail client turns into a link: a scheme
 * ("https://") or a full stop inside a word ("example.com", "www.example").
 */
const hasWebAddress = (plain: string) => plain.includes("://") || /\S\.\S/.test(plain);

/**
 * The first name for a greeting, or null for the greeting without a name.
 *
 * A display name is whatever was typed when the account was created. Sign-up
 * does not bound it, and the welcome email goes to an address that nobody has
 * confirmed, so a name printed as it stands would let a stranger have
 * CertBench send words and a link of their own choosing to any address. A name
 * is therefore used only when it is at most GREETING_NAME_MAX characters long
 * and holds no angle bracket, no line break and no web address. It is read in
 * its plain form (NFKC) for this, so that a full-width letter or full stop
 * counts as the character it stands for. Any other name gets the greeting
 * without a name. Only the first word of a name is ever printed, and no
 * subject line carries a name at all.
 */
export function greetingName(displayName: string | null | undefined): string | null {
  const name = (displayName ?? "").trim();
  // The length is counted in characters, so a name in a script that takes two
  // code units for each character is not counted double. The first test turns
  // a very long value away before it is split into characters.
  if (!name || name.length > GREETING_NAME_MAX * 2 || Array.from(name).length > GREETING_NAME_MAX) return null;
  const plain = name.normalize("NFKC").toLowerCase();
  if (/[<>]/.test(plain) || hasLineBreak(name) || hasWebAddress(plain)) return null;
  return name.split(/\s+/)[0];
}

/** A heading that speaks to someone: their first name after a comma, or the heading alone. */
const addressed = (heading: string, name: string | null) => (name ? `${heading}, ${name}` : heading);

/** The sentence in every footer that names the sender. */
export const SENT_BY = "Sent by CertBench.";

/**
 * The sender's postal address on one line, or null until the owner has
 * supplied one (EMAIL_POSTAL_ADDRESS in src/env.ts). It is printed as it was
 * supplied: a line break becomes a comma, and a full stop at the end is
 * dropped because the footer adds its own.
 */
function postalAddress(): string | null {
  const address = (serverEnvOptional("EMAIL_POSTAL_ADDRESS") ?? "")
    .split(/\r?\n|\\n/)
    .map((line) => line.trim().replace(/,$/, ""))
    .filter(Boolean)
    .join(", ")
    .replace(/\.$/, "");
  return address || null;
}

/** Who sent the email, and the postal address they can be written to once the owner has supplied it. */
export function senderLine(): string {
  const address = postalAddress();
  return address ? `${SENT_BY} Postal address: ${address}.` : SENT_BY;
}

/** The last lines of every text part: who sent the email, and the address that stops these emails. */
const textFooter = (unsubscribeUrl: string) => `${senderLine()}\nUnsubscribe: ${unsubscribeUrl}`;

/**
 * `preheader` is the inbox preview line. Without one, clients preview the
 * first text they find, which is the "CB CertBench" logo.
 */
function layout(bodyHtml: string, unsubscribeUrl: string, preheader?: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:${C.ground};">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>` : ""}
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${C.ink};">
    <div style="margin-bottom:24px;">
      <img src="https://certbench.dev/icon-192.png" width="24" height="24" alt="" style="display:inline-block;vertical-align:middle;border:0;border-radius:5px;" />
      <span style="font-size:16px;font-weight:600;margin-left:8px;">CertBench</span>
    </div>
    <div style="background:${C.paper};border:1px solid ${C.rule};border-radius:8px;padding:28px;">
      ${bodyHtml}
    </div>
    <p style="font-size:12px;color:${C.muted};margin-top:20px;line-height:1.6;">
      ${esc(senderLine())}<br>
      CertBench is an independent study program for CompTIA exams.
      <a href="${esc(unsubscribeUrl)}" style="color:${C.muted};">Unsubscribe from these emails</a>.
    </p>
  </div>
</body>
</html>`;
}

function button(href: string, label: string): string {
  return `<a href="${esc(href)}" style="display:inline-block;background:${C.primary};color:${C.onPrimary};text-decoration:none;border-radius:6px;padding:11px 20px;font-size:14px;font-weight:600;margin-top:8px;">${esc(label)}</a>`;
}

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
  unsubscribeUrl: string;
}): EmailContent {
  const { certName } = input;
  const greeting = addressed("Welcome to CertBench", greetingName(input.displayName));
  return {
    subject: `Your ${certName} study path is saved`,
    html: layout(
      `
      <h1 style="font-size:20px;margin:0 0 12px;">${esc(greeting)}</h1>
      <p style="font-size:14px;line-height:1.7;margin:0 0 12px;">
        Your account is set up for <strong>${esc(certName)}</strong>. This is how CertBench works.
      </p>
      <ol style="font-size:14px;line-height:1.9;margin:0 0 16px;padding-left:20px;">
        <li><strong>Follow your study path.</strong> Every exam objective is a short step, and the steps are in order, so you do not have to decide what to study next.</li>
        <li><strong>Review what you miss.</strong> A question that you answer incorrectly returns in a later step until you answer it correctly.</li>
        <li><strong>Take the readiness checkpoint.</strong> Exam-style questions from every domain show where you stand.</li>
      </ol>
      ${button(`${APP()}/start`, "Continue the study path")}
    `,
      input.unsubscribeUrl
    ),
    text: `${greeting}.\n\nYour account is set up for ${certName}. Follow your study path one short step at a time. A question that you answer incorrectly returns in a later step until you answer it correctly, and the readiness checkpoint shows where you stand.\n\nContinue your study path: ${APP()}/start\n\n${textFooter(input.unsubscribeUrl)}`,
  };
}

const TOOL_INTRO: Record<ToolSource, string> = {
  "port-numbers-quiz": "You have been practicing port numbers on CertBench",
  "subnetting-practice": "You have been practicing subnetting on CertBench",
  "security-plus-acronyms-quiz":
    "You have been practicing Security+ acronyms on CertBench",
};

/**
 * Sent when a visitor to a free tool gives an email address for a study plan.
 * It sets out the plan and leads to the study path. The plan's own points are
 * not called steps: in this product a step is one stop on the study path.
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
        ${esc(intro)}. Drills of that kind cover the facts. The plan below covers the rest of the exam.
      </p>
      <ol style="font-size:14px;line-height:1.9;margin:0 0 16px;padding-left:20px;">
        <li><strong>Choose your exam.</strong> CertBench sets out every objective as a study path of short steps, so you do not have to decide what to study next.</li>
        <li><strong>Complete one step or more each day.</strong> Each step is about ${MINUTES_PER_STOP} minutes of short questions on one objective. A question that you miss returns until you answer it correctly.</li>
        <li><strong>Take the readiness checkpoint.</strong> It has exam-style questions from every domain, weighted in the same way as the real exam.</li>
      </ol>
      <p style="font-size:14px;line-height:1.7;margin:0 0 12px;">
        You do not need an account for your first step.
      </p>
      ${button(`${app}/start`, "Start the study path for my exam")}
    `,
      input.unsubscribeUrl
    ),
    text: `This is your CompTIA study plan.\n\n${intro}. Drills of that kind cover the facts. The plan below covers the rest of the exam.\n1. Choose your exam. Every objective is set out as a study path of short steps.\n2. Complete one step or more each day. Each step takes about ${MINUTES_PER_STOP} minutes, and a question that you miss returns until you answer it correctly.\n3. Take the readiness checkpoint to see where you stand in every domain.\n\nStart the study path (you do not need an account): ${app}/start\n\n${textFooter(input.unsubscribeUrl)}`,
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
  const question = `${addressed("How did your exam go", greetingName(input.displayName))}?`;
  return {
    subject: `How did your ${input.certName} exam go?`,
    html: layout(
      `
      <h1 style="font-size:18px;margin:0 0 12px;">${esc(question)}</h1>
      <p style="font-size:14px;line-height:1.7;margin:0 0 16px;">
        The date of your ${esc(input.certName)} exam has passed, and we hope that it went well.
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
    text: `How did your ${input.certName} exam go?\n\nIf you passed, please tell us: ${input.passHref}\nIf you did not pass this time, CertBench can help you prepare for a retake: ${input.failHref}\n\n${textFooter(input.unsubscribeUrl)}`,
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
  const heading = addressed(countdownHeading(days), greetingName(input.displayName));
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
          : `With ${days} days remaining, a few steps each day make a real difference. Each step takes about ${MINUTES_PER_STOP} minutes.`;
  const label = standing.done === 0 ? "Start the study path" : "Continue the study path";
  return {
    subject: countdownSubject(days, examName),
    html: layout(
      `
      <h1 style="font-size:18px;margin:0 0 12px;">${esc(heading)}</h1>
      <p style="font-size:14px;line-height:1.7;margin:0 0 8px;">${esc(where)}</p>
      <p style="font-size:14px;line-height:1.7;margin:0 0 12px;">${esc(advice)}</p>
      ${button(href, label)}
    `,
      input.unsubscribeUrl
    ),
    text: `${heading}.\n\n${where}\n${advice}\n\n${label}: ${href}\n\n${textFooter(input.unsubscribeUrl)}`,
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
  const name = greetingName(input.displayName);

  if (nudge.next.kind === "checkpoint") {
    const heading = addressed("Your readiness checkpoint is next", name);
    const what = `You have completed ${stopCount(nudge.done)} of your ${examName} study path. Your next step is the readiness checkpoint. It has ${CHECKPOINT_SIZE} exam-style questions from every domain, weighted in the same way as the real exam.`;
    const then =
      "When you finish, you will see a first measure of your readiness, your result in each domain, and the date by which you would finish the rest of your study path.";
    return {
      subject: `Your ${examName} readiness checkpoint is next`,
      html: layout(
        `
        <h1 style="font-size:18px;margin:0 0 12px;">${esc(heading)}</h1>
        ${pathStrip(nudge.stretch)}
        <p style="font-size:14px;line-height:1.7;margin:0 0 8px;">${esc(what)}</p>
        <p style="font-size:14px;line-height:1.7;margin:0 0 12px;color:${C.muted};">${esc(then)}</p>
        ${button(href, "Take the checkpoint")}
      `,
        input.unsubscribeUrl
      ),
      text: `${heading}.\n\n${what}\n${then}\n\nTake the checkpoint: ${href}\n\n${textFooter(input.unsubscribeUrl)}`,
    };
  }

  const heading = addressed("Continue your study path", name);
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
      <h1 style="font-size:18px;margin:0 0 12px;">${esc(heading)}</h1>
      ${pathStrip(nudge.stretch)}
      <p style="font-size:14px;line-height:1.7;margin:0 0 8px;">
        ${esc(where)} Your next step is <strong>${esc(nudge.next.title)}</strong>. ${esc(length)}.
      </p>
      <p style="font-size:14px;line-height:1.7;margin:0 0 12px;color:${C.muted};">${esc(after)}</p>
      ${button(href, "Go to the next step")}
    `,
      input.unsubscribeUrl
    ),
    text: `${heading}.\n\n${where} Your next step is ${nudge.next.title}. ${length}.\n${after}\n\nGo to the next step: ${href}\n\n${textFooter(input.unsubscribeUrl)}`,
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
  const heading = addressed("Your checkpoint result", greetingName(input.displayName));
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
      <h1 style="font-size:18px;margin:0 0 16px;">${esc(heading)}</h1>
      <div style="padding:0 0 18px;">
        <div style="font-size:13px;color:${C.muted};">${esc(examName)} readiness checkpoint</div>
        <div style="font-size:44px;line-height:1.15;font-weight:700;letter-spacing:-0.02em;font-variant-numeric:tabular-nums;color:${C.ink};margin-top:6px;">${esc(score)}%</div>
        <div style="font-size:13px;font-weight:600;color:${band.ink};">${esc(band.label)}</div>
      </div>
      <p style="font-size:14px;line-height:1.7;margin:0 0 6px;">${esc(read)}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 14px;">
        ${rows
          .map(
            (r) => `<tr>
          <td style="padding:10px 0 5px;font-size:13px;"><span style="color:${C.muted};margin-right:6px;">${esc(r.n)}</span>${esc(r.title)}</td>
          <td style="padding:10px 0 5px;font-size:12px;text-align:right;color:${C.muted};font-variant-numeric:tabular-nums;white-space:nowrap;">${esc(r.tally)}</td>
        </tr>
        <tr><td colspan="2" style="padding:0;">${bar(r.pct, emailBand(r.pct).fill)}</td></tr>`
          )
          .join("")}
      </table>
      ${
        opportunity
          ? `<p style="font-size:14px;line-height:1.7;margin:0;">The area to focus on next is <strong>${esc(opportunity.title)}</strong>, which accounts for ${esc(opportunity.weight)}% of the exam.</p>`
          : ""
      }
      <div style="border:1px solid ${C.rule};border-top:3px solid ${C.navy};background:${C.ground};border-radius:0 0 6px 6px;padding:18px;margin:18px 0 0;">
        <div style="font-size:16px;font-weight:700;margin:0 0 4px;">The rest of your ${esc(examName)} study path</div>
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
        <p style="font-size:12px;line-height:1.6;color:${C.muted};margin:2px 0 6px;">${esc(terms)}</p>
        ${button(href, "Continue with Pro")}
        <div style="font-size:12px;line-height:1.6;margin:12px 0 0;color:${C.muted};"><span style="color:${C.ink};font-weight:600;">Pass guarantee.</span> ${esc(PASS_GUARANTEE_TERMS)} <a href="${esc(guarantee)}" style="color:${C.muted};">Read the terms</a>.</div>
      </div>
    `,
      input.unsubscribeUrl,
      "Your result in each domain, and what the rest of your study path covers."
    ),
    text: [
      `${heading}.`,
      read,
      rows.map((r) => `${r.n} ${r.title}: ${r.tally}`).join("\n"),
      gain,
      `The rest of your ${examName} study path. CertBench Pro includes:\n${includes.map((l) => `- ${l}`).join("\n")}\n${PRO_PRICE_TERMS} ${terms}\nPass guarantee. ${PASS_GUARANTEE_TERMS} Terms: ${guarantee}`,
      `Continue with Pro: ${href}`,
      textFooter(input.unsubscribeUrl),
    ]
      .filter(Boolean)
      .join("\n\n"),
  };
}
