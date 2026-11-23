// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import type { SharePayload } from "@/server/share/readiness-token";

const share = vi.hoisted(() => ({ payload: null as SharePayload | null }));
vi.mock("@/server/share/readiness-token", () => ({ verifyShare: () => share.payload }));
// The public header and footer have tests of their own. Here they are stand-ins.
vi.mock("@/components/marketing/MarketingHeader", () => ({ MarketingHeader: () => <header /> }));
vi.mock("@/components/marketing/Footer", () => ({ Footer: () => <footer /> }));

import { CARD } from "@/lib/share/card";
import Page, { generateMetadata } from "../page";

const PAYLOAD: SharePayload = {
  n: "Sam R.",
  c: "CompTIA Security+",
  x: "SY0-701",
  s: 72.4,
  p: 0,
  d: [
    ["General Security Concepts", 81],
    ["Threats, Vulnerabilities, and Mitigations", 64],
    ["Security Architecture", 38],
    ["Security Operations", 77],
    ["Security Program Management and Oversight", 70],
    ["A sixth domain that is never drawn", 10],
  ],
};

const params = Promise.resolve({ token: "token" });

async function served(): Promise<Document> {
  return new DOMParser().parseFromString(renderToString(await Page({ params })), "text/html");
}

const text = (node: ParentNode | null | undefined) => (node?.textContent ?? "").replace(/\s+/g, " ").trim();

/** An inline colour as the browser reports it, for comparison with a hex from the card's table. */
function rgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}

beforeEach(() => {
  share.payload = PAYLOAD;
});

describe("the shared readiness page", () => {
  it("has one main region that the skip link can move to, and one title", async () => {
    const doc = await served();
    const mains = doc.querySelectorAll("main");
    expect(mains).toHaveLength(1);
    expect(mains[0].id).toBe("main-content");
    expect(mains[0].getAttribute("tabindex")).toBe("-1");
    expect(doc.querySelectorAll("h1")).toHaveLength(1);
  });

  it("prints the score, the exam and who it belongs to", async () => {
    const card = text((await served()).querySelector("main"));
    expect(card).toContain("72%");
    expect(card).toContain("CompTIA Security+");
    expect(card).toContain("Sam R., SY0-701");
  });

  it("says when a score is preliminary", async () => {
    share.payload = { ...PAYLOAD, p: 1 };
    expect(text((await served()).querySelector("main"))).toContain("(preliminary)");
  });

  it("names every domain in ink that can be read on the card, and never cuts a name short", async () => {
    const doc = await served();
    const rows = [...doc.querySelectorAll("main li")];
    expect(rows).toHaveLength(5);
    for (const row of rows) {
      const name = row.querySelector("span") as HTMLElement;
      // The old dark card's pale grey measured 1.48:1 on this panel.
      expect(name.style.color).toBe(rgb(CARD.sub));
      expect(name.className).not.toContain("truncate");
    }
    expect(text(rows[1])).toBe("Threats, Vulnerabilities, and Mitigations64%");
  });

  it("labels the list in sentence case, with no spaced capitals", async () => {
    const doc = await served();
    const list = doc.querySelector("main ul")!;
    const label = doc.getElementById(list.getAttribute("aria-labelledby")!)!;
    expect(label.textContent).toBe("Domain breakdown");
    expect(label.style.letterSpacing).toBe("");
    expect(doc.body.textContent).not.toContain("DOMAIN BREAKDOWN");
  });

  it("hides the bars from a screen reader, because each repeats a printed figure", async () => {
    const doc = await served();
    const bars = [...doc.querySelectorAll("main [aria-hidden]")].filter((el) => el.tagName !== "svg");
    // One for the score and one for each of the five domains.
    expect(bars).toHaveLength(6);
    for (const bar of bars) expect(bar.className).not.toContain("rounded-full");
  });

  it("leads on to the exam list", async () => {
    const link = (await served()).querySelector('main a[href="/start"]');
    // The one name that every page gives a link to the exam list.
    expect(text(link)).toBe("Choose your exam");
  });

  it("says so when the link holds no card, and still leads on", async () => {
    share.payload = null;
    const doc = await served();
    expect(text(doc.querySelector("main"))).toContain(
      "This readiness card is not available, but you can measure your own in about 20 minutes."
    );
    expect(doc.querySelector("main ul")).toBeNull();
    expect(doc.querySelector('main a[href="/start"]')).not.toBeNull();
  });

  it("is kept out of search, with or without a card", async () => {
    expect((await generateMetadata({ params })).robots).toEqual({ index: false, follow: true });
    // A score, and never a verdict that the learner is ready for the exam.
    expect((await generateMetadata({ params })).title).toBe("Sam R. has a readiness score of 72% for CompTIA Security+");
    expect(String((await generateMetadata({ params })).title)).not.toMatch(/ready for/);
    share.payload = null;
    expect((await generateMetadata({ params })).robots).toEqual({ index: false, follow: true });
  });
});
