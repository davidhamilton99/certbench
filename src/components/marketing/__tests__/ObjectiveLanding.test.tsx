// @vitest-environment jsdom
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";

// Server render only: nothing here signs anyone in, reads the database or reaches an API.
vi.mock("@/lib/analytics", () => ({ track: vi.fn(), identifyUser: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ push: vi.fn(), back: vi.fn() }) }));
// The players are other packages' components: this page only has to place them.
vi.mock("@/components/marketing/QuestionDeck", () => ({
  QuestionDeck: ({ label }: { label: string }) => <div data-testid="deck">{label}</div>,
}));
vi.mock("@/components/path/QuickRound", () => ({ QuickRound: () => <div data-testid="round" /> }));

import { ObjectiveLanding, type ObjectiveLandingData } from "../ObjectiveLanding";

/** The page as served, parsed: what search, an AI answer and a screen reader are given. */
function served(element: ReactElement): Document {
  return new DOMParser().parseFromString(renderToString(element), "text/html");
}

const text = (el: Element | null | undefined) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();

const SECURITY: ObjectiveLandingData = {
  certSlug: "security-plus-sy0-701",
  certName: "CompTIA Security+",
  shortCertName: "Security+",
  examCode: "SY0-701",
  code: "1.1",
  title: "Compare and contrast various types of security controls",
  topic: "Security controls",
  domainNumber: "1.0",
  domainTitle: "General Security Concepts",
  domainWeight: 12,
  samples: [{ questionText: "Q", options: ["a", "b", "c", "d"], correctIndex: 0, explanation: "Because." }],
  siblings: [],
};

/** A Network+ page: its topic is one of CertBench's own, and its number is not CompTIA's. */
const NETWORK: ObjectiveLandingData = {
  ...SECURITY,
  certSlug: "network-plus-n10-009",
  certName: "CompTIA Network+",
  shortCertName: "Network+",
  examCode: "N10-009",
  code: "1.1",
  title: "Explain concepts related to the OSI reference model",
  topic: "The OSI model",
  domainTitle: "Networking Concepts",
  domainWeight: 23,
};

/** An A+ page: its objective's name is CertBench's own wording (src/data/a-plus-v15/types.ts). */
const A_PLUS: ObjectiveLandingData = {
  ...SECURITY,
  certSlug: "a-plus-core1-220-1201",
  certName: "CompTIA A+ Core 1",
  shortCertName: "A+ Core 1",
  examCode: "220-1201",
  code: "2.1",
  title: "TCP and UDP ports, protocols and their purposes",
  topic: "Ports and protocols",
  domainNumber: "2.0",
  domainTitle: "Networking",
  domainWeight: 23,
};

const ROUND = {
  cert: "network-plus-n10-009",
  examName: "Network+",
  title: "The OSI model",
  reps: [],
  structure: { certSlug: "network-plus-n10-009", examName: "Network+", examCode: "N10-009", domains: [] },
} as unknown as NonNullable<Parameters<typeof ObjectiveLanding>[0]["round"]>;

/** The page's own words under the questions: the paragraph that says what the page holds. */
const prose = (doc: Document) =>
  [...doc.querySelectorAll("p")].map(text).find((p) => p.startsWith("This page has practice questions")) ?? "";

describe("a Network+ topic named in a sentence", () => {
  // The topic is CertBench's own short name, which opens with a capital. In the
  // middle of a heading or a sentence it reads as a phrase.
  it("is a phrase in the heading over the questions, with or without the step played above", () => {
    const h2 = (doc: Document) => [...doc.querySelectorAll("h2")].map(text);
    expect(h2(served(<ObjectiveLanding data={NETWORK} />))).toContain("Practice questions on the OSI model");
    expect(h2(served(<ObjectiveLanding data={NETWORK} round={ROUND} />))).toContain("More practice questions on the OSI model");
    expect(h2(served(<ObjectiveLanding data={NETWORK} round={ROUND} />)).join(" ")).not.toMatch(/More The OSI/);
  });

  it("is a phrase in the page's own words", () => {
    expect(prose(served(<ObjectiveLanding data={NETWORK} />))).toBe(
      "This page has practice questions on the OSI model for Network+ N10-009. Every question is original, is written for the exam, and has a full explanation. Answer the questions above to have them marked at once."
    );
  });
});

describe("an objective's name", () => {
  // Quotation marks would say that these are CompTIA's words.
  it("is never quoted as CompTIA's title", () => {
    for (const data of [SECURITY, A_PLUS]) {
      const said = prose(served(<ObjectiveLanding data={data} />));
      expect(said, data.certSlug).not.toMatch(/[“”"]/);
      expect(said, data.certSlug).not.toContain(data.title);
      expect(said, data.certSlug).toMatch(new RegExp(`^This page has practice questions for ${data.shortCertName.replace("+", "\\+")} objective ${data.code}\\. `));
    }
  });

  it("is said to be CertBench's own wording on an A+ page, and only there", () => {
    const own = "The objective's name on this page is CertBench's own wording, and CompTIA's objectives document has the official wording.";
    expect(prose(served(<ObjectiveLanding data={A_PLUS} />))).toContain(own);
    expect(prose(served(<ObjectiveLanding data={SECURITY} />))).not.toContain(own);
  });
});

describe("the card that leads from an objective page to the study path", () => {
  it("says that the Security+ study path covers the whole exam, one objective at a time", () => {
    const card = text(served(<ObjectiveLanding data={SECURITY} />).querySelector("section.cb-sheet"));
    expect(card).toContain(
      "The Security+ study path covers the whole exam in short steps, one objective at a time, and shows where you stand as you progress."
    );
  });

  // The Network+ steps follow CertBench's own topics, which are not CompTIA's
  // N10-009 objectives, so the page does not say that they cover the whole exam.
  it("says on a Network+ page only that the study path works through the exam topic by topic", () => {
    const card = text(served(<ObjectiveLanding data={NETWORK} />).querySelector("section.cb-sheet"));
    expect(card).toContain(
      "The Network+ study path works through the exam topic by topic, in short steps, and shows where you stand as you progress."
    );
    expect(card).not.toMatch(/whole exam|every objective/);
  });
});
