import { describe, expect, it } from "vitest";
import { securityPlusTerminals } from "@/data/pbq/security-plus-sy0-701/terminals";
import { runCommand } from "@/core/pbq/terminal-engine";
import { gradeTerminal } from "@/core/pbq/grade-terminal";

/**
 * Data-integrity guard for the terminal PBQ content engine. Scenarios are pure
 * data, so the thing that breaks is the data: an answer the grader won't accept,
 * a canned command a built-in shadows, a finding that references nothing. These
 * invariants hold every current scenario — and every future one — honest.
 */
describe("securityPlusTerminals data integrity", () => {
  it("has at least the two authored scenarios", () => {
    expect(securityPlusTerminals.length).toBeGreaterThanOrEqual(2);
  });

  for (const s of securityPlusTerminals) {
    describe(s.id, () => {
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
