// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";

// Server render only: nothing here signs anyone in, counts anything or reaches an API.
vi.mock("@/lib/analytics", () => ({ track: vi.fn(), identifyUser: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

import VsPage from "../[slug]/page";
import { VS_PAGES } from "@/lib/seo/comparison-pages";

const text = (el: Element | null | undefined) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();

async function served(slug: string): Promise<Document> {
  return new DOMParser().parseFromString(renderToString(await VsPage({ params: Promise.resolve({ slug }) })), "text/html");
}

/**
 * The facts file holds competitors' prices and nothing else, so the side by
 * side table says, in its own name, that the competitor's column is
 * CertBench's assessment, apart from a price that was read at its source.
 */
describe.each(VS_PAGES.map((page) => [page.slug, page] as const))("/compare/%s", (slug, page) => {
  it("names its table by whose assessment the competitor's column is", async () => {
    const caption = (await served(slug)).querySelector("table > caption");
    const read = Boolean(page.priceSource && page.priceChecked);
    expect(text(caption)).toBe(
      read
        ? `The ${page.competitorName} column is CertBench's own assessment, except for the price, which CertBench read on the vendor's own page.`
        : `The ${page.competitorName} column is CertBench's own assessment.`
    );
  });
});

describe("the way on from a comparison", () => {
  // Every link to the list of exams carries the one label that every page gives it.
  it("leads to the list of exams under the label that every page gives it", async () => {
    const doc = await served(VS_PAGES[0].slug);
    const start = [...doc.querySelectorAll("section.cb-sheet a")].find((a) => a.getAttribute("href") === "/start");
    expect(text(start)).toBe("Choose your exam");
    expect(text(doc.querySelector("section.cb-sheet p"))).toBe(
      "Choose your exam to start its study path. The first steps are free, and the readiness checkpoint shows where you stand."
    );
  });
});

describe("the comparisons as a set", () => {
  it("include one whose competitor's price could not be read, and one whose price was read", () => {
    expect(VS_PAGES.some((page) => page.priceChecked)).toBe(true);
    expect(VS_PAGES.some((page) => !page.priceChecked)).toBe(true);
  });
});
