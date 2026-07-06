import { describe, expect, it } from "vitest";
import { codeToSlug, slugToCode } from "@/lib/seo/objective-code";

describe("objective code ⇄ slug", () => {
  it("swaps dots for hyphens in URLs and back", () => {
    expect(codeToSlug("1.2")).toBe("1-2");
    expect(slugToCode("1-2")).toBe("1.2");
  });

  it("round-trips every code shape the exams use", () => {
    for (const code of ["1.1", "2.4", "4.10", "5.35"]) {
      expect(slugToCode(codeToSlug(code))).toBe(code);
    }
  });
});
