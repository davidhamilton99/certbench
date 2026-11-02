import { beforeEach, describe, expect, it, vi } from "vitest";

const exchange = vi.hoisted(() => ({ error: null as null | { message: string } }));

vi.mock("@/server/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      exchangeCodeForSession: async () => ({ error: exchange.error }),
      getUser: async () => ({ data: { user: null } }),
    },
  }),
}));

import { GET } from "@/app/auth/callback/route";

const ORIGIN = "https://certbench.dev";

async function arrive(params: Record<string, string>) {
  const res = await GET(new Request(`${ORIGIN}/auth/callback?${new URLSearchParams(params)}`));
  return res.headers.get("location");
}

beforeEach(() => {
  exchange.error = null;
});

describe("back from Google without signing in", () => {
  it("goes back to the page they tried from, flagged for its button", async () => {
    expect(
      await arrive({ next: "/tools/subnetting-practice", back: "/tools/subnetting-practice" })
    ).toBe(`${ORIGIN}/tools/subnetting-practice?signin_cancelled=1`);
  });

  it("keeps that page's own query", async () => {
    expect(await arrive({ next: "/dashboard", back: "/login?next=%2Fpath%2Fnetwork-plus-n10-009" })).toBe(
      `${ORIGIN}/login?next=%2Fpath%2Fnetwork-plus-n10-009&signin_cancelled=1`
    );
  });

  it("goes back too when Google's answer can't be exchanged", async () => {
    exchange.error = { message: "bad code" };
    expect(await arrive({ code: "abc", next: "/start", back: "/path/network-plus-n10-009" })).toBe(
      `${ORIGIN}/path/network-plus-n10-009?signin_cancelled=1`
    );
  });

  it.each(["//evil.com/x", "https://evil.com/x", "/\\evil.com", "javascript:alert(1)", "http://"])(
    "never leaves the site for %s",
    async (back) => {
      expect(await arrive({ next: "/start", back })).toBe(`${ORIGIN}/login?error=auth`);
    }
  );

  it("falls back to login when there's no page to go back to, as with a stale reset link", async () => {
    expect(await arrive({ next: "/reset-password" })).toBe(`${ORIGIN}/login?error=auth`);
  });
});

describe("back from Google signed in", () => {
  it("goes where they were headed, with no flag", async () => {
    expect(
      await arrive({ code: "abc", next: "/tools/subnetting-practice", back: "/tools/subnetting-practice" })
    ).toBe(`${ORIGIN}/tools/subnetting-practice`);
  });
});
