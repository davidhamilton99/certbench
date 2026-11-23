import { describe, expect, it } from "vitest";
import { OG } from "@/lib/og/mark";
import { bandFor, READINESS_TARGET } from "@/lib/readiness/band";
import { CARD, readinessBand, truncate } from "../card";

describe("the shared score card", () => {
  it("describes a score in the words the site uses for it", () => {
    for (const score of [0, 39, 40, 74, 75, 100]) {
      expect(readinessBand(score).label, String(score)).toBe(bandFor(score).long);
    }
    expect(readinessBand(READINESS_TARGET).label).toBe("Readiness target met");
    expect(readinessBand(READINESS_TARGET - 1).label).toBe("Approaching the readiness target");
    expect(readinessBand(39).label).toBe("Below the readiness target");
  });

  it("changes band at the site's own thresholds", () => {
    expect(readinessBand(39).color).toBe(OG.danger);
    expect(readinessBand(40).color).toBe(OG.warningInk);
    expect(readinessBand(74).color).toBe(OG.warningInk);
    expect(readinessBand(75).color).toBe(OG.success);
  });

  it("takes every colour from the one hex table", () => {
    const table = new Set<string>(Object.values(OG));
    for (const [name, value] of Object.entries(CARD)) expect(table.has(value), name).toBe(true);
    for (const score of [10, 50, 90]) expect(table.has(readinessBand(score).color)).toBe(true);
  });

  it("shortens a long name and leaves a short one alone", () => {
    expect(truncate("CompTIA Security+", 40)).toBe("CompTIA Security+");
    const cut = truncate("A very long certification name that does not fit", 20);
    expect(cut.length).toBeLessThanOrEqual(20);
    expect(cut.endsWith(String.fromCharCode(0x2026))).toBe(true);
  });
});
