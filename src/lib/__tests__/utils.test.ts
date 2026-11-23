import { describe, expect, it } from "vitest";
import { cn } from "../utils";

describe("cn", () => {
  it("keeps one of the site's text sizes beside a text colour", () => {
    expect(cn("text-small", "text-muted-foreground")).toBe("text-small text-muted-foreground");
    expect(cn("inline-flex items-baseline gap-1 text-note", "text-success")).toBe(
      "inline-flex items-baseline gap-1 text-note text-success"
    );
    expect(cn("text-body text-foreground", false && "hidden")).toBe("text-body text-foreground");
    expect(cn("text-lede", "text-primary")).toBe("text-lede text-primary");
  });

  it("lets a later size replace an earlier one, among the site's own and Tailwind's", () => {
    expect(cn("text-note", "text-small")).toBe("text-small");
    expect(cn("text-base", "text-body")).toBe("text-body");
    expect(cn("text-body", "text-xl")).toBe("text-xl");
  });

  it("lets a later colour replace an earlier one and leaves the size alone", () => {
    expect(cn("text-small text-muted-foreground", "text-destructive")).toBe("text-small text-destructive");
  });

  it("still merges the ordinary conflicts", () => {
    expect(cn("grid gap-5", "flex")).toBe("gap-5 flex");
    expect(cn("px-4", "px-6")).toBe("px-6");
  });
});
