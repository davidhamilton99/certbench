// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import type { InventoryRow } from "@/core/path/inventory-types";
import type { PathStructure } from "@/core/path/types";

/**
 * The home page below its first section, as it is served: what it says, in
 * what order, and how it is set. Nothing here reaches a database. The three
 * reads the page makes are replaced, and so are the two parts of the first
 * section that a visitor operates (the exam list and the sample questions),
 * which have tests of their own.
 */
const data = vi.hoisted(() => ({
  testimonials: [] as { id: string; quote: string; displayName: string; certName: string | null }[],
  rows: [] as unknown[],
  structure: null as unknown,
  fail: null as "testimonials" | "inventory" | "structure" | null,
  structureFor: [] as string[],
}));

vi.mock("@/server/supabase/anon", () => ({ createAnonClient: () => ({}) }));
vi.mock("@/server/data/testimonials", () => ({
  listApprovedTestimonials: async () => {
    if (data.fail === "testimonials") throw new Error("The database could not be reached.");
    return data.testimonials;
  },
}));
vi.mock("@/server/path/inventory", () => ({
  examInventory: async () => {
    if (data.fail === "inventory") throw new Error("The database could not be reached.");
    return data.rows;
  },
  examStructure: async (cert: string) => {
    data.structureFor.push(cert);
    if (data.fail === "structure") throw new Error("The database could not be reached.");
    return data.structure;
  },
}));
vi.mock("@/server/path/build-stop", () => ({ authoredToRep: (authored: unknown) => authored }));
vi.mock("@/data/path/security-plus-sy0-701/domains-1-2", () => ({ warmup: [] }));
vi.mock("@/components/path/ExamPicker", () => ({ ExamPicker: () => null }));
vi.mock("@/components/home/SampleQuestions", () => ({ SampleQuestions: () => null }));

import Page, { metadata, revalidate } from "@/app/(marketing)/page";
import { FREE_LAB_COUNT } from "@/core/path/free-labs";
import { labLibrary } from "@/core/path/labs";
import { OBJECTIVE_TITLES } from "@/data/path/titles";
import { pbqRegistry } from "@/data/pbq";
import { PRO_PRICES, PRO_PRICE_TERMS } from "@/lib/pricing/terms";
import { EXAM_FACTS_CHECKED, SECURITY_PLUS_DOMAIN_CHANGES } from "@/lib/seo/exam-versions";

const CERT = "security-plus-sy0-701";
const DOMAIN_NAMES = [
  "General Security Concepts",
  "Threats, Vulnerabilities, and Mitigations",
  "Security Architecture",
  "Security Operations",
  "Security Program Management and Oversight",
];

/** SY0-701's outline as the bank gives it: CompTIA's domains, every objective, and the exam's labs. */
const STRUCTURE: PathStructure = {
  certSlug: CERT,
  examName: "Security+",
  examCode: "SY0-701",
  domains: DOMAIN_NAMES.map((title, k) => ({
    number: `${k + 1}.0`,
    title,
    weight: SECURITY_PLUS_DOMAIN_CHANGES[k].sy0701,
    objectives: Object.entries(OBJECTIVE_TITLES[CERT])
      .filter(([code]) => code.startsWith(`${k + 1}.`))
      .map(([code, name]) => ({ code, title: name })),
  })),
  library: labLibrary(pbqRegistry[CERT]),
};
const OBJECTIVES = Object.keys(OBJECTIVE_TITLES[CERT]).length;
const LABS = pbqRegistry[CERT].length;

const ROWS: InventoryRow[] = [
  ["security-plus-sy0-801", "Security+", "SY0-801", 1008, "27 objectives", 20, "/security-plus-sy0-801-practice-test"],
  ["security-plus-sy0-701", "Security+", "SY0-701", 842, "28 objectives", 19, "/security-plus-practice-test"],
  ["network-plus-n10-009", "Network+", "N10-009", 617, "27 topics", 20, "/network-plus-practice-test"],
  ["a-plus-core1-220-1201", "A+ Core 1", "220-1201", 651, "27 objectives", 17, "/a-plus-core-1-practice-test"],
  ["a-plus-core2-220-1202", "A+ Core 2", "220-1202", 719, "36 objectives", 17, "/a-plus-core-2-practice-test"],
].map(([cert, name, code, questions, objectives, labs, href]) => ({
  cert: String(cert),
  name: String(name),
  code: String(code),
  questions: Number(questions),
  objectives: String(objectives),
  labs: Number(labs),
  exam: { href: String(href), label: "90 questions in 90 minutes" },
  path: `/path/${cert}`,
}));

const story = (n: number) => ({ id: `t${n}`, quote: `Story number ${n}.`, displayName: `Person ${n}`, certName: "Security+" });

const SOURCE = readFileSync(join(process.cwd(), "src/app/(marketing)/page.tsx"), "utf8");
const HOME_SOURCES = ["src/app/(marketing)/page.tsx", "src/components/home/Method.tsx", "src/components/home/Inventory.tsx", "src/components/home/Plan.tsx"].map(
  (file) => [file, readFileSync(join(process.cwd(), file), "utf8")] as const
);

const flat = (el: Element | null | undefined) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();

async function served(): Promise<{ body: HTMLElement; html: string; text: string }> {
  const html = renderToString(await Page());
  const body = new DOMParser().parseFromString(html, "text/html").body;
  return { body, html, text: flat(body) };
}

/** The section that a heading opens. */
function section(body: HTMLElement, heading: string): HTMLElement {
  const h2 = [...body.querySelectorAll("h2")].find((h) => flat(h) === heading);
  if (!h2) throw new Error(`No section is headed "${heading}".`);
  return h2.closest("section") as HTMLElement;
}

/** What each band of the page is laid on, from the top: paper, the desk's grey, or the navy sheet. */
function grounds(body: HTMLElement): string[] {
  const bands: { owner: Element; ground: string }[] = [];
  for (const s of body.querySelectorAll("section")) {
    const owner = s.closest(".cb-sheet, .bg-surface") ?? s;
    const ground = owner.classList.contains("cb-sheet") ? "navy" : owner.classList.contains("bg-surface") ? "desk" : "paper";
    // Two sections laid on one band (quality, then the word to colleges) are one band.
    if (bands.at(-1)?.owner !== owner) bands.push({ owner, ground });
  }
  return bands.map((b) => b.ground);
}

beforeEach(() => {
  data.testimonials = [];
  data.rows = ROWS;
  data.structure = STRUCTURE;
  data.fail = null;
  data.structureFor = [];
});

describe("the home page below its first section", () => {
  it("sets out its sections in one order, each under a heading on the type scale", async () => {
    const { body } = await served();
    const headings = [...body.querySelectorAll("h2")];
    expect(headings.map((h) => flat(h))).toEqual([
      "Choose your exam to begin.",
      "What each exam includes",
      "How CertBench works",
      "Quality and accuracy",
      "For colleges and training providers",
      "Pricing",
      "Choose your exam to begin.",
    ]);
    expect(body.querySelectorAll("h1")).toHaveLength(1);
    // A section's heading is the section size; the closing band's is the kit's own, one size down.
    expect(headings.slice(1, 6).map((h) => h.className)).toEqual(Array(5).fill("cb-section"));
    expect(headings.at(-1)?.className).toContain("cb-subsection");
    // Under them, the three parts of the method and the two plans.
    expect([...body.querySelectorAll("h3")].map((h) => [flat(h), h.className])).toEqual([
      ["Study one objective at a time.", "cb-subsection"],
      ["Practice in the hands-on labs.", "cb-subsection"],
      ["Take a full-length practice exam.", "cb-subsection"],
      ["Free", "text-body font-semibold"],
      ["Pro", "text-body font-semibold"],
    ]);
  });

  it("takes its examples from Security+ SY0-701 and names that version with every count", async () => {
    const { text } = await served();
    expect(data.structureFor).toEqual([CERT]);
    expect(text).toContain("Preparation has three parts. Each part is shown here with an example from Security+ SY0-701.");
    expect(text).toContain(`The study path takes the ${OBJECTIVES} Security+ SY0-701 objectives in CompTIA's order.`);
    expect(text).toContain(`CertBench has ${LABS} hands-on labs for Security+ SY0-701`);
    expect(text).toContain(`These are 5 of the ${LABS} Security+ SY0-701 labs.`);
    expect(text).toMatch(/The Security\+ SY0-701 study path has \d+ steps, from the first question to a full practice exam\./);
    expect(text).toContain("Domain 1: General Security Concepts");
    expect(text).toContain("12% of the exam. 1 of 4 complete.");
  });

  it("says how to read the table: what is free, and that the two Security+ rows overlap", async () => {
    const { body } = await served();
    const part = section(body, "What each exam includes");
    expect(flat(part.querySelector("p"))).toBe(
      "CertBench holds a question bank, hands-on labs and a full-length practice exam for each exam in this table. " +
        `One practice exam is free for each exam. For Security+, Network+, A+ Core 1 and A+ Core 2, ${FREE_LAB_COUNT} labs are free.`
    );
    expect(part.querySelectorAll("table")).toHaveLength(1);
    // The caution is read with the figures: it stands directly under the table.
    const note = part.querySelector("table")?.parentElement?.nextElementSibling;
    expect(flat(note)).toBe(
      "Most of the questions and labs for Security+ SY0-801 are shared with SY0-701, so the two Security+ rows should not be added together."
    );
    // An exam code is kept whole where a narrow screen breaks the line.
    expect([...(note?.querySelectorAll("span.whitespace-nowrap") ?? [])].map((s) => s.textContent)).toEqual([
      "SY0-801",
      "SY0-701",
    ]);
    expect(flat(part)).not.toContain("its own question bank");
  });

  it("states what can be checked about quality, with the date of the last check of the exam facts", async () => {
    const { body } = await served();
    const part = section(body, "Quality and accuracy");
    expect([...part.querySelectorAll("dt")].map((dt) => flat(dt))).toEqual([
      "Questions are written for CertBench.",
      "Every answer is explained.",
      "Exam facts carry a date.",
      "CertBench is independent.",
    ]);
    expect(flat(part)).toContain(
      `Exam versions, domain weights and retirement dates were last checked against CompTIA's own exam pages on ${EXAM_FACTS_CHECKED}.`
    );
    expect(flat(part)).toContain("CertBench is not affiliated with or endorsed by CompTIA.");
    expect(flat(part)).not.toContain("Exam facts are dated");
  });

  it("gives the price in the words of the pricing terms: every plan, the currency and the regional adjustment", async () => {
    const { body } = await served();
    const part = section(body, "Pricing");
    expect(flat(part.querySelector("p"))).toBe(
      `CertBench is free to start, and you can decide later whether to pay. ${PRO_PRICE_TERMS}`
    );
    expect(flat(part)).toContain(
      `Each month. The price is ${PRO_PRICES.quarterly} every three months, or ${PRO_PRICES.annual} a year.`
    );
    const [free, pro] = [...part.querySelectorAll("h3")].map((h) => h.parentElement as HTMLElement);
    expect(flat(free)).toContain("$0No payment card is required.");
    expect([...free.querySelectorAll("li")].map((li) => flat(li))).toEqual([
      "One full-length practice exam of 90 questions in 90 minutes",
      `${FREE_LAB_COUNT} hands-on labs for each exam`,
      "The introductory questions, your first objective and the readiness checkpoint",
    ]);
    expect(flat(pro)).toContain(PRO_PRICES.monthly);
    expect([...pro.querySelectorAll("li")].map((li) => flat(li))).toEqual([
      "The whole study path, covering every exam objective",
      "Every hands-on lab, and new timed practice exams",
      "Review of the questions that you answered incorrectly",
    ]);
    // No price of Pro is typed by hand in the home page's files.
    for (const [file, source] of HOME_SOURCES) {
      expect(source.match(/\$\d{2,}/g) ?? [], file).toEqual([]);
    }
  });

  it("ends on the navy band, set left, with the one decision the page asks for", async () => {
    const { body } = await served();
    const sections = [...body.querySelectorAll("section")];
    const band = sections.at(-1) as HTMLElement;
    expect(band.classList.contains("cb-sheet")).toBe(true);
    expect(band.nextElementSibling).toBeNull();
    expect(flat(band.querySelector("h2"))).toBe("Choose your exam to begin.");
    const links = [...band.querySelectorAll("a")];
    expect(links.map((a) => [flat(a), a.getAttribute("href")])).toEqual([["Start for free", "/start"]]);
    // Set left and run from one side of the window to the other: not a centred, rounded card.
    expect(band.outerHTML).toContain("text-left");
    expect(band.outerHTML).not.toMatch(/text-center|justify-items-center/);
    expect(band.className).not.toMatch(/rounded|max-w-/);
    // The section before it ends in its own space, so the band adds none.
    expect(band.className).toContain("mt-0");
    expect(band.className).not.toContain("mt-16");
    // It is the kit's band, the same one that closes every other public page.
    expect(SOURCE).toContain('<CtaBand title="Choose your exam to begin."');
  });

  it("keeps the arrow for the way onto the study path: one below the first section, on the closing button", async () => {
    const { body, html } = await served();
    expect(html.split("lucide-arrow-right").length - 1).toBe(1);
    expect(section(body, "Pricing").nextElementSibling?.querySelector("a svg")).not.toBeNull();
    for (const [file, source] of HOME_SOURCES) {
      expect(source, file).not.toMatch(/\bArrow(Right|UpRight)\b/);
    }
    // Every other link is an underlined text link.
    const textLinks = ["Read how CertBench is made", "Read the information for educators", "View pricing"];
    const found = [...body.querySelectorAll("a")].filter((a) => textLinks.includes(flat(a)));
    expect(found.map((a) => [flat(a), a.getAttribute("href")])).toEqual([
      ["Read how CertBench is made", "/about"],
      ["Read the information for educators", "/educators"],
      ["View pricing", "/pricing"],
    ]);
    for (const a of found) {
      expect(a.className).toContain("cb-link");
      expect(a.querySelector("svg")).toBeNull();
    }
  });

  it("lays paper and desk by turns down the page, and gives every section the same space", async () => {
    const { body } = await served();
    expect(grounds(body)).toEqual(["paper", "desk", "paper", "desk", "paper", "navy"]);
    for (const heading of ["What each exam includes", "How CertBench works", "Quality and accuracy", "Pricing"]) {
      const classes = section(body, heading).className.split(/\s+/);
      expect(classes, heading).toEqual(expect.arrayContaining(["py-16", "sm:py-24"]));
    }
    // The word to colleges is the last row of the grey band: the same space, above and below its rule.
    const colleges = section(body, "For colleges and training providers");
    expect(colleges.className.split(/\s+/)).toEqual(expect.arrayContaining(["pb-16", "sm:pb-24"]));
    expect(colleges.querySelector(".border-t")?.className.split(/\s+/)).toEqual(expect.arrayContaining(["pt-16", "sm:pt-24"]));
    expect(colleges.parentElement).toBe(section(body, "Quality and accuracy").parentElement);
    expect(colleges.parentElement?.classList.contains("bg-surface")).toBe(true);
  });

  it("uses two column splits and no other: equal columns beside a figure, and a narrower one beside a list", () => {
    const allowed = ["lg:grid-cols-2", "lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]"];
    const used = new Set<string>();
    for (const [file, source] of HOME_SOURCES) {
      const splits = [...new Set(source.match(/\blg:grid-cols-[^\s"'`]+/g) ?? [])];
      expect(splits.filter((s) => !allowed.includes(s)), file).toEqual([]);
      splits.forEach((s) => used.add(s));
    }
    expect([...used].sort()).toEqual([...allowed].sort());
    // No row is turned round.
    for (const [file, source] of HOME_SOURCES) expect(source, file).not.toMatch(/\bflip\b|lg:order-|flex-row-reverse/);
  });

  it("shows what people who passed have said only when there are three stories, and keeps the bands in turn", async () => {
    data.testimonials = [story(1), story(2)];
    expect((await served()).text).not.toContain("What people who passed have said");

    data.testimonials = [story(1), story(2), story(3)];
    const { body } = await served();
    const headings = [...body.querySelectorAll("h2")].map((h) => flat(h));
    expect(headings.slice(4)).toEqual([
      "For colleges and training providers",
      "What people who passed have said",
      "Pricing",
      "Choose your exam to begin.",
    ]);
    expect(grounds(body)).toEqual(["paper", "desk", "paper", "desk", "paper", "desk", "navy"]);
    expect(section(body, "Pricing").classList.contains("bg-surface")).toBe(true);
  });

  it("stops the render when a read fails, so that the last good page stays in place", async () => {
    for (const read of ["inventory", "structure", "testimonials"] as const) {
      data.fail = read;
      await expect(Page(), read).rejects.toThrow("The database could not be reached.");
    }
  });

  it("is rebuilt once a day, and is the canonical page for the site's root", () => {
    expect(revalidate).toBe(86400);
    expect(metadata.alternates.canonical).toBe("/");
  });

  it("does not keep a list of exam facts of its own", () => {
    // Domain weights and names come with the outline (src/server/path/inventory.ts).
    expect(SOURCE).not.toMatch(/weight:\s*\d/);
    expect(SOURCE).not.toMatch(/const DOMAINS\b/);
    for (const name of ["Threats and mitigations", "Program oversight"]) expect(SOURCE).not.toContain(name);
  });
});
