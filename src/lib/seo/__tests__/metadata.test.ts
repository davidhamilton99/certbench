import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { pageMetadata } from "../metadata";

/**
 * The root layout's openGraph describes the homepage, and every page that sets
 * none of its own inherits it: og:title and og:url pointed at the homepage on
 * all 149 sitemap URLs until this helper. A public page goes through it.
 */
const MARKETING = join(process.cwd(), "src", "app", "(marketing)");
// The homepage is the one page the root layout's tags are about.
const EXEMPT = new Set(["page.tsx"]);

function pages(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return pages(path);
    return entry.name === "page.tsx" ? [path] : [];
  });
}

describe("pageMetadata", () => {
  it("gives a page its own canonical and social tags", () => {
    const meta = pageMetadata({ title: "Port quiz", description: "Drill ports.", path: "/tools/port-quiz" });
    expect(meta.alternates?.canonical).toBe("/tools/port-quiz");
    expect(meta.openGraph).toMatchObject({
      title: "Port quiz — CertBench",
      description: "Drill ports.",
      url: "/tools/port-quiz",
      images: ["/opengraph-image"],
    });
    expect(meta.twitter).toMatchObject({ title: "Port quiz — CertBench", description: "Drill ports." });
    expect(meta.robots).toBeUndefined();
  });

  it("keeps links followable on a page left out of search", () => {
    const meta = pageMetadata({ title: "Sign in", description: "x", path: "/x", noindex: true });
    expect(meta.robots).toEqual({ index: false, follow: true });
  });

  it("is used by every public marketing page", () => {
    const missing = pages(MARKETING)
      .map((path) => ({ path: relative(MARKETING, path).replace(/\\/g, "/"), text: readFileSync(path, "utf8") }))
      .filter(({ path }) => !EXEMPT.has(path))
      .filter(({ text }) => !text.includes("pageMetadata("))
      .map(({ path }) => path);
    expect(missing).toEqual([]);
  });
});
