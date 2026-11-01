import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/env", () => ({
  publicEnv: {
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
  },
}));
// A signed-in visitor.
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: "user-1" } } }) },
  }),
}));

import { guidedNext, updateSession } from "../middleware";

describe("guidedNext", () => {
  it("sends a signed-in visitor back to the path the link was for", () => {
    expect(guidedNext("/path/security-plus-sy0-701")).toBe("/path/security-plus-sy0-701");
    const tagged = "/path/network-plus-n10-009?utm_source=email&utm_campaign=path_nudge";
    expect(guidedNext(tagged)).toBe(tagged);
    expect(guidedNext("/start")).toBe("/start");
  });

  it("ignores everything else, off-site and look-alike paths included", () => {
    for (const next of [
      null,
      "",
      "/dashboard",
      "//evil.example/path/x",
      "/\\evil.example",
      "https://evil.example/path/x",
      "/path/",
      "/path/x/../../admin",
      "/starter",
    ]) {
      expect(guidedNext(next)).toBeNull();
    }
  });
});

describe("updateSession on /login", () => {
  const visit = (url: string) => updateSession(new NextRequest(url));

  it("forwards a signed-in visitor to their path when that's where the link goes", async () => {
    const next = encodeURIComponent("/path/security-plus-sy0-701?utm_source=email");
    const res = await visit(`https://certbench.dev/login?next=${next}`);
    expect(res.headers.get("location")).toBe(
      "https://certbench.dev/path/security-plus-sy0-701?utm_source=email"
    );
  });

  it("still sends them to the dashboard otherwise", async () => {
    for (const url of [
      "https://certbench.dev/login",
      `https://certbench.dev/login?next=${encodeURIComponent("//evil.example")}`,
    ]) {
      const res = await visit(url);
      expect(res.headers.get("location")).toBe("https://certbench.dev/dashboard");
    }
  });
});
