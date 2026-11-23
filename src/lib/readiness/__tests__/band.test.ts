import { describe, expect, it } from "vitest";
import * as band from "../band";

// The score report once drew its bands from five custom properties that
// bandVars wrote onto its root. The rules that read them were deleted (CA-07),
// so the helper and the three colours that only it carried went too.
describe("a readiness band", () => {
  it("carries its words and the two colours that a score report draws, and nothing else", () => {
    for (const score of [10, 50, 90]) {
      expect(Object.keys(band.bandFor(score)).sort(), String(score)).toEqual(["accent", "ink", "key", "label", "long"]);
    }
    expect(Object.keys(band.BUILDING_BAND).sort()).toEqual(["accent", "ink", "key", "label", "long"]);
  });

  it("draws its colours from the theme's own marks", () => {
    expect(band.bandFor(90)).toMatchObject({ key: "ready", accent: "var(--success)", ink: "var(--success)" });
    expect(band.bandFor(50)).toMatchObject({ key: "close", accent: "var(--warning)", ink: "var(--warning-ink)" });
    expect(band.bandFor(10)).toMatchObject({ key: "work", accent: "var(--destructive)", ink: "var(--destructive)" });
  });

  it("offers no helper that writes custom properties for rules that no longer exist", () => {
    expect("bandVars" in band).toBe(false);
  });
});
