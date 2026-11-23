import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Who may open a signed-in page is decided twice: by the proxy, and again by
 * the page itself. A page under (workspace) must not depend on the proxy
 * alone, so every one of them asks `requireProPage()` (or `requireUserPage()`
 * for the one page that is open to every account) before it reads anything.
 *
 * The same helpers share one session check with the layout, where each page
 * used to build its own client and ask the sign-in service again.
 */

const ROOT = join(process.cwd(), "src", "app", "(workspace)");

function pages(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "__tests__") pages(path, out);
    } else if (entry.name === "page.tsx") {
      out.push(path);
    }
  }
  return out;
}

const rel = (file: string) => relative(ROOT, file).replace(/\\/g, "/");

/** Open to every signed-in account: the proxy's PRO_EXEMPT_PREFIXES that have a page here. */
const OPEN_TO_EVERY_ACCOUNT = ["upgrade/page.tsx"];
/** Reads nothing and shows nothing: it only sends an old address on to its new one, which has its own gate. */
const REDIRECT_ONLY = ["drills/page.tsx"];

describe("the signed-in pages decide for themselves who may open them", () => {
  const all = pages(ROOT);

  it("finds the pages", () => {
    expect(all.length).toBeGreaterThanOrEqual(18);
  });

  it("asks for Pro on every page except the billing page", () => {
    const missing = all
      .filter((file) => !OPEN_TO_EVERY_ACCOUNT.includes(rel(file)) && !REDIRECT_ONLY.includes(rel(file)))
      .filter((file) => !/await requireProPage\(\)/.test(readFileSync(file, "utf8")))
      .map(rel);
    expect(missing).toEqual([]);
  });

  it("asks only for a signed-in account on the billing page", () => {
    for (const name of OPEN_TO_EVERY_ACCOUNT) {
      const source = readFileSync(join(ROOT, ...name.split("/")), "utf8");
      expect(source).toMatch(/await requireUserPage\(\)/);
      expect(source).not.toMatch(/requireProPage/);
    }
  });

  it("keeps the redirect-only page free of data", () => {
    for (const name of REDIRECT_ONLY) {
      const source = readFileSync(join(ROOT, ...name.split("/")), "utf8");
      expect(source).not.toMatch(/@\/server\//);
    }
  });

  it("builds no client and makes no session check of its own in a page or in the layout", () => {
    const own = [...all, join(ROOT, "layout.tsx")]
      .filter((file) => /createClient\(|auth\.getUser\(/.test(readFileSync(file, "utf8")))
      .map(rel);
    expect(own).toEqual([]);
  });

  it("shares the layout's session check with the page under it", () => {
    const layout = readFileSync(join(ROOT, "layout.tsx"), "utf8");
    expect(layout).toMatch(/await getPageSession\(\)/);
  });

  it("checks the role as well on the owner's pages", () => {
    for (const file of all.filter((f) => rel(f).startsWith("admin/"))) {
      const source = readFileSync(file, "utf8");
      expect(source).toMatch(/profile\?\.role !== "admin"\) notFound\(\)/);
    }
  });
});
