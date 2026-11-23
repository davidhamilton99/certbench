// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";

vi.mock("@/lib/analytics", () => ({ track: vi.fn(), identifyUser: vi.fn() }));

import { RoundupLanding } from "@/components/marketing/RoundupLanding";
import { longDate } from "@/core/path/versions";
import { COMPARISON_PAGES_UPDATED_ISO, ROUNDUPS, type RoundupData } from "@/lib/seo/comparison-pages";

/** The page as served, parsed: what search, an AI answer and a screen reader are given. */
function served(data: RoundupData): Document {
  return new DOMParser().parseFromString(renderToString(<RoundupLanding data={data} />), "text/html");
}

const text = (el: Element | null | undefined) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();

/** The section of the guide for one product: the one whose heading is its name. */
function entry(doc: Document, name: string): Element {
  const heading = [...doc.querySelectorAll("section > div > h2")].find((h) => text(h) === name);
  if (!heading) throw new Error(`No section is headed "${name}".`);
  return heading.closest("section")!;
}

const GUIDE: RoundupData = {
  path: "best-security-plus-practice-tests",
  metaTitle: "Best Security+ practice tests and exams in 2026",
  metaDescription: "CertBench publishes this guide and is one of the products in it.",
  h1: "The best Security+ practice tests and exams in 2026",
  intro: ["A disclosure first: CertBench publishes this guide.", "The second paragraph of the introduction."],
  tools: [
    {
      name: "Checked Product",
      price: "$99 a year for each exam",
      source: "https://vendor.example/product",
      checked: "November 22, 2026",
      bestFor: "A final practice exam in the last weeks",
      strengths: ["A realistic simulation", "Detailed explanations"],
      weaknesses: ["No study system"],
      compareSlug: "certbench-vs-boson",
    },
    {
      name: "CertBench",
      price: "Pro costs $19 a month, $39 every three months, or $99 a year",
      bestFor: "A study path through every objective",
      strengths: ["A study path for each exam"],
      weaknesses: ["A newer question bank than the established products"],
      isSelf: true,
    },
    {
      // A price that was not read at the source says where to find it (comparison-pages.ts).
      name: "Unchecked Product",
      price: "See the vendor's own site for the current price",
      bestFor: "When an employer pays",
      strengths: ["The vendor's own content"],
      weaknesses: ["Practice tests rather than a study path"],
    },
    {
      // A date with no address behind it is not a check, and an address with no date is not one either.
      name: "Half Checked",
      price: "Free",
      checked: "November 22, 2026",
      bestFor: "Light practice",
      strengths: ["Free quizzes"],
      weaknesses: ["No tracking"],
    },
  ],
  faqs: [{ question: "Which is best?", answer: "CertBench publishes this guide, so this answer is its own view." }],
  practiceTestPath: "security-plus-practice-test",
};

describe("a product in the guide", () => {
  it("lists its strengths and its limitations as two lists, each under its own heading", () => {
    const doc = served(GUIDE);
    const product = entry(doc, "Checked Product");
    const headings = [...product.querySelectorAll("h3")];
    expect(headings.map(text)).toEqual(["Strengths", "Limitations"]);
    const [strengths, limitations] = headings.map((h) => h.parentElement!.querySelector("ul")!);
    expect([...strengths.querySelectorAll("li")].map(text)).toEqual(["A realistic simulation", "Detailed explanations"]);
    expect([...limitations.querySelectorAll("li")].map(text)).toEqual(["No study system"]);
    // The two lists are separate lists: a limitation is never an item of the strengths.
    expect(strengths).not.toBe(limitations);
    expect(text(strengths)).not.toContain("No study system");
  });

  it("tells them apart in words: the marks beside the items only decorate", () => {
    const doc = served(GUIDE);
    const product = entry(doc, "Checked Product");
    for (const icon of product.querySelectorAll("svg")) {
      expect(icon.closest("[aria-hidden]")).not.toBeNull();
    }
    // The items of both lists are set alike, so the difference is not one of colour alone.
    const classes = [...product.querySelectorAll("li")].map((li) => li.className);
    expect(new Set(classes).size).toBe(1);
  });

  it("gives its price and what it suits as labelled facts", () => {
    const product = entry(served(GUIDE), "Unchecked Product");
    const facts = product.querySelector("dl")!;
    expect([...facts.querySelectorAll("dt")].map(text)).toEqual(["Price", "Most suitable for"]);
    expect([...facts.querySelectorAll("dd")].map(text)).toEqual([
      "See the vendor's own site for the current price",
      "When an employer pays",
    ]);
  });

  // Every product's heading is in ink. A heading that was a link only where a
  // price had been read made some products look favoured (DE-07).
  it("heads every product in plain text, and links the vendor's page from the price only where the price was read there", () => {
    const doc = served(GUIDE);
    for (const tool of GUIDE.tools) expect(entry(doc, tool.name).querySelector("h2 a"), tool.name).toBeNull();

    const checked = entry(doc, "Checked Product");
    expect(text(checked)).toContain("Price checked on November 22, 2026, on the vendor's own page.");
    const link = [...checked.querySelectorAll("dd a")].find((a) => text(a) === "the vendor's own page")!;
    expect(link.getAttribute("href")).toBe("https://vendor.example/product");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(link.className).toContain("cb-link");

    for (const name of ["Unchecked Product", "Half Checked", "CertBench"]) {
      const product = entry(doc, name);
      expect(text(product), name).not.toContain("Price checked on");
      expect(product.querySelector("dd a"), name).toBeNull();
    }
  });

  it("says on CertBench's own entry whose product it is", () => {
    const doc = served(GUIDE);
    expect(text(entry(doc, "CertBench"))).toContain("CertBench publishes this guide, and this is its own product.");
    expect(text(entry(doc, "Checked Product"))).not.toContain("this is its own product");
  });

  it("links the full comparison where there is one", () => {
    const doc = served(GUIDE);
    const link = [...entry(doc, "Checked Product").querySelectorAll("a")].find((a) => text(a).startsWith("Read the full comparison"));
    expect(link?.getAttribute("href")).toBe("/compare/certbench-vs-boson");
    expect(text(link)).toBe("Read the full comparison of Checked Product with CertBench");
    expect(link?.className).toContain("cb-link");
  });
});

describe("the products in brief", () => {
  it("is a plain table of product, price and what each suits, with a header for every row and column", () => {
    const doc = served(GUIDE);
    const table = doc.querySelector("table")!;
    expect([...table.querySelectorAll("thead th")].map(text)).toEqual(["Product", "Price", "Most suitable for"]);
    for (const th of table.querySelectorAll("thead th")) expect(th.getAttribute("scope")).toBe("col");
    const rows = [...table.querySelectorAll("tbody tr")];
    expect(rows.map((row) => text(row.querySelector("th")))).toEqual(GUIDE.tools.map((tool) => tool.name));
    for (const row of rows) expect(row.querySelector("th")?.getAttribute("scope")).toBe("row");
    expect(text(rows[2].querySelectorAll("td")[0])).toBe("See the vendor's own site for the current price");
    expect(text(rows[2].querySelectorAll("td")[1])).toBe("When an employer pays");
    // On a phone a row stacks, and each cell carries its column's name.
    expect([...rows[0].querySelectorAll("td")].map((td) => td.getAttribute("data-label"))).toEqual([
      "Price",
      "Most suitable for",
    ]);
  });

  it("dates a price in the table by the same rule, and leaves the link to the product's own section", () => {
    const rows = [...served(GUIDE).querySelectorAll("table tbody tr")];
    expect(text(rows[0])).toContain("Price checked on November 22, 2026.");
    for (const row of rows.slice(1)) expect(text(row)).not.toContain("Price checked on");
    // One link to the vendor's page for each product, in its own section, and none in the table.
    expect(served(GUIDE).querySelectorAll("table a")).toHaveLength(0);
  });
});

describe("the guide", () => {
  it("has one title, the introduction, and the day its words last changed", () => {
    const doc = served(GUIDE);
    expect([...doc.querySelectorAll("h1")].map(text)).toEqual([GUIDE.h1]);
    expect(text(doc.body)).toContain("A disclosure first: CertBench publishes this guide.");
    expect(text(doc.body)).toContain(`This guide was last updated on ${longDate(COMPARISON_PAGES_UPDATED_ISO)}.`);
  });

  it("describes its products to search as a list without an order, because the publisher is one of them", () => {
    const doc = served(GUIDE);
    const lists = [...doc.querySelectorAll('script[type="application/ld+json"]')]
      .map((s) => JSON.parse(s.textContent ?? "{}"))
      .filter((data) => data["@type"] === "ItemList");
    expect(lists).toHaveLength(1);
    const [list] = lists;
    expect(list.itemListOrder).toBe("https://schema.org/ItemListUnordered");
    expect(list.name).toBe(GUIDE.h1);
    expect(list.description).toBe(GUIDE.metaDescription);
    expect(list.numberOfItems).toBe(GUIDE.tools.length);
    expect(list.itemListElement.map((item: { name: string }) => item.name)).toEqual(GUIDE.tools.map((t) => t.name));
    for (const item of list.itemListElement) expect(item).not.toHaveProperty("position");
    expect(JSON.stringify(list)).not.toMatch(/rating/i);
  });

  it("ends on the study path, set left, and appends no arrow to a text link", () => {
    const doc = served(GUIDE);
    // A guide for one exam names that exam's study path on its button.
    const start = [...doc.querySelectorAll("a")].find((a) => text(a) === "Start the Security+ study path");
    expect(start?.getAttribute("href")).toBe("/path/security-plus-sy0-701");
    expect(doc.body.innerHTML).not.toMatch(/text-center/);
    // The one arrow on the page is on the button that starts the study path.
    const arrows = [...doc.querySelectorAll("svg.lucide-arrow-right, svg.lucide-arrow-up-right")];
    expect(arrows).toHaveLength(1);
    expect(arrows[0].closest("a")).toBe(start);
  });
});

describe.each(ROUNDUPS.map((guide) => [guide.path, guide] as const))("%s", (_, guide) => {
  const doc = served(guide);

  it("gives every product both labelled lists", () => {
    for (const tool of guide.tools) {
      const product = entry(doc, tool.name);
      expect([...product.querySelectorAll("h3")].map(text), tool.name).toEqual(["Strengths", "Limitations"]);
      expect(product.querySelectorAll("ul")).toHaveLength(2);
      expect(product.querySelectorAll("li")).toHaveLength(tool.strengths.length + tool.weaknesses.length);
    }
  });

  it("prints a check date for exactly the prices that carry a source and a date", () => {
    const dated = guide.tools.filter((tool) => tool.source && tool.checked);
    for (const tool of guide.tools) {
      const shown = text(entry(doc, tool.name)).includes("Price checked on");
      expect(shown, tool.name).toBe(dated.includes(tool));
    }
    // A date is never set without the page it was read on, and the other way round.
    for (const tool of guide.tools) expect(Boolean(tool.source), tool.name).toBe(Boolean(tool.checked));
  });

  // The A+ guide leads to the list of exams, which carries the one label that
  // every page gives it; a guide for one exam names that exam's study path.
  it("labels the way on by where it leads", () => {
    const card = doc.querySelector("section.cb-sheet")!;
    const link = card.querySelector("a")!;
    const expected: Record<string, [string, string]> = {
      "best-security-plus-practice-tests": ["/path/security-plus-sy0-701", "Start the Security+ study path"],
      "best-network-plus-practice-tests": ["/path/network-plus-n10-009", "Start the Network+ study path"],
      "best-a-plus-practice-tests": ["/start", "Choose your exam"],
    };
    expect([link.getAttribute("href"), text(link)]).toEqual(expected[guide.path]);
  });

  it("discloses that CertBench is its own entry", () => {
    const own = guide.tools.filter((tool) => tool.isSelf);
    expect(own).toHaveLength(1);
    expect(text(entry(doc, own[0].name))).toContain("CertBench publishes this guide, and this is its own product.");
  });

  // The Security+ and A+ steps follow CompTIA's objectives. The Network+ steps
  // follow CertBench's own topics, so its guide does not say "every exam objective".
  it("says what the study path covers in words that are true of the guide's exam", () => {
    const said: Record<string, string> = {
      "best-security-plus-practice-tests": "every exam objective",
      "best-a-plus-practice-tests": "every exam objective",
      "best-network-plus-practice-tests": "every topic",
    };
    const covers = said[guide.path];
    expect(covers, guide.path).toBeDefined();
    const card = text(doc.querySelector("section.cb-sheet"));
    expect(card).toContain(
      `The study path covers ${covers} in short steps, and its readiness checkpoint shows where you stand. The first steps are free.`
    );
    if (covers === "every topic") expect(text(doc.body)).not.toMatch(/every (?:exam )?objective/i);
  });
});

describe("a guide whose exams are not known", () => {
  it("says topic, which is true of every exam", () => {
    const doc = served({ ...GUIDE, practiceTestPath: "no-such-practice-test" });
    expect(text(doc.querySelector("section.cb-sheet"))).toContain("The study path covers every topic in short steps");
  });
});
