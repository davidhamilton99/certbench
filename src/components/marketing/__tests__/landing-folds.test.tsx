// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";

// Server render only: nothing here signs anyone in or reaches an API.
vi.mock("@/lib/supabase-browser", () => ({
  createClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
  }),
}));
vi.mock("@/lib/analytics", () => ({ track: vi.fn(), identifyUser: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ push: vi.fn() }) }));

import { PbqExampleLanding } from "../PbqExampleLanding";
import { CERT_PAGES_UPDATED_ISO, PBQ_EXAMPLE_PAGES } from "@/lib/seo/cert-pages";
import { usesOfficialObjectiveNumbers } from "@/lib/seo/exam-versions";
import { pbqRegistry } from "@/data/pbq";
import { FREE_LAB_COUNT, LABS_WITHOUT_ACCOUNT } from "@/core/path/free-labs";
import { EXAM_CODES } from "@/core/path/versions";
import { PORT_ENTRIES } from "@/lib/tools/port-quiz-data";
import { MODES } from "@/lib/tools/subnetting";
import { MIXED_MODE_NAME, modeName } from "@/lib/tools/subnet-mode-names";
import { acronyms } from "@/data/reference/security-plus-sy0-701/acronyms";
import PortQuizPage from "@/app/(marketing)/tools/port-numbers-quiz/page";
import AcronymsQuizPage from "@/app/(marketing)/tools/security-plus-acronyms-quiz/page";
import SubnettingPracticePage from "@/app/(marketing)/tools/subnetting-practice/page";
import SubnetCalculatorPage from "@/app/(marketing)/tools/subnet-calculator/page";

/**
 * The page as served, parsed: what search and a visitor with scripts off get.
 * A page renders its content only; the header, the main region and the footer
 * come from the public layout.
 */
function served(element: React.ReactElement): Document {
  return new DOMParser().parseFromString(renderToString(element), "text/html");
}

const text = (el: Element | null | undefined) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();

/** The folded reference list under a heading, and its rows. */
function fold(doc: Document, heading: string) {
  const details = [...doc.querySelectorAll("details")].find((d) => text(d.querySelector("h2")).startsWith(heading));
  return details ?? null;
}

/** The page's facts under its title: each label with its value. */
function facts(doc: Document): Record<string, string> {
  const list = doc.querySelector("section dl");
  return Object.fromEntries([...(list?.querySelectorAll("dt") ?? [])].map((dt) => [text(dt), text(dt.nextElementSibling)]));
}

/** Every page is content only (no frame of its own), with one title. */
function expectContentOnly(doc: Document) {
  expect(doc.querySelector("main")).toBeNull();
  expect(doc.querySelector("header")).toBeNull();
  expect(doc.querySelector("footer")).toBeNull();
  expect(doc.querySelectorAll("h1")).toHaveLength(1);
}

describe("PBQ example pages", () => {
  it.each(PBQ_EXAMPLE_PAGES.map((p) => [p.path, p] as const))("%s: leads with a lab, every other lab folded but served", (_, page) => {
    const doc = served(<PbqExampleLanding page={page} />);
    const scenarios = pbqRegistry[page.certSlug];
    expectContentOnly(doc);
    // The first screen: the heading, then the three labs to choose from and the player.
    expect(text(doc.querySelector("h1"))).toBe(page.h1);
    const chooser = doc.querySelector('[role="group"][aria-label="Choose a lab"]');
    const tiles = [...(chooser?.querySelectorAll("button") ?? [])];
    expect(tiles).toHaveLength(3);
    // A tile is named by the words printed on it: the time written out, the level, then the title.
    for (const tile of tiles) {
      expect(tile.hasAttribute("aria-label")).toBe(false);
      expect(tile.hasAttribute("title")).toBe(false);
      expect(text(tile)).toMatch(/^\d+ minutes?, (Introductory|Core|Exam level), /);
    }
    expect(text(chooser?.querySelector('button[aria-pressed="true"]'))).toMatch(/^\d+ minutes?, Introductory, /);

    // The chooser's labs are the ones that need no account: the product's one figure for it.
    expect(tiles).toHaveLength(LABS_WITHOUT_ACCOUNT);

    // The rest of the free labs, listed under the player to play on the page.
    const more = [...doc.querySelectorAll("section")].find(
      (s) => text(s.querySelector("h2")) === `${FREE_LAB_COUNT - LABS_WITHOUT_ACCOUNT} more free labs`
    );
    expect(more).toBeTruthy();
    const rows = [...more!.querySelectorAll("button")];
    expect(rows).toHaveLength(FREE_LAB_COUNT - LABS_WITHOUT_ACCOUNT);
    for (const row of rows) expect(row.hasAttribute("aria-label")).toBe(false);
    // Each domain's heading reads as words: "Domain 1: General Security Concepts".
    const domains = [...more!.querySelectorAll("h3")].map(text);
    expect(domains.length).toBeGreaterThan(0);
    for (const heading of domains) expect(heading).toMatch(/^Domain \d+: \S/);

    // The labs that come with Pro, folded: in the page, closed.
    const labs = fold(doc, `${scenarios.length - FREE_LAB_COUNT} more labs with Pro`);
    expect(labs).not.toBeNull();
    expect(labs!.hasAttribute("open")).toBe(false);
    const titles = [...labs!.querySelectorAll("li")].map((li) => text(li.querySelector("span.block")));
    for (const s of scenarios) {
      const listed = titles.includes(s.title);
      const offered =
        tiles.some((tile) => text(tile).endsWith(`, ${s.title}`)) || rows.some((row) => text(row).startsWith(`${s.title}, `));
      expect(listed !== offered, `${s.title}: listed once, either free or folded`).toBe(true);
    }
    for (const heading of [...labs!.querySelectorAll("h3")].map(text)) expect(heading).toMatch(/^Domain \d+: \S/);
    // The lock beside each of them is an image with a name, so it is read.
    const locks = labs!.querySelectorAll('svg[role="img"][aria-label="Included with Pro"]');
    expect(locks).toHaveLength(scenarios.length - FREE_LAB_COUNT);
    expect(text(labs)).toContain(`Pro opens all ${scenarios.length} on your`);

    // The facts under the title say how many labs are free, and what an account is needed for.
    expect(LABS_WITHOUT_ACCOUNT).toBe(3);
    expect(facts(doc)).toEqual({
      "Free labs": String(FREE_LAB_COUNT),
      Grading: "With partial credit",
      Account: `Not required for the first ${LABS_WITHOUT_ACCOUNT} labs`,
    });

    // For search and AI answers: the structured data carries the day the page's words last changed.
    const resource = [...doc.querySelectorAll('script[type="application/ld+json"]')]
      .map((s) => JSON.parse(s.textContent ?? "{}") as Record<string, unknown>)
      .find((d) => d["@type"] === "LearningResource");
    expect(resource?.dateModified).toBe(CERT_PAGES_UPDATED_ISO);

    // What the study path covers, in words that are true of the exam: Network+
    // is set out by CertBench's own topics, so its page does not say "every exam objective".
    const official = usesOfficialObjectiveNumbers(page.certSlug);
    expect(text(doc.body)).toContain(
      `The study path covers every ${official ? "exam objective" : "topic"} in short steps, and a readiness checkpoint shows where you stand.`
    );
    if (!official) expect(text(doc.body)).not.toMatch(/every (?:exam )?objective/);
    // The line over the title holds the one fact the title does not: the exam's code.
    expect(text(doc.querySelector("h1")?.previousElementSibling)).toContain(
      (EXAM_CODES as Record<string, string>)[page.certSlug]
    );

    // The way on to the study path at the foot of the page.
    const start = [...doc.querySelectorAll("a")].find((a) => text(a) === "Start the study path");
    expect(start?.getAttribute("href")).toBe(`/path/${page.certSlug}`);
    // The intro no longer points "below" at a lab that is above it.
    expect(page.intro.join(" ")).not.toMatch(/below/);
  });
});

describe("tool pages", () => {
  it("port numbers: the quiz first, the full list folded in the page with every port", () => {
    const doc = served(<PortQuizPage />);
    expectContentOnly(doc);
    // The drill's card holds the first screen until it deals its first question.
    const card = doc.querySelector(".glass")!;
    expect(text(card)).toContain("Port numbers");
    // Headed as what it is: the quiz's own list, and not a list that CompTIA publishes.
    const list = fold(doc, "The port numbers in this quiz");
    expect(list?.hasAttribute("open")).toBe(false);
    const rows = [...list!.querySelectorAll("tbody tr")].map((tr) => [...tr.children].map(text));
    expect(rows).toEqual(PORT_ENTRIES.map((e) => [e.port, e.protocol, e.transport]));
    expect(text(list!.querySelector("summary"))).toContain(`and ${PORT_ENTRIES.length - 5} more`);
    // The list comes after the quiz, never before it.
    expect(card.compareDocumentPosition(list!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // A link to the list of exams carries the one label that every page gives it.
    const path = [...doc.querySelectorAll("a")].find((a) => text(a) === "Choose your exam");
    expect(path?.getAttribute("href")).toBe("/start");

    expect(facts(doc)).toEqual({
      "First round": "20 questions",
      Account: "Not required for the first round",
      Marking: "After each answer",
    });
    // The email form's one field has a label in the page, tied to it.
    const label = [...doc.querySelectorAll("label")].find((l) => text(l) === "Email address");
    expect(doc.getElementById(label!.getAttribute("for")!)?.getAttribute("type")).toBe("email");
  });

  it("acronyms: every acronym folded in the page, A to Z", () => {
    const doc = served(<AcronymsQuizPage />);
    expectContentOnly(doc);
    // The list gives one meaning for each acronym, so it is not called the full list.
    const list = fold(doc, "The Security+ acronyms in this quiz");
    expect(list?.hasAttribute("open")).toBe(false);
    const rows = [...list!.querySelectorAll("tbody tr")].map((tr) => text(tr.children[0]));
    expect(rows).toEqual(acronyms.entries.map((e) => e.columns.acronym));
    expect(text(list!.querySelector("summary"))).toContain(
      `The list runs from AAA to XSS, with one meaning for each of its ${acronyms.entries.length} acronyms.`
    );
    const path = [...doc.querySelectorAll("a")].find((a) => text(a) === "Start the Security+ study path");
    expect(path?.getAttribute("href")).toBe("/path/security-plus-sy0-701");
  });

  it("subnetting: the drill first, then what each mode practices and the method", () => {
    const doc = served(<SubnettingPracticePage />);
    expectContentOnly(doc);
    const picker = doc.querySelector('[role="group"][aria-label="Drill mode"]');
    const names = [...MODES.map((m) => modeName(m.id)), MIXED_MODE_NAME];
    expect([...picker!.querySelectorAll("button")].map(text)).toEqual(names);
    // The names are words: "and" is written out, and nothing is joined by an arrow.
    expect(names).toEqual(["Binary", "CIDR and mask", "Network ID", "Broadcast and range", "Host math", "Same subnet?", "Mixed"]);
    // Each mode is described in a sentence, under the drill's own name for it.
    const modes = [...doc.querySelectorAll("section")].find((s) => text(s.querySelector("h2")) === "The modes");
    const described = [...modes!.querySelectorAll("dt")].map((dt) => [text(dt), text(dt.nextElementSibling)]);
    expect(described.map(([name]) => name)).toEqual(names);
    for (const [, sentence] of described) expect(sentence).toMatch(/^[A-Z].*\.$/);
    expect(text(doc.body)).toContain("The block-size method");
    // The hero counts the modes that the picker offers.
    expect(facts(doc).Modes).toBe(String(MODES.length + 1));
    const path = [...doc.querySelectorAll("a")].find((a) => text(a) === "Start the Network+ study path");
    expect(path?.getAttribute("href")).toBe("/path/network-plus-n10-009");
  });

  it("subnet calculator: the calculator first, the reference table still in the open", () => {
    const doc = served(<SubnetCalculatorPage />);
    expectContentOnly(doc);
    // The address field has a label printed in the page, tied to it.
    const label = [...doc.querySelectorAll("label")].find((l) => text(l) === "IP address");
    expect(doc.getElementById(label!.getAttribute("for")!)?.tagName).toBe("INPUT");
    const sheet = [...doc.querySelectorAll("table")].find((t) => text(t.querySelector("thead")).startsWith("CIDR"));
    expect(sheet?.querySelectorAll("tbody tr")).toHaveLength(14);
    expect(sheet?.closest("details")).toBeNull();
    // The calculator comes before the table.
    expect(label!.compareDocumentPosition(sheet!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const path = [...doc.querySelectorAll("a")].find((a) => text(a) === "Start the Network+ study path");
    expect(path?.getAttribute("href")).toBe("/path/network-plus-n10-009");
  });
});
