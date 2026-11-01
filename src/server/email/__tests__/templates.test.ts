import { describe, expect, it, vi } from "vitest";

vi.mock("@/env", () => ({
  publicEnv: { NEXT_PUBLIC_APP_URL: "https://certbench.dev" },
}));

import { checkpointResultEmail, pathCountdownEmail, pathEmailLink, pathNudgeEmail } from "../templates";
import type { CheckpointFollowUp } from "@/core/path/follow-up";
import type { PathNudge } from "@/core/path/nudge";
import type { PathDomain } from "@/core/path/types";

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

describe("pathEmailLink", () => {
  it("goes through sign-in to the path, tagged for analytics", () => {
    const url = new URL(pathEmailLink("security-plus-sy0-701", "path_nudge"));
    expect(`${url.origin}${url.pathname}`).toBe("https://certbench.dev/login");
    expect(url.searchParams.get("next")).toBe(
      "/path/security-plus-sy0-701?utm_source=email&utm_medium=lifecycle&utm_campaign=path_nudge"
    );
  });
});

describe("pathNudgeEmail", () => {
  it("names the next stop, how long it takes, and how close the checkpoint is", () => {
    const email = pathNudgeEmail({ ...base, nudge: nudge() });
    expect(email.subject).toBe("Next on your Security+ path: Change management");
    expect(email.text).toContain(
      "You're 3 stops into your Security+ path. Next up is Change management: about 4 minutes of quick questions."
    );
    expect(email.text).toContain("It's 2 short stops from here to your readiness checkpoint");
    expect(email.html).toContain("Play my next stop");
    expect(email.html).toContain(base.href);
    expect(email.html).toContain(base.unsubscribeUrl);
  });

  it("draws the free stretch: played stops checked, the next one numbered, the checkpoint flagged", () => {
    const { html } = pathNudgeEmail({ ...base, nudge: nudge() });
    expect(html.match(/&#10003;/g)).toHaveLength(3);
    expect(html).toMatch(/border:2px solid #2563eb;[^"]*color:#2563eb;[^>]*>4</);
    expect(html.match(/&#9873;/g)).toHaveLength(1);
  });

  it("says when the checkpoint comes right after this stop", () => {
    const email = pathNudgeEmail({ ...base, nudge: nudge({ toCheckpoint: 1 }) });
    expect(email.text).toContain("Right after it comes your readiness checkpoint");
  });

  it("leads with the checkpoint when it's next", () => {
    const email = pathNudgeEmail({
      ...base,
      nudge: nudge({ done: 5, freeLeft: 1, toCheckpoint: 0, next: { title: "Readiness checkpoint", kind: "checkpoint" } }),
    });
    expect(email.subject).toBe("Your Security+ readiness checkpoint is next");
    expect(email.text).toContain("You've played 5 stops of your Security+ path.");
    expect(email.text).toContain("12 exam-style questions across every domain");
    expect(email.html).toContain("Take my checkpoint");
  });

  it("sizes a practice stop in questions, not minutes", () => {
    const email = pathNudgeEmail({
      ...base,
      nudge: nudge({ next: { title: "Domain 1 practice", kind: "practice" } }),
    });
    expect(email.text).toContain("Next up is Domain 1 practice: 10 exam-style questions.");
  });

  it("doesn't count stops before any are done", () => {
    const email = pathNudgeEmail({
      ...base,
      nudge: nudge({ done: 0, next: { title: "Warm-up", kind: "warmup" }, toCheckpoint: 5 }),
    });
    expect(email.text).toContain("You've started your Security+ path. Next up is Warm-up");
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
  const countdown = (days: number, standing: { done: number; total: number; freeLeft: number }) =>
    pathCountdownEmail({ ...base, daysUntilExam: days, standing });

  it("shows where they are on the path and links back to it", () => {
    const email = countdown(7, { done: 3, total: 35, freeLeft: 3 });
    expect(email.subject).toBe("7 days to your Security+ exam");
    expect(email.text).toContain("You're 3 of 35 stops into your Security+ path.");
    expect(email.text).toContain(`Continue my path: ${base.href}`);
    expect(email.html).not.toContain("/dashboard");
    expect(email.text).not.toContain("Readiness");
  });

  it("invites a first stop when they haven't played one", () => {
    const email = countdown(14, { done: 0, total: 35, freeLeft: 6 });
    expect(email.text).toContain("Your Security+ path is ready: 35 stops, about 4 minutes each.");
    expect(email.html).toContain("Start my path");
  });

  it("is straight about the free stops being done", () => {
    const email = countdown(3, { done: 6, total: 35, freeLeft: 0 });
    expect(email.text).toContain(
      "You've played every free stop of your Security+ path, readiness checkpoint included. 29 more stops are waiting for you."
    );
  });

  it("keeps the night before calm", () => {
    const email = countdown(1, { done: 12, total: 35, freeLeft: 0 });
    expect(email.subject).toBe("Tomorrow's the day — Security+");
    expect(email.text).toContain("No cramming tonight.");
  });
});

describe("checkpointResultEmail", () => {
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
  const email = (f: CheckpointFollowUp, displayName = "Sam Lee") =>
    checkpointResultEmail({ ...base, displayName, examName: "Network+", domains, followUp: f, questionCount: 617 });

  it("leads with the score and how each domain went", () => {
    const e = email(followUp(74));
    expect(e.subject).toBe("Your Network+ checkpoint: 74%");
    expect(e.html).toContain("74%");
    expect(e.html).toContain("Getting close");
    expect(e.text).toContain(
      "You scored 74% on your Network+ readiness checkpoint: 6 exam-style questions, weighted the way the real exam weights its domains. 75% is where we call it exam-ready."
    );
    expect(e.text).toContain("1 Networking Concepts: 3/3\n2 Network Implementation: 2/3\n3 Network Operations: not asked");
    expect(e.text).toContain("Your biggest opportunity is Network Implementation, 20% of the exam.");
  });

  it("says what the rest of the path holds and what it costs, plainly", () => {
    const e = email(followUp(74));
    expect(e.text).toContain("- All 28 remaining stops of your Network+ path");
    expect(e.text).toContain("- Practice across all 617 Network+ questions");
    expect(e.text).toContain("$39 for 3 months. Renews every 3 months. Cancel anytime.");
    // The guarantee always comes with its conditions, never as a bare promise.
    expect(e.text).toContain(
      "Pass guarantee: Study with Pro for 30+ days and don't pass? We refund your last payment. Terms: https://certbench.dev/terms#pass-guarantee"
    );
    expect(e.html).toContain("Study with Pro for 30+ days and don't pass? We refund your last payment.");
    expect(e.text).toContain(`Unlock your path: ${base.href}`);
    expect(e.html).toContain(`href="${base.href}"`);
    expect(e.html).toContain(base.unsubscribeUrl);
  });

  it("previews the email's point in the inbox, not the logo", () => {
    expect(email(followUp(74)).html).toMatch(/<body[^>]*>\s*<div style="display:none;[^"]*">How each domain went/);
  });

  it("is honest that a passing checkpoint is only a first read", () => {
    const e = email(followUp(82));
    expect(e.html).toContain("Exam ready");
    expect(e.text).toContain("past the 75% we call exam-ready. Still, that's a first read from 6 questions");
  });

  it("leaves out what doesn't apply", () => {
    const e = email(followUp(100, { opportunity: null, remaining: 0 }));
    expect(e.text).not.toContain("biggest opportunity");
    expect(e.text).not.toContain("remaining stop");
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
