import { describe, expect, it } from "vitest";
import { pbqRegistry } from "@/data/pbq";
import type { TerminalScenario } from "@/data/pbq/types";
import { runCommand } from "@/core/pbq/terminal-engine";
import { gradeTerminal } from "@/core/pbq/grade-terminal";

/**
 * Registry-wide data-integrity guard for the terminal PBQ content engine.
 * Terminal scenarios are pure data, so the thing that breaks is the data: an
 * answer the grader won't accept, a canned command a built-in shadows, a file
 * that can't be opened. These invariants hold every terminal in every cert —
 * current and future — honest, so new content can't ship subtly broken.
 */
const terminals: { cert: string; scenario: TerminalScenario }[] = Object.entries(
  pbqRegistry
).flatMap(([cert, scenarios]) =>
  scenarios
    .filter((s): s is TerminalScenario => s.type === "terminal")
    .map((scenario) => ({ cert, scenario }))
);

describe("terminal PBQ registry integrity", () => {
  it("registers at least one terminal scenario", () => {
    expect(terminals.length).toBeGreaterThan(0);
  });

  it("has globally unique scenario ids", () => {
    const ids = terminals.map((t) => t.scenario.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const { cert, scenario: s } of terminals) {
    describe(`${cert} · ${s.id}`, () => {
      it("starts in a directory that exists", () => {
        expect(s.dirs[s.cwd]).toBeTruthy();
      });

      it("has unique finding ids and non-empty accept lists", () => {
        const ids = s.findings.map((f) => f.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const f of s.findings) expect(f.accept.length).toBeGreaterThan(0);
      });

      it("grades to fully solved when every finding gets its canonical answer", () => {
        const values = Object.fromEntries(s.findings.map((f) => [f.id, f.accept[0]]));
        const r = gradeTerminal(s, { values });
        expect(r.correct).toBe(s.findings.length);
        expect(r.score).toBe(100);
      });

      it("runs every canned command without a built-in shadowing it", () => {
        for (const c of s.commands) {
          const out = runCommand(s, s.cwd, c.match[0]);
          expect(out.lines).toEqual(c.output);
          const flat = out.lines.map((l) => l.text).join("\n");
          expect(flat).not.toContain("command not found");
        }
      });

      it("can cat every file declared in its filesystem", () => {
        for (const path of Object.keys(s.files)) {
          const out = runCommand(s, s.cwd, `cat ${path}`);
          expect(out.lines).toEqual(s.files[path]);
        }
      });
    });
  }
});
