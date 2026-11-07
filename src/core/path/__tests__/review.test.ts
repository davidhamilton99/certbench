import { describe, expect, it } from "vitest";
import { recordRep, REVIEW_AGAIN_DAYS, reviewIds } from "../progress";
import { EMPTY_PATH_PROGRESS } from "../types";

const DAY = 86_400_000;
const answer = (ids: [string, boolean, number][]) =>
  ids.reduce((p, [id, right, at]) => recordRep(p, id, right, at), EMPTY_PATH_PROGRESS).items;

describe("reviewIds", () => {
  const now = 100 * DAY;

  it("brings back misses, oldest first", () => {
    const items = answer([
      ["a|1.1|late", false, now - 1 * DAY],
      ["a|1.1|early", false, now - 5 * DAY],
      ["a|1.1|right", true, now - 9 * DAY],
    ]);
    expect(reviewIds(items, now)).toEqual(["a|1.1|early", "a|1.1|late"]);
  });

  it("brings a miss got right once back for a second check, days later", () => {
    const recovered = (at: number) =>
      answer([
        ["a|1.1|x", false, at - DAY],
        ["a|1.1|x", true, at],
      ]);
    expect(reviewIds(recovered(now - REVIEW_AGAIN_DAYS * DAY), now)).toEqual(["a|1.1|x"]);
    expect(reviewIds(recovered(now - DAY), now)).toEqual([]);
  });

  it("lets a miss go after two right answers, and never asks back what was never missed", () => {
    const items = answer([
      ["a|1.1|x", false, now - 20 * DAY],
      ["a|1.1|x", true, now - 10 * DAY],
      ["a|1.1|x", true, now - 5 * DAY],
      ["a|1.1|y", true, now - 30 * DAY],
    ]);
    expect(reviewIds(items, now)).toEqual([]);
  });

  it("puts misses ahead of second checks, and stops at the limit", () => {
    const items = answer([
      ["a|1.1|again", false, now - 30 * DAY],
      ["a|1.1|again", true, now - 20 * DAY],
      ["a|1.1|miss", false, now - DAY],
    ]);
    expect(reviewIds(items, now)).toEqual(["a|1.1|miss", "a|1.1|again"]);
    expect(reviewIds(items, now, 1)).toEqual(["a|1.1|miss"]);
  });
});
