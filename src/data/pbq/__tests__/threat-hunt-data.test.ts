import { describe, expect, it } from "vitest";
import { pbqRegistry } from "@/data/pbq";
import type { ThreatHuntScenario } from "@/data/pbq/types";
import { gradeThreatHunt } from "@/core/pbq/grade-threat-hunt";

/**
 * Content-integrity guard for every Threat Hunt scenario across all certs.
 * Data is authored by hand, so this catches the mistakes types can't:
 * out-of-range answers, unwinnable/ungradeable scenarios, duplicate ids.
 */

const hunts: ThreatHuntScenario[] = Object.values(pbqRegistry)
  .flat()
  .filter((s): s is ThreatHuntScenario => s.type === "threat-hunt");

describe("threat-hunt scenario data", () => {
  it("has scenarios to validate", () => {
    expect(hunts.length).toBeGreaterThan(0);
  });

  it("scenario ids are globally unique", () => {
    const ids = hunts.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const h of hunts) {
    describe(h.id, () => {
      it("has both malicious and benign lines (a real hunt, not a giveaway)", () => {
        const malicious = h.lines.filter((l) => l.malicious).length;
        const benign = h.lines.length - malicious;
        expect(malicious).toBeGreaterThan(0);
        expect(benign).toBeGreaterThan(0);
      });

      it("every malicious line explains why (shown in the reveal)", () => {
        for (const line of h.lines.filter((l) => l.malicious)) {
          expect(line.note, line.text).toBeTruthy();
        }
      });

      it("has at least two attack options and an in-range correct answer", () => {
        expect(h.options.length).toBeGreaterThanOrEqual(2);
        expect(h.correctOption).toBeGreaterThanOrEqual(0);
        expect(h.correctOption).toBeLessThan(h.options.length);
      });

      it("the intended perfect answer actually grades 100%", () => {
        const flagged = h.lines
          .map((l, i) => (l.malicious ? i : -1))
          .filter((i) => i >= 0);
        const result = gradeThreatHunt(h, {
          flagged,
          attackChoice: h.correctOption,
        });
        expect(result.score).toBe(100);
      });
    });
  }
});
