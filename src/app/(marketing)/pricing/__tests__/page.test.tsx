// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";

/** The country the request is made from, as the edge network's header gives it. */
const request = vi.hoisted(() => ({ country: null as string | null }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers(request.country ? { "x-vercel-ip-country": request.country } : {}),
}));
// A server render only: nothing is counted and nothing is fetched.
vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));
vi.mock("@/lib/api-client", () => ({ api: vi.fn() }));

import PricingLoading from "../loading";
import PricingPage, { metadata } from "../page";

/** The page as the server sends it to a visitor in `country`, with `plan` in the address. */
async function page(country: string | null, plan?: string): Promise<HTMLElement> {
  request.country = country;
  const root = document.createElement("div");
  root.innerHTML = renderToString(await PricingPage({ searchParams: Promise.resolve(plan ? { plan } : {}) }));
  return root;
}

const text = (el: Element | null | undefined) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
/** The page's opening block: its title and the paragraphs under it. */
const intro = (root: HTMLElement) => root.querySelector("h1")?.parentElement ?? null;
/** The Pro plan's card, found by its heading. */
const proCard = (root: HTMLElement) =>
  [...root.querySelectorAll("h2")].find((h) => h.textContent === "Pro")?.closest("[data-slot='card']") ?? null;

describe("the pricing page", () => {
  it("states the list prices in a sentence that is the same for every country", async () => {
    const home = await page(null);
    const india = await page("IN");
    expect(text(intro(home))).toBe(text(intro(india)));
    expect(text(intro(home))).toContain(
      "CertBench Pro costs $19 a month, $39 every three months, or $99 a year. Prices are in US dollars and are adjusted by region."
    );
    expect(text(intro(home))).toContain("The price shown for your country on this page may be lower.");
    // What CertBench is, in the page's first sentence.
    expect(text(intro(home)?.querySelector("p"))).toBe(
      "CertBench is a study program for the CompTIA Security+, Network+ and A+ exams. It is free to start, and no payment card is required."
    );
  });

  it("says in its description what the body says: three prices, in US dollars, adjusted by region", () => {
    expect(metadata.description).toContain("for $19 a month, $39 every three months, or $99 a year.");
    expect(metadata.description).toContain("Prices are in US dollars and are adjusted by region.");
    expect(metadata.description).toContain("a full-length 90-question practice exam and 12 hands-on labs (PBQs) for each exam");
    expect(metadata.description).not.toMatch(/or \$39 for three months/);
  });

  it("says that Pro covers one exam, and that A+ is two", async () => {
    const root = await page(null);
    expect(text(root)).not.toMatch(/one certification/i);
    expect(text(intro(root))).toContain("A Pro plan covers one exam.");
    const pro = text(proCard(root));
    expect(pro).toContain("The complete study path for one exam.");
    expect(pro).toContain(
      "Pro covers one exam. For A+, Core 1 and Core 2 are separate exams. For Security+, Pro covers both versions, SY0-801 and SY0-701. You can add another exam at any time for a single payment of $39."
    );
  });

  it("names its two plans in headings under the page's one title", async () => {
    const root = await page(null);
    expect([...root.querySelectorAll("h1")].map((h) => h.textContent)).toEqual(["Plans and pricing"]);
    expect([...root.querySelectorAll("h2")].map((h) => h.textContent)).toEqual(["Free", "Pro"]);
  });

  it("gives the price of Pro under its title, then the billing periods, then what is included", async () => {
    const pro = text(proCard(await page(null)));
    const at = (words: string) => {
      expect(pro, words).toContain(words);
      return pro.indexOf(words);
    };
    const price = at("$19 a month, or $39 every three months, or $99 a year.");
    const periods = at("Billing period");
    const button = at("Continue to payment");
    const renewal = at("The plan renews every three months until you cancel.");
    const included = at("Pro includes:");
    expect(price).toBeLessThan(periods);
    expect(periods).toBeLessThan(button);
    expect(button).toBeLessThan(renewal);
    expect(renewal).toBeLessThan(included);
    expect(pro).not.toContain("Get Pro");
  });

  it("shows a visitor in an adjusted country their own price in the plan, with no list price beside it", async () => {
    const root = await page("IN");
    const pro = proCard(root);
    expect(text(pro)).toContain("$7.60 a month, or $15.60 every three months, or $39.60 a year.");
    expect(text(pro)).toContain("for a single payment of $15.60.");
    expect(text(pro)).toContain("Prices are shown in US dollars and are adjusted for your region.");
    expect(text(pro)).not.toMatch(/\$19|\$39(?!\.)|\$99/);
    expect(pro?.innerHTML).not.toMatch(/line-through|text-success|bg-success/);
  });

  it("chooses the billing period named in the address, and three months otherwise", async () => {
    const chosen = (root: HTMLElement) =>
      [...root.querySelectorAll<HTMLInputElement>("input[type='radio']")].filter((r) => r.hasAttribute("checked")).map((r) => r.value);
    expect(chosen(await page(null, "annual"))).toEqual(["annual"]);
    expect(chosen(await page(null, "monthly"))).toEqual(["monthly"]);
    expect(chosen(await page(null))).toEqual(["quarterly"]);
    expect(chosen(await page(null, "weekly"))).toEqual(["quarterly"]);
  });

  it("links the words billing page to the help entry that says how to cancel", async () => {
    const root = await page(null);
    const links = [...root.querySelectorAll("a")].filter((a) => a.textContent === "billing page");
    expect(links.length).toBeGreaterThanOrEqual(2);
    for (const link of links) expect(link.getAttribute("href")).toBe("/help#account");
    // Every link inside a sentence is underlined.
    for (const link of [...root.querySelectorAll("p a")]) expect(link.className).toContain("cb-link");
  });

  it("squares the corners that the rule along the top of the Pro plan meets", async () => {
    const root = await page(null);
    const pro = proCard(root);
    expect(pro?.className).toContain("border-t-[3px]");
    expect(pro?.className).toContain("rounded-t-none");
    const free = [...root.querySelectorAll("h2")].find((h) => h.textContent === "Free")?.closest("[data-slot='card']");
    // The free plan keeps a visible edge all round; its title is set two pixels lower to share the Pro title's line.
    expect(free?.className).not.toContain("border-t-transparent");
    expect(free?.className).toContain("pt-[calc(2rem+2px)]");
  });
});

describe("what is shown while the pricing page is on its way", () => {
  it("is the page's own title and opening paragraphs, as real words, with the wait said to a screen reader", async () => {
    const waiting = document.createElement("div");
    waiting.innerHTML = renderToString(<PricingLoading />);
    const ready = await page(null);
    expect(text(intro(waiting))).toBe(text(intro(ready)));
    expect(waiting.querySelector("h1")?.textContent).toBe("Plans and pricing");
    const status = waiting.querySelector("[role='status']");
    expect(text(status)).toBe("The plans are loading.");
    // Nothing spins, pulses or fades.
    expect(waiting.innerHTML).not.toMatch(/animate-|transition|opacity-0/);
  });
});
