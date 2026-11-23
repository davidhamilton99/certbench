import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * The proxy with its real session code, against a stand-in for the Supabase
 * client. proxy.test.ts covers the proxy's own two redirects with the session
 * code replaced; this file covers what the session code decides: who may open
 * a guarded page, and which requests never reach the sign-in service at all.
 */

type CookieToSet = { name: string; value: string; options?: Record<string, unknown> };
type ReadResult = { data: Record<string, unknown> | null; error: { message: string } | null };

const supabase = vi.hoisted(() => ({
  /** Clients built: none means the request left before any session work. */
  clients: 0,
  /** Calls to the sign-in service. */
  sessionChecks: 0,
  /** What the sign-in service answers; replaced by a test that needs another answer. */
  getUser: (async () => ({ data: { user: null } })) as () => Promise<{ data: { user: { id: string } | null } }>,
  /** Cookies the client writes during the check, as it does when it rotates the tokens. */
  rotated: [] as CookieToSet[],
  subscription: { data: null, error: null } as ReadResult,
  profile: { data: null, error: null } as ReadResult,
}));

vi.mock("@/env", () => ({
  publicEnv: {
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
  },
}));
vi.mock("@supabase/ssr", () => ({
  createServerClient: (
    _url: string,
    _key: string,
    options: { cookies: { setAll: (cookies: CookieToSet[]) => void } }
  ) => {
    supabase.clients += 1;
    return {
      auth: {
        getUser: async () => {
          supabase.sessionChecks += 1;
          if (supabase.rotated.length) options.cookies.setAll(supabase.rotated);
          return supabase.getUser();
        },
      },
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => (table === "user_subscriptions" ? supabase.subscription : supabase.profile),
          }),
        }),
      }),
    };
  },
}));

import { proxy } from "../proxy";

const SITE = "https://certbench.dev";
const SESSION = "sb-abcdefghijklmnop-auth-token=base64-eyJhY2Nlc3NfdG9rZW4iOiJ4In0";

function visit(path: string, headers: Record<string, string> = {}) {
  return proxy(new NextRequest(`${SITE}${path}`, { headers }));
}

/** True when the proxy let the request go on to its page or handler untouched. */
const wentThrough = (res: Response) => res.headers.get("x-middleware-next") === "1" && !res.headers.get("location");

const signedIn = () => {
  supabase.getUser = async () => ({ data: { user: { id: "user-1" } } });
};
const withPro = () => {
  supabase.subscription = { data: { plan: "pro", status: "active" }, error: null };
};
const withoutPro = () => {
  supabase.subscription = { data: { plan: "free", status: "active" }, error: null };
  supabase.profile = { data: { role: "user", onboarding_completed: true }, error: null };
};

beforeEach(() => {
  supabase.clients = 0;
  supabase.sessionChecks = 0;
  supabase.getUser = async () => ({ data: { user: null } });
  supabase.rotated = [];
  supabase.subscription = { data: null, error: null };
  supabase.profile = { data: null, error: null };
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("guarded pages: who may open them is decided as before", () => {
  it("sends a signed-out visitor to sign in, with the way back", async () => {
    const res = await visit("/dashboard?tab=1");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(`${SITE}/login?next=%2Fdashboard%3Ftab%3D1`);
  });

  it("sends a signed-out prefetch of a guarded page to sign in as well", async () => {
    for (const path of ["/dashboard", "/recall", "/reference", "/profile", "/admin/testimonials"]) {
      const res = await visit(path, { "next-router-prefetch": "1" });
      expect(res.status, path).toBe(307);
      expect(new URL(res.headers.get("location") ?? "").pathname, path).toBe("/login");
    }
  });

  it("sends a member without Pro to the study path", async () => {
    signedIn();
    withoutPro();
    const res = await visit("/dashboard", { cookie: SESSION });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(`${SITE}/start`);
  });

  it("checks a prefetch of a guarded page in full: a member without Pro still goes to the study path", async () => {
    signedIn();
    withoutPro();
    const res = await visit("/recall", { cookie: SESSION, "next-router-prefetch": "1" });
    expect(res.headers.get("location")).toBe(`${SITE}/start`);
    expect(supabase.sessionChecks).toBe(1);
  });

  it("lets a Pro member through", async () => {
    signedIn();
    withPro();
    const res = await visit("/dashboard", { cookie: SESSION });
    expect(wentThrough(res)).toBe(true);
  });

  it("lets the owner through without Pro", async () => {
    signedIn();
    supabase.subscription = { data: null, error: null };
    supabase.profile = { data: { role: "admin", onboarding_completed: true }, error: null };
    const res = await visit("/admin/testimonials", { cookie: SESSION });
    expect(wentThrough(res)).toBe(true);
  });

  it("lets a member without Pro reach the plan page", async () => {
    signedIn();
    withoutPro();
    const res = await visit("/upgrade", { cookie: SESSION });
    expect(wentThrough(res)).toBe(true);
  });

  it("does not wall a member when the plan cannot be read", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    signedIn();
    supabase.subscription = { data: null, error: { message: "connection refused" } };
    const res = await visit("/dashboard", { cookie: SESSION });
    expect(wentThrough(res)).toBe(true);
  });
});

describe("pages outside the gate: requests that need no session work get none", () => {
  it("passes a visitor with no session cookie straight through", async () => {
    for (const path of ["/", "/pricing", "/path/security-plus-sy0-701", "/start", "/security-plus-practice-test"]) {
      expect(wentThrough(await visit(path)), path).toBe(true);
    }
    expect(supabase.clients).toBe(0);
    expect(supabase.sessionChecks).toBe(0);
  });

  it("does not call the sign-in service for a prefetch of a public page, with a session cookie", async () => {
    signedIn();
    const prefetches: Record<string, string>[] = [
      { "next-router-prefetch": "1" },
      { purpose: "prefetch" },
      { "sec-purpose": "prefetch;prerender" },
    ];
    for (const headers of prefetches) {
      const res = await visit("/security-plus-practice-test", { cookie: SESSION, ...headers });
      expect(wentThrough(res), JSON.stringify(headers)).toBe(true);
    }
    expect(supabase.clients).toBe(0);
    expect(supabase.sessionChecks).toBe(0);
  });

  it("passes an API request through: its handler checks the session itself", async () => {
    signedIn();
    for (const path of ["/api/path/progress?cert=security-plus-sy0-701", "/api/health", "/api/stripe/webhook"]) {
      expect(wentThrough(await visit(path, { cookie: SESSION })), path).toBe(true);
    }
    expect(supabase.clients).toBe(0);
    expect(supabase.sessionChecks).toBe(0);
  });

  it("still refreshes the session when a signed-in visitor opens a public page", async () => {
    signedIn();
    supabase.rotated = [{ name: "sb-abcdefghijklmnop-auth-token", value: "rotated", options: { path: "/" } }];
    const res = await visit("/pricing", { cookie: SESSION });
    expect(wentThrough(res)).toBe(true);
    expect(supabase.sessionChecks).toBe(1);
    expect(res.headers.get("set-cookie")).toContain("sb-abcdefghijklmnop-auth-token=rotated");
  });

  it("recognizes a session cookie that is split into numbered parts", async () => {
    signedIn();
    const parts = "sb-abcdefghijklmnop-auth-token.0=base64-part; sb-abcdefghijklmnop-auth-token.1=rest";
    await visit("/pricing", { cookie: parts });
    expect(supabase.sessionChecks).toBe(1);
  });

  it("does not take another cookie for a session", async () => {
    const others = "sb-abcdefghijklmnop-auth-token-code-verifier=abc; theme=dark; ph_phc_x_posthog=1";
    expect(wentThrough(await visit("/pricing", { cookie: others }))).toBe(true);
    expect(supabase.clients).toBe(0);
  });
});

describe("sign-in pages", () => {
  it("shows the page to a signed-out visitor", async () => {
    for (const path of ["/login", "/register", "/forgot-password"]) {
      expect(wentThrough(await visit(path)), path).toBe(true);
    }
  });

  it("sends a signed-in visitor to the study path, prefetch or not", async () => {
    signedIn();
    const plain = await visit("/login", { cookie: SESSION });
    expect(plain.headers.get("location")).toBe(`${SITE}/start`);
    const prefetch = await visit("/register", { cookie: SESSION, "next-router-prefetch": "1" });
    expect(prefetch.headers.get("location")).toBe(`${SITE}/start`);
  });
});

describe("a sign-in service that does not answer", () => {
  it("stops waiting after 3.5 seconds and treats the request as signed out", async () => {
    vi.useFakeTimers();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    supabase.getUser = () => new Promise(() => {});

    const guarded = visit("/dashboard", { cookie: SESSION });
    const open = visit("/pricing", { cookie: SESSION });
    let settled = 0;
    void guarded.then(() => (settled += 1));
    void open.then(() => (settled += 1));

    await vi.advanceTimersByTimeAsync(3400);
    expect(settled).toBe(0);
    await vi.advanceTimersByTimeAsync(100);

    const res = await guarded;
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location") ?? "").pathname).toBe("/login");
    expect(wentThrough(await open)).toBe(true);
  });

  it("treats a check that fails as signed out for this request", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    supabase.getUser = async () => {
      throw new Error("JWT issued at future");
    };
    expect(wentThrough(await visit("/pricing", { cookie: SESSION }))).toBe(true);
    const res = await visit("/dashboard", { cookie: SESSION });
    expect(new URL(res.headers.get("location") ?? "").pathname).toBe("/login");
  });
});

describe("a redirect carries the session cookies that were just refreshed", () => {
  const rotated: CookieToSet[] = [
    { name: "sb-abcdefghijklmnop-auth-token", value: "rotated-access", options: { path: "/", httpOnly: false } },
  ];

  it("on the way from a guarded page to the study path", async () => {
    signedIn();
    withoutPro();
    supabase.rotated = rotated;
    const res = await visit("/dashboard", { cookie: SESSION });
    expect(res.headers.get("location")).toBe(`${SITE}/start`);
    expect(res.headers.get("set-cookie")).toContain("sb-abcdefghijklmnop-auth-token=rotated-access");
  });

  it("on the way from a guarded page to sign in, when the session has ended", async () => {
    // A session that cannot be refreshed: the client clears its cookie.
    supabase.rotated = [{ name: "sb-abcdefghijklmnop-auth-token", value: "", options: { path: "/", maxAge: 0 } }];
    const res = await visit("/dashboard", { cookie: SESSION });
    expect(new URL(res.headers.get("location") ?? "").pathname).toBe("/login");
    expect(res.headers.get("set-cookie")).toContain("sb-abcdefghijklmnop-auth-token=;");
  });
});
