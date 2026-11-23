import { describe, expect, it } from "vitest";
import { MODES } from "../subnetting";
import { MIXED_MODE_NAME, MODE_NAMES, modeName } from "../subnet-mode-names";

describe("subnetting mode names", () => {
  it("names every mode the drill has, and no other", () => {
    expect(Object.keys(MODE_NAMES).sort()).toEqual(MODES.map((m) => m.id).sort());
  });

  it("writes each name in words: no ampersand for 'and', and no arrow", () => {
    for (const name of [...Object.values(MODE_NAMES), MIXED_MODE_NAME]) {
      expect(name).not.toMatch(/&/);
      expect(name).not.toMatch(/[←-⇿]/);
      // Sentence case: a capital to begin, and no word after it capitalized unless it is an acronym.
      expect(name).toMatch(/^[A-Z]/);
      for (const word of name.split(" ").slice(1)) expect(word).toMatch(/^([a-z?]+|[A-Z]{2,})$/);
    }
  });

  it("gives the id back for a mode it does not know, so that nothing prints blank", () => {
    expect(modeName("network-id")).toBe("Network ID");
    expect(modeName("gauntlet")).toBe("gauntlet");
  });
});
