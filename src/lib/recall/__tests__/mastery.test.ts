import { describe, expect, it } from "vitest";
import { applyMastery, masteryTotals, type MasteryMap } from "../mastery";

describe("applyMastery", () => {
  it("adds an item on a correct answer", () => {
    expect(applyMastery({}, "acronyms", "AES", true).acronyms).toEqual(["AES"]);
  });

  it("does not duplicate a re-mastered item", () => {
    let m: MasteryMap = {};
    m = applyMastery(m, "acronyms", "AES", true);
    m = applyMastery(m, "acronyms", "AES", true);
    expect(m.acronyms).toEqual(["AES"]);
  });

  it("drops an item on a miss", () => {
    const m = applyMastery({ acronyms: ["AES", "RSA"] }, "acronyms", "AES", false);
    expect(m.acronyms).toEqual(["RSA"]);
  });

  it("a miss on an unmastered item is a no-op", () => {
    const m = applyMastery({ acronyms: ["RSA"] }, "acronyms", "AES", false);
    expect(m.acronyms).toEqual(["RSA"]);
  });

  it("does not mutate the input map", () => {
    const before: MasteryMap = { acronyms: ["RSA"] };
    const after = applyMastery(before, "acronyms", "AES", true);
    expect(before.acronyms).toEqual(["RSA"]);
    expect(after).not.toBe(before);
  });

  it("keeps decks independent", () => {
    let m: MasteryMap = {};
    m = applyMastery(m, "acronyms", "AES", true);
    m = applyMastery(m, "ports-protocols", "SSH", true);
    expect(m.acronyms).toEqual(["AES"]);
    expect(m["ports-protocols"]).toEqual(["SSH"]);
  });
});

describe("masteryTotals", () => {
  const decks = [
    { tableId: "acronyms", itemCount: 300 },
    { tableId: "ports-protocols", itemCount: 30 },
  ];

  it("sums totals and counts mastered items", () => {
    const map: MasteryMap = { acronyms: ["AES", "RSA"], "ports-protocols": [] };
    expect(masteryTotals(decks, map)).toEqual({ mastered: 2, total: 330 });
  });

  it("never counts more mastered than a deck has items", () => {
    const map: MasteryMap = {
      "ports-protocols": Array.from({ length: 50 }, (_, i) => String(i)),
    };
    expect(masteryTotals(decks, map).mastered).toBe(30);
  });

  it("is zero mastered for an empty map", () => {
    expect(masteryTotals(decks, {})).toEqual({ mastered: 0, total: 330 });
  });
});
