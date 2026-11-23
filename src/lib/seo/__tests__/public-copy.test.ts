import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The public pages describe the study path, not the workspace it replaced. A
 * visitor promised the old one-time 25-question diagnostic or a plan rebuilt
 * each day looked for them and found the path instead (PRs #89–#119). Every
 * file a public page is built from is checked here, the path's own included.
 */
const ROOT = process.cwd();
const PUBLIC_COPY = [
  "src/app/(marketing)",
  "src/app/(path)",
  // Where a signed-in visitor buys Pro: it must sell what the pricing page sells.
  "src/app/(workspace)/upgrade",
  "src/components/billing",
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
  { claim: "a personalized plan", pattern: /personali[sz]ed (?:daily |study )?plan/i },
  { claim: "the old confidence-penalized score", pattern: /confidence[- ]penali[sz]ed/i },
];

/**
 * The AI study-set tool (questions written from your notes) is no longer part
 * of what CertBench offers (Nov 2026), so no page may sell it.
 */
const AI_STUDY_SETS =
  /AI (?:question |quiz )?generation|AI study sets?|(?:questions|quizzes|study sets?) (?:written |generated )?from your (?:own )?notes/i;

/**
 * The terms and the privacy policy still say what happens to the study sets
 * that members made with the tool, and what happened to uploads while it was
 * offered. Those clauses are in the past tense. Neither page may list the tool
 * among the things the Service provides, or say that uploads are sent to an AI
 * provider today.
 */
const LEGAL_PAGES = ["src/app/(marketing)/terms/page.tsx", "src/app/(marketing)/privacy/page.tsx"];
const TOOL_AS_CURRENT: { claim: string; pattern: RegExp }[] = [
  { claim: "the tool listed as part of the Service", pattern: /AI-powered question generation/i },
  { claim: "the tool described as in use", pattern: /uses artificial intelligence to generate/i },
  { claim: "uploads sent to an AI provider today", pattern: /(?:are|is|will be|may be) sent to (?:our|an|the) AI provider/i },
  { claim: "uploads sent to an AI provider today", pattern: /sends? your uploaded study materials to/i },
  { claim: "an AI provider named as a current recipient", pattern: /Anthropic:\s*AI/i },
];

function files(path: string): string[] {
  if (!statSync(path).isDirectory()) return [path];
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = join(path, entry.name);
    if (entry.isDirectory()) return entry.name === "__tests__" ? [] : files(child);
    return /\.(tsx?|txt)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [child] : [];
  });
}

// A sentence in a page's source runs over several lines, so each file is read as one line of text.
const copy = PUBLIC_COPY.flatMap((p) => files(join(ROOT, p))).map((path) => ({
  path: relative(ROOT, path).replace(/\\/g, "/"),
  text: readFileSync(path, "utf8").replace(/\s+/g, " "),
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

  it("never sells the AI study-set tool, on any page, the terms and the privacy policy included", () => {
    const found = copy.flatMap(({ path, text }) => {
      const match = text.match(AI_STUDY_SETS);
      return match ? [`${path}: "${match[0]}"`] : [];
    });
    expect(found).toEqual([]);
  });

  it("describes the retired tool in the terms and the privacy policy only as something that has ended", () => {
    const legal = copy.filter(({ path }) => LEGAL_PAGES.includes(path));
    expect(legal.map((c) => c.path).sort()).toEqual([...LEGAL_PAGES].sort());

    const found = legal.flatMap(({ path, text }) =>
      TOOL_AS_CURRENT.flatMap(({ claim, pattern }) => {
        const match = text.match(pattern);
        return match ? [`${path}: ${claim} ("${match[0]}")`] : [];
      })
    );
    expect(found).toEqual([]);

    // A page that still mentions the tool says that it has been retired.
    for (const { path, text } of legal) {
      if (/artificial intelligence to generate|AI-generated/i.test(text)) expect(text, path).toMatch(/\bretired\b/);
    }
  });
});
