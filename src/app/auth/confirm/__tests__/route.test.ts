import { beforeEach, describe, expect, it, vi } from "vitest";

const otp = vi.hoisted(() => ({
  error: null as null | { message: string },
  calls: [] as { type: string; token_hash: string }[],
}));

vi.mock("@/server/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      verifyOtp: async (args: { type: string; token_hash: string }) => {
        otp.calls.push(args);
        return { error: otp.error };
      },
    },
  }),
}));

import { GET } from "@/app/auth/confirm/route";

const ORIGIN = "https://certbench.dev";

async function arrive(params: Record<string, string>) {
  const res = await GET(new Request(`${ORIGIN}/auth/confirm?${new URLSearchParams(params)}`));
  return res.headers.get("location");
}

beforeEach(() => {
  otp.error = null;
  otp.calls = [];
});

describe("a link from an email", () => {
  it("checks the token and goes on to the page the link names", async () => {
    expect(await arrive({ token_hash: "hash", type: "recovery", next: "/reset-password" })).toBe(
      `${ORIGIN}/reset-password`
    );
    expect(otp.calls).toEqual([{ type: "recovery", token_hash: "hash" }]);
  });

  it("goes to the exam list when the link names no page", async () => {
    expect(await arrive({ token_hash: "hash", type: "signup" })).toBe(`${ORIGIN}/start`);
  });

  it.each(["//evil.com/x", "https://evil.com/x", "/\\evil.com", "javascript:alert(1)", "@evil.com"])(
    "never leaves the site for the address %s",
    async (next) => {
      expect(await arrive({ token_hash: "hash", type: "recovery", next })).toBe(`${ORIGIN}/start`);
    }
  );

  it("sends a link that has expired or was used already to the sign-in page, which says so", async () => {
    otp.error = { message: "Token has expired or is invalid" };
    expect(await arrive({ token_hash: "hash", type: "recovery", next: "/reset-password" })).toBe(
      `${ORIGIN}/login?error=auth`
    );
  });

  it("does the same for a link with no token, without asking the sign-in service", async () => {
    expect(await arrive({ next: "/reset-password" })).toBe(`${ORIGIN}/login?error=auth`);
    expect(await arrive({ token_hash: "hash" })).toBe(`${ORIGIN}/login?error=auth`);
    expect(otp.calls).toEqual([]);
  });
});
