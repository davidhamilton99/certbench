import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

/** The optional settings a deployment has. The postal address is the owner's to supply. */
const settings = vi.hoisted(() => ({ EMAIL_POSTAL_ADDRESS: undefined as string | undefined }));

vi.mock("@/env", () => ({
  publicEnv: { NEXT_PUBLIC_APP_URL: "https://certbench.dev" },
  serverEnvOptional: (key: string) => (key === "EMAIL_POSTAL_ADDRESS" ? settings.EMAIL_POSTAL_ADDRESS : undefined),
}));

import {
  CONTACT,
  SENT_BY,
  checkpointResultEmail,
  pathCountdownEmail,
  pathEmailLink,
  pathNudgeEmail,
  postExamEmail,
  senderLine,
  studyPlanEmail,
  welcomeEmail,
  type EmailContent,
} from "../templates";
import { EMAIL_BAND_COLORS, EMAIL_COLORS } from "../colors";
import type { CheckpointFollowUp } from "@/core/path/follow-up";
import type { PathNudge } from "@/core/path/nudge";
import { MINUTES_PER_STOP } from "@/core/path/plan";
import type { PathDomain } from "@/core/path/types";
import { SUPPORT_EMAIL } from "@/lib/errors/user-message";
import { OG } from "@/lib/og/mark";
import { PRO_PRICE_TERMS } from "@/lib/pricing/terms";
import { bandFor } from "@/lib/readiness/band";

/** The first words of every footer and of the last lines of every text part: who sent the email, and where to write to them. */
const SENDER = "Sent by CertBench. To contact CertBench, write to support@certbench.dev.";

const base = {
  examName: "Security+",
  href: "https://certbench.dev/login?next=%2Fpath%2Fsecurity-plus-sy0-701",
  unsubscribeUrl: "https://certbench.dev/api/email/unsubscribe?token=t",
};

/** Warm-up, four learn stops, the checkpoint: the first `done` played. */
const stretch = (done: number): PathNudge["stretch"] =>
  (["warmup", "learn", "learn", "learn", "learn", "checkpoint"] as const).map((kind, i) => ({
    kind,
    done: i < done,
  }));

const nudge = (over: Partial<PathNudge> = {}): PathNudge => ({
  done: 3,
  total: 35,
  freeLeft: 3,
  next: { title: "Change management", kind: "learn" },
  toCheckpoint: 2,
  stretch: stretch(over.done ?? 3),
  ...over,
});

const domains: PathDomain[] = [
  { number: "1.0", title: "Networking Concepts", weight: 23, objectives: [] },
  { number: "2.0", title: "Network Implementation", weight: 20, objectives: [] },
  { number: "3.0", title: "Network Operations", weight: 19, objectives: [] },
];

const followUp = (score: number, over: Partial<CheckpointFollowUp> = {}): CheckpointFollowUp => ({
  result: {
    score,
    at: 0,
    domains: [
      { number: "1.0", correct: 3, total: 3 },
      { number: "2.0", correct: 2, total: 3 },
    ],
  },
  remaining: 28,
  opportunity: domains[1],
  ...over,
});

const checkpoint = (f: CheckpointFollowUp, freeLabs = 12) =>
  checkpointResultEmail({ ...base, examName: "Network+", domains, followUp: f, questionCount: 617, freeLabs });

const welcome = (certName = "CompTIA Security+") => welcomeEmail({ certName, unsubscribeUrl: base.unsubscribeUrl });

const postExam = () =>
  postExamEmail({
    certName: "CompTIA Security+",
    unsubscribeUrl: base.unsubscribeUrl,
    passHref: "https://certbench.dev/story?t=x&r=pass",
    failHref: "https://certbench.dev/story?t=x&r=fail",
  });

afterEach(() => {
  settings.EMAIL_POSTAL_ADDRESS = undefined;
});

/** One of every email CertBench sends, with every band and every state of the path strip in them. */
const everyEmail = () => [
  welcome(),
  studyPlanEmail({ source: "port-numbers-quiz", unsubscribeUrl: base.unsubscribeUrl }),
  postExam(),
  pathCountdownEmail({ ...base, daysUntilExam: 7, examDate: "2026-11-09", standing: { done: 3, total: 35, freeLeft: 3 }, pro: false, freeLabs: 12 }),
  pathNudgeEmail({ ...base, nudge: nudge() }),
  pathNudgeEmail({
    ...base,
    nudge: nudge({ done: 5, freeLeft: 1, toCheckpoint: 0, next: { title: "Readiness checkpoint", kind: "checkpoint" } }),
  }),
  checkpoint(followUp(20)),
  checkpoint(followUp(60)),
  checkpoint(followUp(90)),
];

describe("pathEmailLink", () => {
  it("goes through sign-in to the path, tagged for analytics", () => {
    const url = new URL(pathEmailLink("security-plus-sy0-701", "path_nudge"));
    expect(`${url.origin}${url.pathname}`).toBe("https://certbench.dev/login");
    expect(url.searchParams.get("next")).toBe(
      "/path/security-plus-sy0-701?utm_source=email&utm_medium=lifecycle&utm_campaign=path_nudge"
    );
  });
});

describe("the look of every email", () => {
  it("takes the brand's colours from the one hex table the generated images use", () => {
    expect(EMAIL_COLORS).toMatchObject({
      paper: OG.paper,
      ink: OG.ink,
      muted: OG.muted,
      rule: OG.rule,
      navy: OG.sheet,
      primary: OG.primary,
    });
  });

  // The emails had drifted from the site: an earlier palette for text and
  // ground, and a different blue. A colour typed into a template would drift again.
  it("uses no colour outside the site's own, in any email", () => {
    const allowed = new Set<string>([
      ...Object.values(EMAIL_COLORS),
      ...Object.values(EMAIL_BAND_COLORS).flatMap((band) => [band.fill, band.ink]),
    ]);
    for (const email of everyEmail()) {
      const used = email.html.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g) ?? [];
      expect(used.length).toBeGreaterThan(0);
      expect(used.filter((hex) => !allowed.has(hex))).toEqual([]);
    }
  });

  it("has no colour typed into the templates themselves", () => {
    const source = readFileSync(join(process.cwd(), "src/server/email/templates.ts"), "utf8");
    expect(source.match(/#[0-9a-fA-F]{6}\b/g)).toBeNull();
  });

  it("sets the email on a sheet of paper on the desk-coloured ground, in the ink and rule of the site", () => {
    const { html } = welcome();
    expect(html).toContain(`<body style="margin:0;padding:0;background:${EMAIL_COLORS.ground};">`);
    expect(html).toContain(`background:${EMAIL_COLORS.paper};border:1px solid ${EMAIL_COLORS.rule};`);
    expect(html).toContain(`color:${EMAIL_COLORS.ink};`);
    expect(html).toContain(`background:${EMAIL_COLORS.primary};color:${EMAIL_COLORS.onPrimary};`);
  });

  it("keeps a system font stack that every mail client has, and states the language", () => {
    for (const email of everyEmail()) {
      expect(email.html).toContain(
        "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;"
      );
      expect(email.html).toContain('<html lang="en">');
    }
  });

  it("draws the offer under a rule in the header's navy", () => {
    expect(checkpoint(followUp(74)).html).toContain(`border-top:3px solid ${EMAIL_COLORS.navy};`);
  });
});

describe("welcomeEmail", () => {
  it("says the study path is saved, how CertBench works, and where to continue", () => {
    const email = welcome();
    expect(email.subject).toBe("Your CompTIA Security+ study path is saved");
    expect(email.text).toMatch(/^Welcome to CertBench\.\n\n/);
    expect(email.text).toContain("Continue your study path: https://certbench.dev/start");
    expect(email.html).toContain('href="https://certbench.dev/start"');
  });

  // The email is sent for every exam. The Security+ and A+ steps follow CompTIA's
  // objectives and the Network+ steps follow CertBench's own topics, so the
  // email does not say that every exam objective is a step.
  it("says of the study path what is true of every exam: it works through the exam topic by topic", () => {
    const email = welcome("CompTIA Network+");
    expect(email.html).toContain(
      "<strong>Follow your study path.</strong> It works through your exam topic by topic, in short steps, and the steps are in order, so you do not have to decide what to study next."
    );
    for (const sent of everyEmail()) expect(sent.html + sent.text).not.toMatch(/every (?:exam )?objective/i);
  });

  // It used to carry no unsubscribe link, as a transactional email. It goes to
  // an address that nobody has confirmed, so the person who reads it may never
  // have asked for an account: it now carries the link as every other email does.
  it("carries the unsubscribe address, in its footer and at the end of its text part", () => {
    const email = welcome();
    expect(email.html).toContain(`<a href="${base.unsubscribeUrl}" style="color:${EMAIL_COLORS.muted};">Unsubscribe from these emails</a>.`);
    expect(email.text.endsWith(`\n\n${SENDER}\nUnsubscribe: ${base.unsubscribeUrl}`)).toBe(true);
  });
});

describe("the footer of every email", () => {
  const ADDRESS = "1 Example Street, Example Town, EX 00000, Canada";

  // The footer named the sender and gave no way to reach it. It now gives the
  // support address that the site itself publishes, in both parts of every email.
  it("names the sender, gives the address at which the sender can be reached, says what CertBench is, and has the unsubscribe link", () => {
    expect(SENT_BY).toBe("Sent by CertBench.");
    expect(SUPPORT_EMAIL).toBe("support@certbench.dev");
    expect(CONTACT).toBe(`To contact CertBench, write to ${SUPPORT_EMAIL}.`);
    const emails = everyEmail();
    expect(emails).toHaveLength(9);
    for (const email of emails) {
      expect(email.html).toMatch(
        /<p style="font-size:12px;[^"]*">\s*Sent by CertBench\. To contact CertBench, write to <a href="mailto:support@certbench\.dev" style="[^"]*">support@certbench\.dev<\/a>\.<br>\s*CertBench is an independent study program for CompTIA exams\.\s*<a href="https:\/\/certbench\.dev\/api\/email\/unsubscribe\?token=t" style="[^"]*">Unsubscribe from these emails<\/a>\.\s*<\/p>/
      );
      expect(email.text.endsWith(`\n\n${SENDER}\nUnsubscribe: ${base.unsubscribeUrl}`)).toBe(true);
      // Once in each part. In the HTML the address is a link, in the footer's own colour, so that one press starts a message.
      expect(email.text.split(SUPPORT_EMAIL)).toHaveLength(2);
      expect(email.html.split(`<a href="mailto:${SUPPORT_EMAIL}" style="color:${EMAIL_COLORS.muted};">${SUPPORT_EMAIL}</a>`)).toHaveLength(2);
    }
  });

  it("takes the support address from the one place the site keeps it", () => {
    const source = readFileSync(join(process.cwd(), "src/server/email/templates.ts"), "utf8");
    expect(source).not.toContain("support@");
    expect(source).toContain('import { SUPPORT_EMAIL } from "@/lib/errors/user-message";');
  });

  // The address is the owner's to supply. Until it is set, no email prints one.
  it("prints no postal address until the owner has supplied one", () => {
    expect(senderLine()).toBe(SENDER);
    for (const blank of ["", "   ", "\n"]) {
      settings.EMAIL_POSTAL_ADDRESS = blank;
      expect(senderLine()).toBe(SENDER);
    }
    for (const email of everyEmail()) expect(email.html + email.text).not.toContain("Postal address");
  });

  it("prints the postal address after the sender's name and address in every email, once it is set", () => {
    settings.EMAIL_POSTAL_ADDRESS = ADDRESS;
    const line = `${SENDER} Postal address: ${ADDRESS}.`;
    expect(senderLine()).toBe(line);
    const emails = everyEmail();
    expect(emails).toHaveLength(9);
    for (const email of emails) {
      expect(email.html).toContain(`${SUPPORT_EMAIL}</a>. Postal address: ${ADDRESS}.<br>`);
      expect(email.text.endsWith(`\n\n${line}\nUnsubscribe: ${base.unsubscribeUrl}`)).toBe(true);
    }
  });

  it("sets an address that was supplied on several lines, or with a full stop, as one sentence", () => {
    settings.EMAIL_POSTAL_ADDRESS = " 1 Example Street,\r\nExample Town\n\nEX 00000, Canada. ";
    expect(senderLine()).toBe(`${SENDER} Postal address: 1 Example Street, Example Town, EX 00000, Canada.`);
    // A setting typed with the two characters of an escaped line break reads the same.
    settings.EMAIL_POSTAL_ADDRESS = ["1 Example Street", "Example Town", "EX 00000, Canada"].join(String.fromCharCode(92) + "n");
    expect(senderLine()).toBe(`${SENDER} Postal address: 1 Example Street, Example Town, EX 00000, Canada.`);
  });

  it("escapes the postal address in the HTML", () => {
    settings.EMAIL_POSTAL_ADDRESS = `1 <b>Example</b> Street & "Suite" 2`;
    const email = welcome();
    expect(email.html).toContain("Postal address: 1 &lt;b&gt;Example&lt;/b&gt; Street &amp; &quot;Suite&quot; 2.<br>");
    expect(email.html).not.toContain("<b>Example</b>");
  });
});

describe("studyPlanEmail", () => {
  it("names the tool the request came from, and carries the unsubscribe address", () => {
    const address = "https://certbench.dev/api/email/unsubscribe?token=t&scope=lead";
    const email = studyPlanEmail({ source: "subnetting-practice", unsubscribeUrl: address });
    expect(email.subject).toBe("Your CompTIA study plan");
    expect(email.text).toContain("You have been practicing subnetting on CertBench.");
    expect(email.text).toContain("Start the study path (you do not need an account): https://certbench.dev/start");
    expect(email.text).toContain(`Unsubscribe: ${address}`);
    expect(email.html).toContain(`href="${address.replace(/&/g, "&amp;")}"`);
  });

  // The plan is sent from the port quiz and the subnetting drill, to people who
  // may be studying for any exam, so it says what is true of every exam.
  it("says that the study path works through the exam topic by topic, in both parts", () => {
    const email = studyPlanEmail({ source: "subnetting-practice", unsubscribeUrl: base.unsubscribeUrl });
    expect(email.html).toContain(
      "<strong>Choose your exam.</strong> Its study path works through the exam topic by topic, in short steps, so you do not have to decide what to study next."
    );
    expect(email.text).toContain(
      "\n1. Choose your exam. Its study path works through the exam topic by topic, in short steps.\n2. Complete one step or more each day."
    );
    expect(email.html + email.text).not.toMatch(/every (?:exam )?objective/i);
  });

  // The email said "about three minutes", typed by hand, while every page
  // states the product's own figure (MINUTES_PER_STOP).
  it("states the length of a step from the product's own figure", () => {
    const email = studyPlanEmail({ source: "port-numbers-quiz", unsubscribeUrl: base.unsubscribeUrl });
    // "On one objective" was said for every exam, while the Network+ steps follow CertBench's own topics.
    expect(email.html).toContain(`Each step is about ${MINUTES_PER_STOP} minutes of short questions on one topic.`);
    expect(email.html + email.text).not.toMatch(/objective/i);
    expect(email.text).toContain(
      `Each step takes about ${MINUTES_PER_STOP} minutes, and a question that you miss returns until you answer it correctly.`
    );
    expect(email.html + email.text).not.toMatch(/three minutes/i);
  });

  // "These three steps" counted the list by hand, and used the word that the
  // product keeps for one stop on the study path, two lines above "one step or
  // more each day".
  it("introduces its list as the plan, and keeps the word step for the study path", () => {
    const email = studyPlanEmail({ source: "port-numbers-quiz", unsubscribeUrl: base.unsubscribeUrl });
    const intro = "You have been practicing port numbers on CertBench. Drills of that kind cover the facts. The plan below covers the rest of the exam.";
    expect(email.html.replace(/\s+/g, " ")).toContain(intro);
    expect(email.text).toContain(`${intro}\n1. Choose your exam.`);
    expect(email.html + email.text).not.toContain("three steps");
  });

  // A length of time or a number of questions belongs to the product
  // (src/core/path/plan.ts) or to the run that sends the email, never to a sentence.
  it("has no number of minutes, days, weeks or questions typed into the templates themselves", () => {
    const source = readFileSync(join(process.cwd(), "src/server/email/templates.ts"), "utf8");
    expect(
      source.match(
        /\b(?:one|two|three|four|five|six|seven|eight|nine|ten|\d+) (?:exam-style )?(?:minutes?|hours?|days?|weeks?|questions?)\b/gi
      )
    ).toBeNull();
  });
});

describe("postExamEmail", () => {
  it("asks for the result with one button, and offers help with a retake", () => {
    const email = postExam();
    expect(email.subject).toBe("How did your CompTIA Security+ exam go?");
    expect(email.html).toContain("I passed the exam");
    expect(email.html).toContain('href="https://certbench.dev/story?t=x&amp;r=fail"');
    expect(email.text).toContain(
      "If you did not pass this time, CertBench can help you prepare for a retake: https://certbench.dev/story?t=x&r=fail"
    );
    expect(email.html).toContain(base.unsubscribeUrl);
  });
});

describe("pathNudgeEmail", () => {
  it("names the next step, how long it takes, and how close the checkpoint is", () => {
    const email = pathNudgeEmail({ ...base, nudge: nudge() });
    expect(email.subject).toBe("Your next Security+ step: Change management");
    expect(email.text).toContain(
      "You have completed 3 steps of your Security+ study path. Your next step is Change management. It takes about 4 minutes."
    );
    expect(email.text).toContain("There are 2 short steps between here and your readiness checkpoint");
    expect(email.html).toContain("Go to the next step");
    expect(email.html).toContain(base.href);
    expect(email.html).toContain(base.unsubscribeUrl);
  });

  it("draws the free stretch: played stops checked, the next one numbered, the checkpoint flagged", () => {
    const { html } = pathNudgeEmail({ ...base, nudge: nudge() });
    const ink = EMAIL_COLORS.primary;
    expect(html.match(/&#10003;/g)).toHaveLength(3);
    expect(html).toMatch(new RegExp(`border:2px solid ${ink};[^"]*color:${ink};[^>]*>4<`));
    expect(html.match(/&#9873;/g)).toHaveLength(1);
  });

  // Green, amber and red are for marks on answers and for scores. The strip is progress, not a score.
  it("draws the stretch in the pressable ink and the rule, with no score colour", () => {
    const { html } = pathNudgeEmail({ ...base, nudge: nudge() });
    for (const band of Object.values(EMAIL_BAND_COLORS)) {
      if (band.fill === EMAIL_COLORS.primary) continue;
      expect(html).not.toContain(band.fill);
      expect(html).not.toContain(band.ink);
    }
  });

  it("says when the checkpoint comes right after this step", () => {
    const email = pathNudgeEmail({ ...base, nudge: nudge({ toCheckpoint: 1 }) });
    expect(email.text).toContain("Your readiness checkpoint follows it.");
  });

  it("leads with the checkpoint when it is next", () => {
    const email = pathNudgeEmail({
      ...base,
      nudge: nudge({ done: 5, freeLeft: 1, toCheckpoint: 0, next: { title: "Readiness checkpoint", kind: "checkpoint" } }),
    });
    expect(email.subject).toBe("Your Security+ readiness checkpoint is next");
    expect(email.text).toContain("You have completed 5 steps of your Security+ study path.");
    expect(email.text).toContain("It has 12 exam-style questions from every domain");
    expect(email.html).toContain("Take the checkpoint");
  });

  it("sizes a practice step in questions, not minutes", () => {
    const email = pathNudgeEmail({
      ...base,
      nudge: nudge({ next: { title: "Domain 1 practice", kind: "practice" } }),
    });
    expect(email.text).toContain("Your next step is Domain 1 practice. It has 10 exam-style questions.");
  });

  it("does not count stops before any are done", () => {
    const email = pathNudgeEmail({
      ...base,
      nudge: nudge({ done: 0, next: { title: "Introductory questions", kind: "warmup" }, toCheckpoint: 5 }),
    });
    expect(email.text).toContain("You have started your Security+ study path. Your next step is Introductory questions");
  });

  it("escapes a step's title in the HTML", () => {
    const email = pathNudgeEmail({ ...base, nudge: nudge({ next: { title: "Ports & protocols", kind: "learn" } }) });
    expect(email.html).toContain(">Continue your study path</h1>");
    expect(email.html).toContain("Ports &amp; protocols");
    expect(email.text).toContain("Your next step is Ports & protocols.");
  });
});

describe("pathCountdownEmail", () => {
  /** A countdown sent on November 23, 2026, for an exam `days` later. */
  const countdown = (days: number, standing: { done: number; total: number; freeLeft: number }, pro = false, freeLabs = 12) =>
    pathCountdownEmail({
      ...base,
      daysUntilExam: days,
      examDate: new Date(Date.UTC(2026, 10, 23 + days)).toISOString().slice(0, 10),
      standing,
      pro,
      freeLabs,
    });

  it("shows where they are on the path and links back to it", () => {
    const email = countdown(7, { done: 3, total: 35, freeLeft: 3 });
    expect(email.subject).toBe("7 days until your Security+ exam");
    expect(email.text).toContain("You have completed 3 of the 35 steps in your Security+ study path.");
    expect(email.text).toContain(`Continue the study path: ${base.href}`);
    expect(email.html).not.toContain("/dashboard");
    expect(email.text).not.toContain("Readiness");
  });

  // "35 steps of about 4 minutes each" counted the practice exam, the domain
  // practice and the labs as steps of a few minutes: the number stands alone.
  it("invites a first step when they have not played one, and counts the steps without a length", () => {
    const email = countdown(14, { done: 0, total: 35, freeLeft: 6 });
    expect(email.text).toContain("Your Security+ study path is ready. It has 35 steps.\n");
    expect(email.html + email.text).not.toContain("minutes each");
    expect(email.html).toContain("Start the study path");
  });

  // The advice used to follow the day alone.
  it("does not tell an account that has not begun, the day before its exam, that it has done the work", () => {
    const email = countdown(1, { done: 0, total: 35, freeLeft: 3 });
    expect(email.text).toContain("Your Security+ study path is ready. It has 35 steps.\nRest well before your exam.\n");
    expect(email.html + email.text).not.toContain("done the work");
    expect(countdown(1, { done: 4, total: 35, freeLeft: 0 }, true).text).toContain("Rest well: you have done the work.");
  });

  it("advises no more steps to an account that has completed every one", () => {
    for (const days of [14, 7, 3]) {
      const email = countdown(days, { done: 35, total: 35, freeLeft: 0 }, true);
      expect(email.text).toContain(
        "You have completed every step of your Security+ study path.\nA review on your study path each day will keep the material fresh until your exam.\n"
      );
      expect(email.html + email.text).not.toMatch(/few steps/);
    }
  });

  // "With two weeks remaining" was typed by hand for every countdown of more
  // than seven days. The sentence now states the days that the run counted.
  it("states the days that remain from the run's own count", () => {
    const fortnight = countdown(14, { done: 3, total: 35, freeLeft: 3 });
    expect(fortnight.subject).toBe("14 days until your Security+ exam");
    expect(fortnight.text).toContain(
      `With 14 days remaining, a few steps each day make a real difference. Each step takes about ${MINUTES_PER_STOP} minutes.`
    );
    expect(countdown(10, { done: 3, total: 35, freeLeft: 3 }).text).toContain("With 10 days remaining,");
    expect(fortnight.html + fortnight.text).not.toContain("two weeks");
    expect(countdown(7, { done: 3, total: 35, freeLeft: 3 }).text).toContain(
      `This week, complete a few steps every day. Each step takes about ${MINUTES_PER_STOP} minutes.`
    );
  });

  // "You have completed every free step" told an account without Pro that
  // nothing free was left, while one practice exam and the free labs are open
  // to it. The email now says what is still free, from the exam's own figure.
  it("tells an account without Pro that has completed its free steps what is still free", () => {
    const email = countdown(3, { done: 6, total: 35, freeLeft: 0 });
    expect(email.text).toContain(
      "You have completed 6 steps of your Security+ study path, including the readiness checkpoint. The remaining 29 steps are included with Pro. One practice exam is free, and so are 12 hands-on labs."
    );
    expect(email.html).toContain("One practice exam is free, and so are 12 hands-on labs.");
    expect(email.html + email.text).not.toContain("every free step");
    expect(countdown(3, { done: 34, total: 35, freeLeft: 0 }).text).toContain(
      "The remaining step is included with Pro. One practice exam is free, and so are 12 hands-on labs."
    );
  });

  it("names no free lab for an exam that has none, and counts one lab as one", () => {
    const none = countdown(3, { done: 3, total: 35, freeLeft: 0 }, false, 0);
    expect(none.text).toContain("The remaining 32 steps are included with Pro. One practice exam is free.");
    expect(none.html + none.text).not.toMatch(/free hands-on lab|hands-on labs? (?:is|are) free|so (?:is|are) \d/);
    expect(countdown(3, { done: 3, total: 35, freeLeft: 0 }, false, 1).text).toContain(
      "One practice exam is free, and so is one hands-on lab."
    );
  });

  it("counts the whole path for Pro, with no talk of free steps", () => {
    const email = countdown(3, { done: 6, total: 35, freeLeft: 0 }, true);
    expect(email.text).toContain("You have completed 6 of the 35 steps in your Security+ study path.");
    expect(email.text).not.toContain("free step");
    expect(email.text).toContain(`Continue the study path: ${base.href}`);
  });

  it("says so when every step is played", () => {
    const email = countdown(7, { done: 35, total: 35, freeLeft: 0 }, true);
    expect(email.text).toContain("You have completed every step of your Security+ study path.");
  });

  // The job runs on the UTC calendar and an account has no time zone: in
  // eastern Australia "Your exam is tomorrow" arrived on the day of the exam.
  it("names the date of the exam the day before it, and never says tomorrow or tonight", () => {
    const email = countdown(1, { done: 12, total: 35, freeLeft: 0 }, true);
    expect(email.subject).toBe("Your Security+ exam is on November 24, 2026");
    expect(email.html).toContain(">Your exam is on November 24, 2026</h1>");
    expect(email.text).toMatch(/^Your exam is on November 24, 2026\.\n/);
    expect(email.text).toContain("Do not study late on the night before your exam. Rest well: you have done the work.");
    for (const standing of [
      { done: 0, total: 35, freeLeft: 3 },
      { done: 3, total: 35, freeLeft: 0 },
      { done: 35, total: 35, freeLeft: 0 },
    ]) {
      const sent = countdown(1, standing);
      expect(sent.subject + sent.html + sent.text).not.toMatch(/tomorrow|tonight/i);
    }
  });
});

describe("checkpointResultEmail", () => {
  it("leads with the score and how each domain went", () => {
    const e = checkpoint(followUp(74));
    expect(e.subject).toBe("Your Network+ checkpoint: 74%");
    expect(e.html).toContain("74%");
    expect(e.html).toContain("Approaching target");
    expect(e.text).toContain(
      "You scored 74% on your Network+ readiness checkpoint, which has 6 exam-style questions weighted in the same way as the domains of the real exam. The readiness target is 75%."
    );
    expect(e.text).toContain(
      "1 Networking Concepts: 3 of 3\n2 Network Implementation: 2 of 3\n3 Network Operations: Not asked"
    );
    expect(e.text).toContain(
      "The area to focus on next is Network Implementation, which accounts for 20% of the exam."
    );
  });

  // The same score used to be described three ways on three surfaces. The
  // email now asks the one function that every page asks.
  it.each([
    [39, "Below target"],
    [40, "Approaching target"],
    [74, "Approaching target"],
    [75, "Target met"],
  ])("describes %i%% in the site's own words for its band: %s", (score, label) => {
    const band = bandFor(score);
    expect(band.label).toBe(label);
    const { html } = checkpoint(followUp(score));
    // The label under the score, in the band's own ink.
    expect(html).toContain(`color:${EMAIL_BAND_COLORS[band.key].ink};">${label}</div>`);
    for (const retired of ["Strong first result", "Strong start", "Getting close", "Your starting point"]) {
      expect(html).not.toContain(retired);
    }
  });

  it("draws each domain's bar in the colour of that domain's own band", () => {
    const { html } = checkpoint(followUp(74));
    // 3 of 3 is at the target; 2 of 3 (67%) is approaching it.
    expect(html).toContain(`width:100%;height:6px;line-height:6px;font-size:0;background:${EMAIL_BAND_COLORS.ready.fill};`);
    expect(html).toContain(`width:67%;height:6px;line-height:6px;font-size:0;background:${EMAIL_BAND_COLORS.close.fill};`);
  });

  it("says what the rest of the path holds and what it costs, plainly", () => {
    const e = checkpoint(followUp(74));
    expect(e.text).toContain("- All 28 remaining steps of your Network+ study path");
    // What Pro adds, in the words of the pricing page, and then what is free.
    // The list used to name practice exams and hands-on labs as Pro's alone.
    expect(e.text).toContain(
      "CertBench Pro includes:\n- All 28 remaining steps of your Network+ study path\n- Every hands-on lab\n- New timed practice exams of 90 questions, scored by domain\n- All 617 Network+ questions, with review of the questions you answered incorrectly\nWithout Pro, one practice exam is free, and so are 12 hands-on labs.\n"
    );
    expect(e.html).toContain(">Every hands-on lab</td>");
    expect(e.html).toContain(">Without Pro, one practice exam is free, and so are 12 hands-on labs.</p>");
    expect(e.html + e.text).not.toContain("Timed practice exams, hands-on labs and spaced review");
    // The price is worded once for the whole site: every plan, the currency and
    // the regional adjustment. The email used to leave out the annual plan.
    expect(e.text).toContain(`${PRO_PRICE_TERMS} Each plan renews automatically. You can cancel at any time.`);
    expect(e.html).toContain(PRO_PRICE_TERMS);
    expect(e.html).toContain("Each plan renews automatically. You can cancel at any time.");
    expect(e.html + e.text).not.toContain("for three months");
    expect(e.html + e.text).not.toContain("Both plans");
    // The guarantee always comes with its conditions, never as a bare promise.
    expect(e.text).toContain(
      "Pass guarantee. If you study with Pro for 30 days or more and do not pass your exam, CertBench refunds your last payment. Terms: https://certbench.dev/terms#pass-guarantee"
    );
    expect(e.html).toContain(
      "If you study with Pro for 30 days or more and do not pass your exam, CertBench refunds your last payment."
    );
    expect(e.text).toContain(`Continue with Pro: ${base.href}`);
    expect(e.html).toContain(`href="${base.href}"`);
    expect(e.html).toContain(base.unsubscribeUrl);
  });

  // The price names the yearly plan, and the button leads to the study path's
  // offer, which sells the monthly and the three-month plans only.
  it("says where every plan in the price can be chosen, with a link to the pricing page", () => {
    const e = checkpoint(followUp(74));
    const pricing = "https://certbench.dev/pricing?utm_source=email&utm_medium=lifecycle&utm_campaign=path_offer";
    expect(e.html).toContain(
      `${PRO_PRICE_TERMS} You can choose any of these plans on the <a href="${pricing.replace(/&/g, "&amp;")}" style="color:${EMAIL_COLORS.primary};">pricing page</a>.</p>`
    );
    expect(e.text).toContain(
      `${PRO_PRICE_TERMS} Each plan renews automatically. You can cancel at any time.\nYou can choose any of these plans on the pricing page: ${pricing}\n`
    );
    // The button still leads to the study path.
    expect(e.text).toContain(`Continue with Pro: ${base.href}`);
  });

  it("names no free lab for an exam that has none", () => {
    const e = checkpoint(followUp(74), 0);
    expect(e.text).toContain("\nWithout Pro, one practice exam is free.\n");
    expect(e.html).toContain(">Without Pro, one practice exam is free.</p>");
  });

  it("states every plan, the currency and the regional adjustment", () => {
    expect(PRO_PRICE_TERMS).toMatch(/a month, .* every three months, or .* a year\./);
    expect(PRO_PRICE_TERMS).toContain("Prices are in US dollars and are adjusted by region.");
  });

  it("has no price typed into the templates themselves", () => {
    const source = readFileSync(join(process.cwd(), "src/server/email/templates.ts"), "utf8");
    expect(source.match(/\$\d/g)).toBeNull();
  });

  it("previews the email's point in the inbox, not the logo", () => {
    expect(checkpoint(followUp(74)).html).toMatch(/<body[^>]*>\s*<div style="display:none;[^"]*">Your result in each domain/);
  });

  it("calls a high checkpoint a strong first result, never exam-ready", () => {
    const e = checkpoint(followUp(82));
    // Beside the score: the site's words for the band. In the sentence: what a dozen questions can and cannot show.
    expect(e.html).toContain(">Target met<");
    expect(e.html).not.toMatch(/exam[- ]ready/i);
    expect(e.text).not.toMatch(/exam[- ]ready/i);
    expect(e.text).toContain(
      "You scored 82% on your Network+ readiness checkpoint, which has 6 exam-style questions weighted in the same way as the domains of the real exam. This is a strong first result, but it is not a final measure. The real exam has up to 90 questions, and the rest of your study path and full timed practice exams will confirm it."
    );
  });

  it("leaves out what does not apply", () => {
    const e = checkpoint(followUp(100, { opportunity: null, remaining: 0 }));
    expect(e.text).not.toContain("area to focus on");
    expect(e.text).not.toContain("remaining step");
  });

  it("escapes titles in the HTML", () => {
    const tricky = { ...domains[1], title: "Implementation & <ops>" };
    const e = checkpointResultEmail({
      ...base,
      examName: "Network+",
      domains: [domains[0], tricky],
      followUp: followUp(60, { opportunity: tricky }),
      questionCount: 617,
      freeLabs: 12,
    });
    expect(e.html).toContain(">Your checkpoint result</h1>");
    expect(e.html).toContain("Implementation &amp; &lt;ops&gt;");
    expect(e.html).not.toContain("<ops>");
  });
});

/** The text of an email's one heading. */
const heading = (email: EmailContent) => /<h1[^>]*>([^<]*)<\/h1>/.exec(email.html)?.[1];

// Every email used to greet its reader by the first word of the display name:
// "Welcome to CertBench, Dr." for "Dr. Jane Smith", a mailbox name for an
// account named from its address, and a filter that kept a stranger's markup
// and links out of the greeting. No template takes a name now.
describe("the greeting", () => {
  it("names nobody: every email opens with its heading alone, in both parts", () => {
    const emails = everyEmail();
    expect(emails.map((email) => email.text.split("\n")[0])).toEqual([
      "Welcome to CertBench.",
      "This is your CompTIA study plan.",
      "How did your CompTIA Security+ exam go?",
      "Your exam is in 7 days.",
      "Continue your study path.",
      "Your readiness checkpoint is next.",
      "Your checkpoint result.",
      "Your checkpoint result.",
      "Your checkpoint result.",
    ]);
    expect(emails.map(heading)).toEqual([
      "Welcome to CertBench",
      "Your study plan",
      "How did your exam go?",
      "Your exam is in 7 days",
      "Continue your study path",
      "Your readiness checkpoint is next",
      "Your checkpoint result",
      "Your checkpoint result",
      "Your checkpoint result",
    ]);
  });

  it("is built from no display name: no template reads one", () => {
    const source = readFileSync(join(process.cwd(), "src/server/email/templates.ts"), "utf8");
    expect(source).not.toMatch(/displayName|greetingName/);
  });
});

describe("a value that comes from outside the templates", () => {
  const MARK = `<x>&"'`;
  const ESCAPED = "&lt;x&gt;&amp;&quot;&#39;";
  const link = (path: string) => `https://certbench.dev/${path}?a=1&b="><x>`;
  const escapedLink = (path: string) => `href="https://certbench.dev/${path}?a=1&amp;b=&quot;&gt;&lt;x&gt;"`;
  const title = `Ports ${MARK}`;
  const markedDomains: PathDomain[] = [
    { number: `1.0${MARK}`, title: `Concepts ${MARK}`, weight: 23, objectives: [] },
    { number: "2.0", title: `Implementation ${MARK}`, weight: 20, objectives: [] },
  ];

  /** One of every email, with every name, title and address it is given carrying markup. */
  const marked = (): [string, EmailContent, string[]][] => [
    [
      "welcome",
      welcomeEmail({ certName: `Security+ ${MARK}`, unsubscribeUrl: link("unsubscribe") }),
      [`<strong>Security+ ${ESCAPED}</strong>`, escapedLink("unsubscribe")],
    ],
    ["study plan", studyPlanEmail({ source: "port-numbers-quiz", unsubscribeUrl: link("unsubscribe") }), [escapedLink("unsubscribe")]],
    [
      "post-exam",
      postExamEmail({
        certName: `Security+ ${MARK}`,
        unsubscribeUrl: link("unsubscribe"),
        passHref: link("pass"),
        failHref: link("fail"),
      }),
      [`Security+ ${ESCAPED} exam has passed`, escapedLink("pass"), escapedLink("fail"), escapedLink("unsubscribe")],
    ],
    [
      "countdown",
      pathCountdownEmail({
        examName: `Security+ ${MARK}`,
        daysUntilExam: 7,
        examDate: "2026-11-09",
        standing: { done: 3, total: 35, freeLeft: 3 },
        pro: false,
        freeLabs: 12,
        href: link("path"),
        unsubscribeUrl: link("unsubscribe"),
      }),
      [`steps in your Security+ ${ESCAPED} study path.`, escapedLink("path"), escapedLink("unsubscribe")],
    ],
    [
      "reminder",
      pathNudgeEmail({
        examName: `Security+ ${MARK}`,
        nudge: nudge({ next: { title, kind: "learn" } }),
        href: link("path"),
        unsubscribeUrl: link("unsubscribe"),
      }),
      [`of your Security+ ${ESCAPED} study path.`, `<strong>Ports ${ESCAPED}</strong>`, escapedLink("path"), escapedLink("unsubscribe")],
    ],
    [
      "checkpoint next",
      pathNudgeEmail({
        examName: `Security+ ${MARK}`,
        nudge: nudge({ done: 5, freeLeft: 1, toCheckpoint: 0, next: { title: "Readiness checkpoint", kind: "checkpoint" } }),
        href: link("path"),
        unsubscribeUrl: link("unsubscribe"),
      }),
      [`of your Security+ ${ESCAPED} study path.`, escapedLink("path"), escapedLink("unsubscribe")],
    ],
    [
      "checkpoint result",
      checkpointResultEmail({
        examName: `Network+ ${MARK}`,
        domains: markedDomains,
        followUp: followUp(60, { opportunity: markedDomains[1] }),
        questionCount: 617,
        freeLabs: 12,
        href: link("path"),
        unsubscribeUrl: link("unsubscribe"),
      }),
      [
        `>Network+ ${ESCAPED} readiness checkpoint</div>`,
        `on your Network+ ${ESCAPED} readiness checkpoint`,
        `>1.0${ESCAPED}</span>Concepts ${ESCAPED}</td>`,
        `<strong>Implementation ${ESCAPED}</strong>`,
        `The rest of your Network+ ${ESCAPED} study path</div>`,
        `remaining steps of your Network+ ${ESCAPED} study path</td>`,
        `All 617 Network+ ${ESCAPED} questions, with review`,
        escapedLink("path"),
        escapedLink("unsubscribe"),
      ],
    ],
  ];

  it.each(marked())("is escaped wherever it enters the HTML of the %s email", (_, email, escaped) => {
    expect(email.html).not.toContain("<x>");
    // No attribute is closed early by a quotation mark inside a value.
    expect(email.html).not.toContain(`b="`);
    for (const piece of escaped) expect(email.html).toContain(piece);
  });

  it("is printed as it stands in the text part, which is not HTML", () => {
    const [, countdown] = marked()[3];
    expect(countdown.text).toContain(`steps in your Security+ ${MARK} study path.`);
    expect(countdown.text).toContain(`Continue the study path: ${link("path")}`);
    expect(countdown.text).not.toContain("&amp;");
  });
});
