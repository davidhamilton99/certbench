import { describe, expect, it, vi } from "vitest";

vi.mock("@/env", () => ({
  publicEnv: { NEXT_PUBLIC_APP_URL: "https://certbench.dev" },
}));

import { pathCountdownEmail, pathEmailLink, pathNudgeEmail } from "../templates";
import type { PathNudge } from "@/core/path/nudge";

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
