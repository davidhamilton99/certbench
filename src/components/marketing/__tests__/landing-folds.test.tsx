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
import { PBQ_EXAMPLE_PAGES } from "@/lib/seo/cert-pages";
import { pbqRegistry } from "@/data/pbq";
import { PORT_ENTRIES } from "@/lib/tools/port-quiz-data";
import { acronyms } from "@/data/reference/security-plus-sy0-701/acronyms";
import PortQuizPage from "@/app/(marketing)/tools/port-numbers-quiz/page";
import AcronymsQuizPage from "@/app/(marketing)/tools/security-plus-acronyms-quiz/page";
import SubnettingPracticePage from "@/app/(marketing)/tools/subnetting-practice/page";
import SubnetCalculatorPage from "@/app/(marketing)/tools/subnet-calculator/page";

/** The page as served, parsed: what search and a visitor with scripts off get. */
function served(element: React.ReactElement): Document {
  return new DOMParser().parseFromString(renderToString(element), "text/html");
}

const text = (el: Element | null | undefined) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();

/** The folded reference list under a heading, and its rows. */
function fold(doc: Document, heading: string) {
  const details = [...doc.querySelectorAll("details")].find((d) => text(d.querySelector("h2")).startsWith(heading));
  return details ?? null;
}

describe("PBQ example pages", () => {
  it.each(PBQ_EXAMPLE_PAGES.map((p) => [p.path, p] as const))("%s: leads with a lab, every other lab folded but served", (_, page) => {
    const doc = served(<PbqExampleLanding page={page} />);
    const scenarios = pbqRegistry[page.certSlug];
    // The first screen: the heading, then the three labs to pick from and the player.
    expect(text(doc.querySelector("h1"))).toBe(page.h1);
    const chooser = doc.querySelector('[role="group"][aria-label="Pick a lab"]');
    expect(chooser?.querySelectorAll("button")).toHaveLength(3);
    expect(chooser?.querySelector('button[aria-pressed="true"]')?.getAttribute("aria-label")).toMatch(/^Warm-up: /);

    // The rest, folded the way the path's lab library lists them: in the page, closed.
    const labs = fold(doc, `${scenarios.length - 3} more labs on your`);
    expect(labs).not.toBeNull();
    expect(labs!.hasAttribute("open")).toBe(false);
    const titles = [...labs!.querySelectorAll("li")].map((li) => text(li.querySelector("span.block")));
    const free = [...chooser!.querySelectorAll("button")].map((b) => b.getAttribute("aria-label") ?? "");
    for (const s of scenarios) {
      const listed = titles.includes(s.title);
      const offered = free.some((label) => label.includes(`: ${s.title}, about`));
      expect(listed !== offered, `${s.title}: listed once, either free or folded`).toBe(true);
    }
    expect(text(labs)).toContain(`All ${scenarios.length} come with Pro, offered after your path's readiness checkpoint.`);

    // The way onto the path at the foot of the page.
    const start = [...doc.querySelectorAll("a")].find((a) => text(a) === "Start my path");
    expect(start?.getAttribute("href")).toBe(`/path/${page.certSlug}`);
    // The intro no longer points "below" at a lab that's above it.
    expect(page.intro.join(" ")).not.toMatch(/below/);
  });
});

describe("tool pages", () => {
  it("port numbers: the quiz first, the full list folded in the page with every port", () => {
    const doc = served(<PortQuizPage />);
    const main = doc.querySelector("main")!;
    // The drill's card holds the first screen until it deals its first question.
    expect(text(main.querySelector(".glass"))).toContain("Port numbers");
    const list = fold(doc, "The full CompTIA port numbers list");
    expect(list?.hasAttribute("open")).toBe(false);
    const rows = [...list!.querySelectorAll("tbody tr")].map((tr) => [...tr.children].map(text));
    expect(rows).toEqual(PORT_ENTRIES.map((e) => [e.port, e.protocol, e.transport]));
    expect(text(list!.querySelector("summary"))).toContain(`and ${PORT_ENTRIES.length - 5} more`);
    // The list comes after the quiz, never before it.
    expect(main.querySelector(".glass")!.compareDocumentPosition(list!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const path = [...doc.querySelectorAll("a")].find((a) => text(a) === "Start my exam path");
    expect(path?.getAttribute("href")).toBe("/start");
  });

  it("acronyms: every acronym folded in the page, A to Z", () => {
    const doc = served(<AcronymsQuizPage />);
    const list = fold(doc, "The full Security+ acronym list");
    expect(list?.hasAttribute("open")).toBe(false);
    const rows = [...list!.querySelectorAll("tbody tr")].map((tr) => text(tr.children[0]));
    expect(rows).toEqual(acronyms.entries.map((e) => e.columns.acronym));
    expect(text(list!.querySelector("summary"))).toContain(`All ${acronyms.entries.length} from AAA to XSS`);
    const path = [...doc.querySelectorAll("a")].find((a) => text(a) === "Start my Security+ path");
    expect(path?.getAttribute("href")).toBe("/path/security-plus-sy0-701");
  });

  it("subnetting: the drill first, then what each mode drills and the method", () => {
    const doc = served(<SubnettingPracticePage />);
    const main = doc.querySelector("main")!;
    const picker = main.querySelector('[role="group"][aria-label="Drill mode"]');
    expect([...picker!.querySelectorAll("button")].map(text)).toEqual([
      "Binary",
      "CIDR ↔ mask",
      "Network ID",
      "Broadcast & range",
      "Host math",
      "Same subnet?",
      "Gauntlet",
    ]);
    expect(text(main)).toContain("The block-size method in 20 seconds");
    const path = [...doc.querySelectorAll("a")].find((a) => text(a) === "Start my Network+ path");
    expect(path?.getAttribute("href")).toBe("/path/network-plus-n10-009");
  });

  it("subnet calculator: the calculator first, the cheat sheet still in the open", () => {
    const doc = served(<SubnetCalculatorPage />);
    expect(doc.querySelector("main input[aria-label='IP address']")).not.toBeNull();
    const sheet = [...doc.querySelectorAll("table")].find((t) => text(t.querySelector("thead")).startsWith("CIDR"));
    expect(sheet?.querySelectorAll("tbody tr")).toHaveLength(14);
    expect(sheet?.closest("details")).toBeNull();
    const path = [...doc.querySelectorAll("a")].find((a) => text(a) === "Start my Network+ path");
    expect(path?.getAttribute("href")).toBe("/path/network-plus-n10-009");
  });
});
