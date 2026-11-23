import { beforeEach, describe, expect, it, vi } from "vitest";

const exchange = vi.hoisted(() => ({ error: null as null | { message: string } }));
/** The account that Google's answer signs in, and whether it has chosen an exam. */
const account = vi.hoisted(() => ({
  user: null as null | { id: string },
  onboarded: false,
  profileReads: 0,
}));

vi.mock("@/server/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      exchangeCodeForSession: async () => ({ error: exchange.error }),
      getUser: async () => ({ data: { user: account.user } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => {
            account.profileReads++;
            return { data: { onboarding_completed: account.onboarded } };
          },
        }),
      }),
    }),
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
  account.user = null;
  account.onboarded = false;
  account.profileReads = 0;
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

  it("goes back too when Google's answer cannot be exchanged", async () => {
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

  it("falls back to login when there is no page to go back to, as with a stale reset link", async () => {
    expect(await arrive({ next: "/reset-password" })).toBe(`${ORIGIN}/login?error=auth`);
  });
});

describe("back from Google signed in", () => {
  it("goes where they were headed, with no flag", async () => {
    expect(
      await arrive({ code: "abc", next: "/tools/subnetting-practice", back: "/tools/subnetting-practice" })
    ).toBe(`${ORIGIN}/tools/subnetting-practice`);
  });

  it("goes to the exam list when no page was named", async () => {
    account.user = { id: "u1" };
    account.onboarded = true;
    expect(await arrive({ code: "abc" })).toBe(`${ORIGIN}/start`);
  });
});

// A new account has not chosen an exam yet (`onboarding_completed` is false).
// It signed up on a public page for something on that page, and goes back to it.
describe("a new account, back from Google to the public page it signed up on", () => {
  beforeEach(() => {
    account.user = { id: "new-account" };
    account.onboarded = false;
  });

  it("returns to the practice exam page, where its score is waiting", async () => {
    const next = "/security-plus-practice-test?exam=scored";
    expect(await arrive({ code: "abc", next, back: "/security-plus-practice-test" })).toBe(`${ORIGIN}${next}`);
  });

  it("returns to the lab page with the lab it asked for open", async () => {
    const next = "/security-plus-pbq-examples?lab=firewall-rules-1";
    expect(await arrive({ code: "abc", next, back: "/security-plus-pbq-examples" })).toBe(`${ORIGIN}${next}`);
  });

  it("returns to the pricing page with the plan it chose", async () => {
    const next = "/pricing?plan=quarterly";
    expect(await arrive({ code: "abc", next, back: "/register?next=%2Fpricing%3Fplan%3Dquarterly" })).toBe(
      `${ORIGIN}${next}`
    );
  });

  it("returns to the form that sets a new password, from a reset link", async () => {
    expect(await arrive({ code: "abc", next: "/reset-password" })).toBe(`${ORIGIN}/reset-password`);
  });

  it("does not read the profile to decide any of these: the page is public", async () => {
    await arrive({ code: "abc", next: "/security-plus-practice-test?exam=scored" });
    expect(account.profileReads).toBe(0);
  });

  it("goes to choose an exam when the page named is in the workspace", async () => {
    expect(await arrive({ code: "abc", next: "/dashboard" })).toBe(`${ORIGIN}/start`);
    expect(await arrive({ code: "abc", next: "/pbq/firewall-rules-1" })).toBe(`${ORIGIN}/start`);
    expect(account.profileReads).toBe(2);
  });

  it("goes to choose an exam when no page was named", async () => {
    expect(await arrive({ code: "abc" })).toBe(`${ORIGIN}/start`);
  });

  it.each(["//evil.com/x", "https://evil.com/x", "/\\evil.com", "javascript:alert(1)"])(
    "goes to choose an exam, and never leaves the site, for the address %s",
    async (next) => {
      expect(await arrive({ code: "abc", next })).toBe(`${ORIGIN}/start`);
    }
  );
});

describe("an account that has chosen its exam, back from Google", () => {
  beforeEach(() => {
    account.user = { id: "member" };
    account.onboarded = true;
  });

  it("goes to the workspace page it was headed for", async () => {
    expect(await arrive({ code: "abc", next: "/dashboard" })).toBe(`${ORIGIN}/dashboard`);
    expect(await arrive({ code: "abc", next: "/upgrade?plan=annual" })).toBe(`${ORIGIN}/upgrade?plan=annual`);
  });

  it("goes back to a public page as a new account does", async () => {
    const next = "/security-plus-practice-test?exam=scored";
    expect(await arrive({ code: "abc", next })).toBe(`${ORIGIN}${next}`);
  });
});
