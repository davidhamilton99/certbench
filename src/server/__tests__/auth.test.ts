import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/contracts/common";

type Result = { data: unknown; error: { message: string } | null };

const session = vi.hoisted(() => ({
  getUser: (async () => ({ data: { user: null } })) as () => Promise<{ data: { user: { id: string } | null } }>,
  subscription: { data: null, error: null } as Result,
  profile: { data: null, error: null } as Result,
}));

vi.mock("@/server/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: () => session.getUser() },
    from: (table: string) => {
      const builder = {
        select: () => builder,
        eq: () => builder,
        maybeSingle: async () => (table === "user_subscriptions" ? session.subscription : session.profile),
      };
      return builder;
    },
  }),
}));
// Next's redirect() ends the render by throwing: the stand-in does the same.
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`);
  },
}));

import {
  getOptionalUser,
  requireAdmin,
  requirePro,
  requireProPage,
  requireUser,
  requireUserPage,
} from "../auth";

const NOT_CHECKED = "Your account could not be checked. Please try again.";
const ok = (data: unknown): Result => ({ data, error: null });
const failed = (message: string): Result => ({ data: null, error: { message } });

const signedIn = () => {
  session.getUser = async () => ({ data: { user: { id: "user-1" } } });
};

async function refusal(work: Promise<unknown>): Promise<ApiError> {
  const outcome = await work.then(
    (value) => value,
    (error: unknown) => error
  );
  expect(outcome).toBeInstanceOf(ApiError);
  return outcome as ApiError;
}

beforeEach(() => {
  session.getUser = async () => ({ data: { user: null } });
  session.subscription = ok(null);
  session.profile = ok(null);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("getOptionalUser", () => {
  it("answers with the signed-in user", async () => {
    signedIn();
    expect((await getOptionalUser()).user).toEqual({ id: "user-1" });
  });

  it("treats a session check that fails as signed out, instead of failing the request", async () => {
    session.getUser = async () => {
      throw new Error("JWT issued at future");
    };
    expect((await getOptionalUser()).user).toBeNull();
  });

  it("stops waiting for the sign-in service after 3.5 seconds", async () => {
    vi.useFakeTimers();
    session.getUser = () => new Promise(() => {});
    const pending = getOptionalUser();
    let settled = false;
    void pending.then(() => (settled = true));
    await vi.advanceTimersByTimeAsync(3400);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(100);
    expect((await pending).user).toBeNull();
  });
});

describe("requireUser", () => {
  it("refuses a signed-out request", async () => {
    expect((await refusal(requireUser())).code).toBe("unauthorized");
  });
});

describe("requirePro", () => {
  beforeEach(signedIn);

  it("lets an active or trialing Pro member through", async () => {
    for (const status of ["active", "trialing"]) {
      session.subscription = ok({ plan: "pro", status });
      expect((await requirePro()).user.id).toBe("user-1");
    }
  });

  it("lets the owner through without Pro", async () => {
    session.profile = ok({ role: "admin" });
    expect((await requirePro()).user.id).toBe("user-1");
  });

  it("refuses an account without Pro", async () => {
    session.subscription = ok({ plan: "free", status: "active" });
    session.profile = ok({ role: "user" });
    expect((await refusal(requirePro())).code).toBe("forbidden");
  });

  it("does not say 'Pro required' when the plan could not be read", async () => {
    session.subscription = failed("connection refused");
    const error = await refusal(requirePro());
    expect(error.code).toBe("internal");
    expect(error.message).toBe(NOT_CHECKED);
  });

  it("does not say 'Pro required' when the role could not be read", async () => {
    session.profile = failed("timeout");
    const error = await refusal(requirePro());
    expect(error.code).toBe("internal");
    expect(error.message).toBe(NOT_CHECKED);
  });
});

describe("requireAdmin", () => {
  beforeEach(signedIn);

  it("lets the owner through and refuses everyone else", async () => {
    session.profile = ok({ role: "admin" });
    expect((await requireAdmin()).user.id).toBe("user-1");
    session.profile = ok({ role: "user" });
    expect((await refusal(requireAdmin())).code).toBe("forbidden");
  });

  it("does not answer 'forbidden' when the role could not be read", async () => {
    session.profile = failed("timeout");
    const error = await refusal(requireAdmin());
    expect(error.code).toBe("internal");
    expect(error.message).toBe(NOT_CHECKED);
  });
});

describe("requireProPage and requireUserPage", () => {
  it("send a signed-out visitor to sign in", async () => {
    await expect(requireProPage()).rejects.toThrow("redirect:/login");
    await expect(requireUserPage()).rejects.toThrow("redirect:/login");
  });

  it("sends a member without Pro to the study path, and lets them open a page for every account", async () => {
    signedIn();
    session.subscription = ok({ plan: "free", status: "active" });
    session.profile = ok({ role: "user" });
    await expect(requireProPage()).rejects.toThrow("redirect:/start");
    expect((await requireUserPage()).user.id).toBe("user-1");
  });

  it("lets a Pro member and the owner open a Pro page", async () => {
    signedIn();
    session.subscription = ok({ plan: "pro", status: "active" });
    expect((await requireProPage()).user.id).toBe("user-1");
    session.subscription = ok(null);
    session.profile = ok({ role: "admin" });
    expect((await requireProPage()).user.id).toBe("user-1");
  });

  it("does not wall a member when the account could not be read", async () => {
    signedIn();
    session.subscription = failed("connection refused");
    expect((await requireProPage()).user.id).toBe("user-1");
    session.subscription = ok(null);
    session.profile = failed("timeout");
    expect((await requireProPage()).user.id).toBe("user-1");
  });
});
