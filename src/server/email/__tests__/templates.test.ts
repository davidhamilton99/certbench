import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/env", () => ({
  publicEnv: { NEXT_PUBLIC_APP_URL: "https://certbench.dev" },
}));

import {
  checkpointResultEmail,
  pathCountdownEmail,
  pathEmailLink,
  pathNudgeEmail,
  postExamEmail,
  studyPlanEmail,
  welcomeEmail,
} from "../templates";
import { EMAIL_BAND_COLORS, EMAIL_COLORS } from "../colors";
import type { CheckpointFollowUp } from "@/core/path/follow-up";
import type { PathNudge } from "@/core/path/nudge";
import type { PathDomain } from "@/core/path/types";
import { OG } from "@/lib/og/mark";
import { PRO_PRICE_TERMS } from "@/lib/pricing/terms";
import { bandFor } from "@/lib/readiness/band";

const base = {
  displayName: "Sam Lee",
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

const checkpoint = (f: CheckpointFollowUp, displayName = "Sam Lee") =>
  checkpointResultEmail({ ...base, displayName, examName: "Network+", domains, followUp: f, questionCount: 617 });

/** One of every email CertBench sends, with every band and every state of the path strip in them. */
const everyEmail = () => [
  welcomeEmail({ displayName: "Sam Lee", certName: "CompTIA Security+" }),
  studyPlanEmail({ source: "port-numbers-quiz", unsubscribeUrl: base.unsubscribeUrl }),
  postExamEmail({
    displayName: "Sam Lee",
    certName: "CompTIA Security+",
    unsubscribeUrl: base.unsubscribeUrl,
    passHref: "https://certbench.dev/story?t=x&r=pass",
    failHref: "https://certbench.dev/story?t=x&r=fail",
  }),
  pathCountdownEmail({ ...base, daysUntilExam: 7, standing: { done: 3, total: 35, freeLeft: 3 }, pro: false }),
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
    const { html } = welcomeEmail({ displayName: "Sam Lee", certName: "CompTIA Security+" });
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
    const email = welcomeEmail({ displayName: "Sam Lee", certName: "CompTIA Security+" });
    expect(email.subject).toBe("Your CompTIA Security+ study path is saved");
    expect(email.text).toContain("Welcome to CertBench, Sam.");
    expect(email.text).toContain("Continue your study path: https://certbench.dev/start");
    expect(email.html).toContain('href="https://certbench.dev/start"');
    // Transactional: it carries no unsubscribe link.
    expect(email.html).not.toContain("Unsubscribe");
    expect(email.text).not.toContain("Unsubscribe");
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
});

describe("postExamEmail", () => {
  it("asks for the result with one button, and offers help with a retake", () => {
    const email = postExamEmail({
      displayName: "Sam Lee",
      certName: "CompTIA Security+",
      unsubscribeUrl: base.unsubscribeUrl,
      passHref: "https://certbench.dev/story?t=x&r=pass",
      failHref: "https://certbench.dev/story?t=x&r=fail",
    });
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

  it("escapes names and titles in the HTML", () => {
    const email = pathNudgeEmail({
      ...base,
      displayName: "<b>Sam</b>",
      nudge: nudge({ next: { title: "Ports & protocols", kind: "learn" } }),
    });
    expect(email.html).toContain("&lt;b&gt;Sam&lt;/b&gt;");
    expect(email.html).toContain("Ports &amp; protocols");
    expect(email.html).not.toContain("<b>Sam</b>");
  });
});

describe("pathCountdownEmail", () => {
  const countdown = (days: number, standing: { done: number; total: number; freeLeft: number }, pro = false) =>
    pathCountdownEmail({ ...base, daysUntilExam: days, standing, pro });

  it("shows where they are on the path and links back to it", () => {
    const email = countdown(7, { done: 3, total: 35, freeLeft: 3 });
    expect(email.subject).toBe("7 days until your Security+ exam");
    expect(email.text).toContain("You have completed 3 of the 35 steps in your Security+ study path.");
    expect(email.text).toContain(`Continue the study path: ${base.href}`);
    expect(email.html).not.toContain("/dashboard");
    expect(email.text).not.toContain("Readiness");
  });

  it("invites a first step when they have not played one", () => {
    const email = countdown(14, { done: 0, total: 35, freeLeft: 6 });
    expect(email.text).toContain("Your Security+ study path is ready. It has 35 steps of about 4 minutes each.");
    expect(email.html).toContain("Start the study path");
  });

  it("is straight about the free steps being done", () => {
    const email = countdown(3, { done: 6, total: 35, freeLeft: 0 });
    expect(email.text).toContain(
      "You have completed every free step of your Security+ study path, including the readiness checkpoint. 29 more steps remain."
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

  it("keeps the night before calm", () => {
    const email = countdown(1, { done: 12, total: 35, freeLeft: 0 });
    expect(email.subject).toBe("Your Security+ exam is tomorrow");
    expect(email.text).toContain("Do not study late tonight.");
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
    expect(e.text).toContain("- Practice across all 617 Network+ questions");
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

  it("escapes names and titles in the HTML", () => {
    const tricky = { ...domains[1], title: "Implementation & <ops>" };
    const e = checkpointResultEmail({
      ...base,
      displayName: "<b>Sam</b>",
      examName: "Network+",
      domains: [domains[0], tricky],
      followUp: followUp(60, { opportunity: tricky }),
      questionCount: 617,
    });
    expect(e.html).toContain("&lt;b&gt;Sam&lt;/b&gt;");
    expect(e.html).toContain("Implementation &amp; &lt;ops&gt;");
    expect(e.html).not.toContain("<ops>");
  });
});
