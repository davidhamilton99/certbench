import { describe, expect, it } from "vitest";
import { answerLengthRatio, chooseLongestScore, chooseShortestScore, lengthSpread } from "../cues";

const q = (answer: number, ...options: string[]) => ({ options, answer });

describe("what a set of questions gives away by length", () => {
  it("scores the habit of choosing the longest answer", () => {
    const set = [q(0, "aaaa", "bb", "cc", "dd"), q(1, "aaaa", "bb", "cc", "dd"), q(2, "a", "bb", "cccc", "dd"), q(3, "aaaa", "bb", "cc", "d")];
    expect(chooseLongestScore(set)).toBe(0.5);
  });

  it("splits a guess evenly between answers that tie for longest", () => {
    expect(chooseLongestScore([q(0, "aaaa", "bbbb", "cc", "dd")])).toBe(0.5);
    expect(chooseLongestScore([q(2, "aaaa", "bbbb", "cc", "dd")])).toBe(0);
    expect(chooseLongestScore([q(1, "aa", "bb", "cc", "dd")])).toBe(0.25);
  });

  it("scores the habit of choosing the shortest answer", () => {
    const set = [q(3, "aaaa", "bbb", "ccc", "d"), q(0, "aaaa", "bbb", "ccc", "d")];
    expect(chooseShortestScore(set)).toBe(0.5);
    expect(chooseShortestScore([q(1, "aa", "bb", "cccc", "dddd")])).toBe(0.5);
  });

  it("compares the length of the right answers with the wrong ones", () => {
    expect(answerLengthRatio([q(0, "aaaaaa", "bbb", "ccc", "ddd")])).toBe(2);
    expect(answerLengthRatio([q(0, "aaa", "bbb", "ccc", "ddd")])).toBe(1);
    expect(answerLengthRatio([])).toBe(1);
  });

  it("ignores spaces around an answer", () => {
    expect(chooseLongestScore([q(1, "aaaa", "bbb   ", "ccc", "ddd")])).toBe(0);
    expect(lengthSpread([" aaaa ", "bb", "ccc", "ddd"])).toBe(2);
  });

  it("measures how far apart one question's answers are in length", () => {
    expect(lengthSpread(["aaaaaa", "bbbb", "ccccc", "dddd"])).toBe(1.5);
    expect(lengthSpread(["aaa", "bbb", "ccc", "ddd"])).toBe(1);
  });

  it("scores an empty set as zero", () => {
    expect(chooseLongestScore([])).toBe(0);
    expect(chooseShortestScore([])).toBe(0);
  });
});
