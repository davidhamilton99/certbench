import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isTestAddress } from "../test-address";

describe("isTestAddress", () => {
  it("takes the end-to-end tests' tag and the rebuild checks' tag, in any capitals", () => {
    for (const address of [
      "someone+e2e-checkout-1732000000000@example.com",
      "someone+e2e-x-1@example.com",
      "Someone+E2E-Path-2@Example.com",
      " someone+rb1@example.com ",
      "someone+RB27@example.com",
    ]) {
      expect(isTestAddress(address), address).toBe(true);
    }
  });

  // The test used to be "contains +e2e or +rb": these real addresses were never
  // welcomed or reminded, and the study plan form told them something untrue.
  it("takes a real address whose tag only begins with those letters as a real address", () => {
    for (const address of [
      "anna+rbc@example.com",
      "anna+rb@example.com",
      "anna+rb1x@example.com",
      "sam+e2ex@example.com",
      "sam+e2e@example.com",
      "rb1@example.com",
      "e2e-team@example.com",
      "student@example.com",
    ]) {
      expect(isTestAddress(address), address).toBe(false);
    }
  });

  it("is the one test of its kind: the daily job and the study plan form both ask it", () => {
    for (const file of ["src/server/services/lifecycle-email.ts", "src/server/services/tool-leads.ts"]) {
      const source = readFileSync(join(process.cwd(), file), "utf8");
      expect(source, file).toContain('import { isTestAddress } from "@/server/email/test-address";');
      expect(source, file).not.toMatch(/includes\("\+(?:e2e|rb)"\)/);
    }
  });
});
