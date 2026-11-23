import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The two reads of the database, each of which a test can make fail.
const db = vi.hoisted(() => ({
  objectivePages: vi.fn(async () => [{ cert: "security-plus-sy0-701", code: "1-2" }]),
  readinessCerts: vi.fn(async () => [{ cert: "security-plus-sy0-701" }]),
}));
vi.mock("@/server/seo/objective-data", () => ({ listObjectivePages: db.objectivePages }));
vi.mock("@/server/seo/readiness-check-data", () => ({ listReadinessCheckCerts: db.readinessCerts }));

import { CERT_PAGES_UPDATED_ISO, PBQ_EXAMPLE_PAGES, PRACTICE_TEST_PAGES } from "@/lib/seo/cert-pages";
import { COMPARISON_PAGES_UPDATED_ISO, ROUNDUPS, VS_PAGES } from "@/lib/seo/comparison-pages";
import { SY0_801_PATH, SY0_801_UPDATED_ISO } from "@/lib/seo/exam-versions";
import { ABOUT_PAGES_UPDATED_ISO, PRICING_PAGE_UPDATED_ISO } from "@/lib/seo/page-dates";
import sitemap from "../sitemap";

const paths = (urls: { url: string }[]) => urls.map((u) => u.url.replace("https://certbench.dev", ""));

/** Each path's date as the sitemap prints it: "2026-11-22". */
async function dates(): Promise<Map<string, string>> {
  const urls = await sitemap();
  return new Map(
    urls.map((u) => [u.url.replace("https://certbench.dev", ""), new Date(u.lastModified!).toISOString().slice(0, 10)])
  );
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** The "Last updated" date a legal page prints, as "2026-11-22". */
function lastUpdatedOn(page: string): string | null {
  const text = readFileSync(join(process.cwd(), "src/app/(marketing)", page, "page.tsx"), "utf8");
  const found = text.match(/Last updated:\s*([A-Z][a-z]+)\s+(\d{1,2}),\s+(\d{4})/);
  if (!found) return null;
  const month = MONTHS.indexOf(found[1]) + 1;
  return `${found[3]}-${String(month).padStart(2, "0")}-${found[2].padStart(2, "0")}`;
}

describe("sitemap", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-01-01"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("lists the pages worth finding in search", async () => {
    const urls = paths(await sitemap());
    expect(urls).toEqual(
      expect.arrayContaining([
        "",
        "/pricing",
        "/help",
        "/about",
        "/educators",
        "/contact",
        "/privacy",
        "/terms",
        "/security-plus-practice-test",
        "/a-plus-core-1-pbq-examples",
        "/a-plus-core-2-pbq-examples",
        "/security-plus-sy0-801-vs-sy0-701",
        "/security-plus-sy0-801",
        "/security-plus-sy0-801-practice-test",
        "/security-plus-sy0-801-ai-practice-questions",
        "/objectives/security-plus-sy0-701",
        "/objectives/security-plus-sy0-701/1-2",
        "/tools/subnet-calculator",
        "/readiness-check/security-plus-sy0-701",
      ])
    );
  });

  it("lists every page of the copy tables", async () => {
    const urls = paths(await sitemap());
    const expected = [
      ...PRACTICE_TEST_PAGES.map((p) => `/${p.path}`),
      ...PBQ_EXAMPLE_PAGES.map((p) => `/${p.path}`),
      ...ROUNDUPS.map((r) => `/${r.path}`),
      ...VS_PAGES.map((p) => `/compare/${p.slug}`),
    ];
    expect(expected.filter((path) => !urls.includes(path))).toEqual([]);
  });

  it("leaves out the app screens and the unsubscribe page, which are noindex", async () => {
    const urls = paths(await sitemap());
    expect(urls.filter((u) => /^\/(path|login|register|start|unsubscribe)(\/|$)/.test(u))).toEqual([]);
  });

  it("has no duplicate URLs", async () => {
    const urls = paths(await sitemap());
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("never claims a page changed just because the sitemap was requested", async () => {
    for (const { url, lastModified } of await sitemap()) {
      expect(new Date(lastModified!).getFullYear(), url).toBeLessThan(2030);
    }
  });

  it("dates a page from the constant kept beside its words", async () => {
    const date = await dates();
    for (const page of [...PRACTICE_TEST_PAGES, ...PBQ_EXAMPLE_PAGES]) {
      expect(date.get(`/${page.path}`), page.path).toBe(CERT_PAGES_UPDATED_ISO);
    }
    for (const guide of ROUNDUPS) expect(date.get(`/${guide.path}`), guide.path).toBe(COMPARISON_PAGES_UPDATED_ISO);
    for (const page of VS_PAGES) expect(date.get(`/compare/${page.slug}`), page.slug).toBe(COMPARISON_PAGES_UPDATED_ISO);
    expect(date.get(SY0_801_PATH)).toBe(SY0_801_UPDATED_ISO);
  });

  // The sitemap is made once for each deployment. A read that fails must stop
  // the build, so that the previous deployment stays live with its whole
  // sitemap: swallowed, it would publish one without 122 pages.
  it.each([
    ["the objective pages", () => db.objectivePages.mockRejectedValueOnce(new Error("read failed"))],
    ["the readiness checks", () => db.readinessCerts.mockRejectedValueOnce(new Error("read failed"))],
  ])("fails, and publishes nothing, when %s cannot be read", async (_, fail) => {
    fail();
    await expect(sitemap()).rejects.toThrow("read failed");
  });

  it("gives /pricing the date that the page prints, once", async () => {
    const urls = paths(await sitemap());
    expect(urls.filter((u) => u === "/pricing")).toHaveLength(1);
    expect((await dates()).get("/pricing")).toBe(PRICING_PAGE_UPDATED_ISO);
    const source = readFileSync(join(process.cwd(), "src/app/(marketing)/pricing/page.tsx"), "utf8");
    expect(source).toContain("This page was last updated on {longDate(PRICING_PAGE_UPDATED_ISO)}.");
  });

  it("gives /about and /educators the date that each page prints", async () => {
    const date = await dates();
    for (const page of ["about", "educators"]) {
      expect(date.get(`/${page}`), page).toBe(ABOUT_PAGES_UPDATED_ISO);
      const source = readFileSync(join(process.cwd(), "src/app/(marketing)", page, "page.tsx"), "utf8");
      // The page prints the same constant, so the reader and the crawler are told one day.
      expect(source, page).toContain("This page was last updated on {longDate(ABOUT_PAGES_UPDATED_ISO)}.");
    }
  });

  it("gives the terms and the privacy policy the date printed on the page", async () => {
    const date = await dates();
    for (const page of ["terms", "privacy"]) {
      const printed = lastUpdatedOn(page);
      expect(printed, `${page}: the page prints "Last updated: <Month> <day>, <year>"`).not.toBeNull();
      expect(date.get(`/${page}`), page).toBe(printed);
    }
  });
});
