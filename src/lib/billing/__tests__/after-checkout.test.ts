import { describe, expect, it } from "vitest";
import { afterCheckoutPath } from "../after-checkout";

describe("afterCheckoutPath", () => {
  it("returns a buyer to the path they bought from", () => {
    expect(afterCheckoutPath("path/network-plus-n10-009")).toBe("/path/network-plus-n10-009?upgraded=1");
    expect(afterCheckoutPath("/path/network-plus-n10-009")).toBe("/path/network-plus-n10-009?upgraded=1");
  });

  it("sends everyone else to /start, which opens their exam's path", () => {
    expect(afterCheckoutPath("pricing")).toBe("/start?upgraded=1");
    expect(afterCheckoutPath("upgrade")).toBe("/start?upgraded=1");
    expect(afterCheckoutPath(null)).toBe("/start?upgraded=1");
  });

  it("never lands anywhere but a path on this site", () => {
    expect(afterCheckoutPath("https://evil.example/path/x")).toBe("/start?upgraded=1");
    expect(afterCheckoutPath("//evil.example")).toBe("/start?upgraded=1");
    expect(afterCheckoutPath("/path/../dashboard")).toBe("/start?upgraded=1");
    expect(afterCheckoutPath("/path/network-plus-n10-009?x=1")).toBe("/start?upgraded=1");
  });
});
