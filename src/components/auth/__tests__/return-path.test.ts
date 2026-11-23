import { describe, expect, it } from "vitest";
import { chosenPlan, returnPath, withReturnPath } from "@/components/auth/return-path";

const ORIGIN = "https://certbench.dev";

describe("returnPath", () => {
  it("keeps an address on this site, with its query and its fragment", () => {
    expect(returnPath("/path/security-plus-sy0-701", ORIGIN)).toBe("/path/security-plus-sy0-701");
    expect(returnPath("/pricing?plan=quarterly", ORIGIN)).toBe("/pricing?plan=quarterly");
    expect(returnPath("/security-plus-practice-test?exam=scored#result", ORIGIN)).toBe(
      "/security-plus-practice-test?exam=scored#result"
    );
  });

  it("answers null when there is no address", () => {
    expect(returnPath(null, ORIGIN)).toBeNull();
    expect(returnPath(undefined, ORIGIN)).toBeNull();
    expect(returnPath("", ORIGIN)).toBeNull();
  });

  // Each of these IS a path on this site as it is written, so the first check
  // passes. The parser then folds the dot segment away and what is left begins
  // with two slashes: followed by the router, that is another site.
  it.each(["/.//evil.example", "/%2e//evil.example", "/x/..//evil.example", "/./\\evil.example", "/.//evil.example/path?x=1"])(
    "refuses %s, which becomes another site's address once it is normalised",
    (raw) => {
      expect(returnPath(raw, ORIGIN)).toBeNull();
    }
  );

  it("never returns an address that begins with two slashes, whatever it is given", () => {
    const dots = ["", ".", "..", "%2e", "%2E%2e", "x/.."];
    const seps = ["/", "//", "/\\", "\\/", "/%2f", "/%5c"];
    for (const a of dots) {
      for (const sep of seps) {
        for (const b of dots) {
          const raw = `/${a}${sep}${b}${sep}evil.example`;
          const out = returnPath(raw, ORIGIN);
          if (out !== null) {
            expect(out, raw).not.toMatch(/^\/[/\\]/);
            expect(new URL(out, ORIGIN).origin, raw).toBe(ORIGIN);
          }
        }
      }
    }
  });

  it.each([
    "//evil.com/x",
    "/\\evil.com",
    "https://evil.com/x",
    "http://certbench.dev.evil.com",
    "javascript:alert(1)",
    "@evil.com",
    "pricing",
  ])("refuses %s, which names another site or is not a path", (raw) => {
    expect(returnPath(raw, ORIGIN)).toBeNull();
  });
});

describe("withReturnPath", () => {
  it("carries the return address from one account page to the next", () => {
    expect(withReturnPath("/register", "/pricing?plan=annual")).toBe("/register?next=%2Fpricing%3Fplan%3Dannual");
    expect(withReturnPath("/login", "/path/network-plus-n10-009")).toBe("/login?next=%2Fpath%2Fnetwork-plus-n10-009");
  });

  it("leaves the link alone when there is nowhere to return to", () => {
    expect(withReturnPath("/register", null)).toBe("/register");
  });
});

describe("chosenPlan", () => {
  it("reads the plan a visitor chose on the pricing page", () => {
    expect(chosenPlan("/pricing?plan=monthly")).toBe("monthly");
    expect(chosenPlan("/pricing?plan=quarterly")).toBe("quarterly");
    expect(chosenPlan("/pricing?plan=annual#plans")).toBe("annual");
  });

  it("answers null for any other address, and for a plan that is not sold", () => {
    expect(chosenPlan(null)).toBeNull();
    expect(chosenPlan("/pricing")).toBeNull();
    expect(chosenPlan("/pricing?plan=lifetime")).toBeNull();
    expect(chosenPlan("/upgrade?plan=annual")).toBeNull();
    expect(chosenPlan("/path/security-plus-sy0-701")).toBeNull();
  });
});
