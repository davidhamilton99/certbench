import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const limiter = vi.hoisted(() => ({ check: vi.fn<(...args: unknown[]) => Promise<boolean>>(async () => true) }));

vi.mock("@/server/auth", () => ({
  getOptionalUser: async () => ({ db: {}, user: null }),
  requireUser: vi.fn(),
  requireAdmin: vi.fn(),
  requirePro: vi.fn(),
}));
vi.mock("@/server/rate-limit", () => ({ rateLimiter: limiter }));
vi.mock("@/server/api/report-error", () => ({ reportServerError: vi.fn(async () => {}) }));
vi.mock("@/server/data/certifications", () => ({
  listActiveCertifications: async () => [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }, { id: "e" }],
}));

import { GET } from "../route";
import { health } from "@/contracts/health";

const NAMES = [
  "RESEND_API_KEY",
  "CRON_SECRET",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "NEXT_PUBLIC_POSTHOG_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "EMAIL_POSTAL_ADDRESS",
  "LINK_SIGNING_SECRET",
];

const call = () => GET(new NextRequest("https://certbench.dev/api/health"));

beforeEach(() => {
  limiter.check.mockClear();
  for (const name of NAMES) vi.stubEnv(name, "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/health", () => {
  it("answers that the pipeline ran, in the shape the contract promises", async () => {
    const res = await call();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(health.output.safeParse(body).success).toBe(true);
    expect(body).toMatchObject({ ok: true, certifications: 5, authenticated: false });
    expect(limiter.check).toHaveBeenCalledWith(expect.stringContaining("/api/health:"), { limit: 30, windowSeconds: 60 });
  });

  it("says which settings the deployment has, as true or false", async () => {
    expect((await (await call()).json()).settings).toEqual({
      resend: false,
      cron: false,
      stripe: false,
      webhook: false,
      posthog: false,
      serviceRole: false,
      postalAddress: false,
      linkSigning: false,
    });

    vi.stubEnv("RESEND_API_KEY", "re_SECRET_value");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_SECRET_value");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "SECRET_value");
    expect((await (await call()).json()).settings).toEqual({
      resend: true,
      cron: false,
      stripe: true,
      webhook: false,
      posthog: false,
      serviceRole: true,
      postalAddress: false,
      linkSigning: false,
    });
  });

  it("says whether the emails have a postal address to print, and never the address", async () => {
    vi.stubEnv("EMAIL_POSTAL_ADDRESS", "1 SECRET Street, Example Town, EX 00000, Canada");
    const res = await call();
    const text = await res.text();
    const body = JSON.parse(text);
    expect(body.settings.postalAddress).toBe(true);
    // The answer still has the shape the contract promises, with the new flag in it.
    expect(health.output.safeParse(body).success).toBe(true);
    expect(health.output.shape.settings.shape).toHaveProperty("postalAddress");
    expect(text).not.toContain("SECRET");
    expect(text).not.toContain("Example Town");
  });

  it("never returns a value", async () => {
    for (const name of NAMES) vi.stubEnv(name, `SECRET_${name}`);
    const text = await (await call()).text();
    expect(text).not.toContain("SECRET");
    for (const value of Object.values(JSON.parse(text).settings)) expect(value).toBe(true);
  });
});
