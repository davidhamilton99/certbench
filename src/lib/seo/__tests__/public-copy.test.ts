import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The public pages describe the guided path, not the workspace it replaced. A
 * visitor promised the old one-time 25-question diagnostic or a plan rebuilt
 * each day looked for them and found the path instead (PRs #89–#119). Every
 * file a public page is built from is checked here, the path's own included.
 */
const ROOT = process.cwd();
const PUBLIC_COPY = [
  "src/app/(marketing)",
  "src/app/(path)",
  "src/app/readiness",
  "src/app/share",
  "src/app/layout.tsx",
  "src/app/opengraph-image.tsx",
  "src/components/marketing",
  "src/components/path",
  "src/lib/seo",
  "public/llms.txt",
];

const OLD_WORKSPACE: { claim: string; pattern: RegExp }[] = [
  { claim: "the diagnostic exam", pattern: /diagnostic/i },
  {
    claim: "a daily plan",
    pattern: /daily (?:adaptive |study )?plan|adaptive daily|plans? each day|what to study (?:each|every) day|rebuilt daily/i,
  },
  { claim: "a personalised plan", pattern: /personali[sz]ed (?:daily |study )?plan/i },
  { claim: "the old confidence-penalised score", pattern: /confidence[- ]penali[sz]ed/i },
];

function files(path: string): string[] {
  if (!statSync(path).isDirectory()) return [path];
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = join(path, entry.name);
    if (entry.isDirectory()) return entry.name === "__tests__" ? [] : files(child);
    return /\.(tsx?|txt)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [child] : [];
  });
}

const copy = PUBLIC_COPY.flatMap((p) => files(join(ROOT, p))).map((path) => ({
  path: relative(ROOT, path).replace(/\\/g, "/"),
  text: readFileSync(path, "utf8"),
}));

describe("public copy", () => {
  it("covers the pages that pitch the product", () => {
    const paths = copy.map((c) => c.path);
    expect(paths).toContain("src/app/(marketing)/help/page.tsx");
    expect(paths).toContain("src/app/(marketing)/pricing/page.tsx");
    expect(paths).toContain("src/lib/seo/comparison-pages.ts");
    expect(paths).toContain("src/lib/seo/cert-pages.ts");
    expect(paths).toContain("public/llms.txt");
  });

  it("never promises the old workspace's diagnostic or daily plan", () => {
    const found = copy.flatMap(({ path, text }) =>
      OLD_WORKSPACE.flatMap(({ claim, pattern }) => {
        const match = text.match(pattern);
        return match ? [`${path}: ${claim} ("${match[0]}")`] : [];
      })
    );
    expect(found).toEqual([]);
  });
});
