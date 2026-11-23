import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * Rules for the labs, the tools, the drills and Recall, read from their source
 * so that a later edit cannot quietly break them.
 *
 * One scroll offset: the page's `scroll-padding-top` (src/app/globals.css)
 * keeps whatever is scrolled to clear of the sticky header. A `scroll-mt-*` on
 * an element was added on top of it, and a lab then opened about 100 pixels
 * too low with the tiles above it cut by the header.
 *
 * One measure for each size of text: `cb-measure` is the line for 17px text,
 * and 15px text (`text-small`) is set at `cb-measure-sm`, so a line holds
 * about the same number of characters (under 80) at either size.
 *
 * One word for choosing: the site says "Choose", never "Select".
 */
const FILES = [
  "src/components/workspace/LabKit.tsx",
  "src/components/workspace/PbqPlayer.tsx",
  "src/components/workspace/SimMoves.tsx",
  "src/components/workspace/SimCaseFile.tsx",
  "src/components/workspace/SimulationPlayer.tsx",
  "src/components/workspace/ThreatHuntPlayer.tsx",
  "src/components/workspace/TopologyDiagram.tsx",
  "src/components/workspace/TopologyPlayer.tsx",
  "src/components/workspace/pbq-upsell.tsx",
  "src/components/workspace/PbqScenarios.tsx",
  "src/components/marketing/PbqLab.tsx",
  "src/components/marketing/PbqExampleLanding.tsx",
  "src/components/marketing/SubnetCalculator.tsx",
  "src/components/marketing/SubnettingPractice.tsx",
  "src/components/marketing/SubnettingDrill.tsx",
  "src/components/marketing/DrillPlayer.tsx",
  "src/components/marketing/DrillRound.tsx",
  "src/components/marketing/AcronymDrill.tsx",
  "src/components/marketing/PortQuiz.tsx",
  "src/components/recall/RecallSurface.tsx",
  "src/components/recall/RecallPlayer.tsx",
  "src/components/recall/RecallMastery.tsx",
];

const SOURCES = FILES.map((rel) => {
  const path = join(process.cwd(), rel);
  const text = readFileSync(path, "utf8");
  // Every string and every run of text in the file, cooked; comments are not read.
  const strings: string[] = [];
  const file = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node)) return;
    if (node.kind === ts.SyntaxKind.JsxText) strings.push(node.getText());
    else if (
      ts.isStringLiteralLike(node) ||
      node.kind === ts.SyntaxKind.TemplateHead ||
      node.kind === ts.SyntaxKind.TemplateMiddle ||
      node.kind === ts.SyntaxKind.TemplateTail
    ) {
      strings.push((node as ts.StringLiteralLike).text);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return { rel, strings };
});

const offenders = (rule: RegExp) =>
  SOURCES.flatMap(({ rel, strings }) => strings.filter((s) => rule.test(s)).map((s) => `${rel}: ${s.trim()}`));

describe("the labs, tools, drills and Recall: house rules", () => {
  it("reads every file and the strings in it", () => {
    expect(SOURCES).toHaveLength(FILES.length);
    expect(SOURCES.every(({ strings }) => strings.length > 0)).toBe(true);
  });

  it("leaves the scroll offset to the page: no element adds a scroll margin of its own", () => {
    expect(offenders(/(?<![\w-])scroll-mt-/)).toEqual([]);
  });

  it("sets 15px text at the measure made for it, never at the measure for 17px text", () => {
    expect(
      SOURCES.flatMap(({ rel, strings }) =>
        strings
          .filter((s) => /(?<![\w-])cb-measure(?![\w-])/.test(s) && /(?<![\w-])text-small(?![\w-])/.test(s))
          .map((s) => `${rel}: ${s}`)
      )
    ).toEqual([]);
  });

  it("says Choose where something is to be chosen, never Select", () => {
    expect(offenders(/\bSelect\b/)).toEqual([]);
  });
});
