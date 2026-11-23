import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options?: Record<string, unknown> };

/** Cookies the client writes while it checks the session: set by a test that needs a refresh. */
const refreshed = vi.hoisted(() => ({ cookies: [] as CookieToSet[] }));

vi.mock("@/env", () => ({
  publicEnv: {
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
  },
}));
// A signed-in visitor. When a test asks for it, the check also rotates the
// session's tokens, which the client hands to setAll as new cookies.
vi.mock("@supabase/ssr", () => ({
  createServerClient: (
    _url: string,
    _key: string,
    options: { cookies: { setAll: (cookies: CookieToSet[]) => void } }
  ) => ({
    auth: {
      getUser: async () => {
        if (refreshed.cookies.length) options.cookies.setAll(refreshed.cookies);
        return { data: { user: { id: "user-1" } } };
      },
    },
  }),
}));

import { guidedNext, updateSession } from "../middleware";

beforeEach(() => {
  refreshed.cookies = [];
});

describe("guidedNext", () => {
  it("sends a signed-in visitor back to the path the link was for", () => {
    expect(guidedNext("/path/security-plus-sy0-701")).toBe("/path/security-plus-sy0-701");
    const tagged = "/path/network-plus-n10-009?utm_source=email&utm_campaign=path_nudge";
    expect(guidedNext(tagged)).toBe(tagged);
    expect(guidedNext("/start")).toBe("/start");
  });

  it("keeps the plan a visitor chose on the pricing page", () => {
    for (const plan of ["monthly", "quarterly", "annual"]) {
      expect(guidedNext(`/pricing?plan=${plan}`)).toBe(`/pricing?plan=${plan}`);
    }
  });

  it("ignores everything else, off-site and look-alike paths included", () => {
    for (const next of [
      null,
      "",
      "/dashboard",
      "/pricing",
      "/pricing?plan=lifetime",
      "/pricing?plan=monthly&next=//evil.example",
      "/pricing/../admin?plan=monthly",
      "//evil.example/pricing?plan=monthly",
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

  it("forwards a signed-in visitor to their path when that is where the link goes", async () => {
    const next = encodeURIComponent("/path/security-plus-sy0-701?utm_source=email");
    const res = await visit(`https://certbench.dev/login?next=${next}`);
    expect(res.headers.get("location")).toBe(
      "https://certbench.dev/path/security-plus-sy0-701?utm_source=email"
    );
  });

  it("sends them to their path otherwise, not the toolkit", async () => {
    for (const url of [
      "https://certbench.dev/login",
      `https://certbench.dev/login?next=${encodeURIComponent("//evil.example")}`,
    ]) {
      const res = await visit(url);
      expect(res.headers.get("location")).toBe("https://certbench.dev/start");
    }
  });

  it("keeps the refreshed session cookies on the redirect when the session had expired", async () => {
    // An expired access token: the check refreshes it, and the new tokens
    // arrive as cookies. A redirect built without them would send the browser
    // on with tokens that have already been replaced.
    refreshed.cookies = [
      { name: "sb-example-auth-token.0", value: "new-part-one", options: { path: "/", sameSite: "lax", maxAge: 34560000 } },
      { name: "sb-example-auth-token.1", value: "new-part-two", options: { path: "/", sameSite: "lax", maxAge: 34560000 } },
    ];
    const expired = { cookie: "sb-example-auth-token.0=old-part-one; sb-example-auth-token.1=old-part-two" };

    const next = encodeURIComponent("/path/security-plus-sy0-701");
    for (const url of ["https://certbench.dev/login", `https://certbench.dev/login?next=${next}`]) {
      const res = await updateSession(new NextRequest(url, { headers: expired }));
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toMatch(/^https:\/\/certbench\.dev\/(start|path\/security-plus-sy0-701)$/);

      const written = res.headers.getSetCookie();
      expect(written).toHaveLength(2);
      expect(written[0]).toContain("sb-example-auth-token.0=new-part-one");
      expect(written[1]).toContain("sb-example-auth-token.1=new-part-two");
      // The cookie's own settings travel with it.
      expect(written[0]).toMatch(/Max-Age=34560000/i);
      expect(written[0]).toMatch(/SameSite=lax/i);
    }
  });

  it("writes no cookie on the redirect when nothing was refreshed", async () => {
    const res = await visit("https://certbench.dev/login");
    expect(res.headers.getSetCookie()).toEqual([]);
  });
});
