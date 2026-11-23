import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bootLines, logBootLines, settingFlags } from "../settings";

const NAMES = [
  "RESEND_API_KEY",
  "CRON_SECRET",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "NEXT_PUBLIC_POSTHOG_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

/** Values that would be recognized at once if one were ever printed. */
const SECRETS: Record<string, string> = {
  RESEND_API_KEY: "re_SECRET_resend",
  CRON_SECRET: "SECRET_cron",
  STRIPE_SECRET_KEY: "sk_live_SECRET_stripe",
  STRIPE_WEBHOOK_SECRET: "whsec_SECRET_webhook",
  NEXT_PUBLIC_POSTHOG_KEY: "phc_SECRET_posthog",
  SUPABASE_SERVICE_ROLE_KEY: "SECRET_service_role",
};

function setAll() {
  for (const name of NAMES) vi.stubEnv(name, SECRETS[name]);
}

beforeEach(() => {
  for (const name of NAMES) vi.stubEnv(name, "");
  vi.stubEnv("ADDON_CERTS", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("settingFlags", () => {
  it("answers true for every setting that is present", () => {
    setAll();
    expect(settingFlags()).toEqual({
      resend: true,
      cron: true,
      stripe: true,
      webhook: true,
      posthog: true,
      serviceRole: true,
    });
  });

  it("answers false for every setting that is absent or empty", () => {
    expect(settingFlags()).toEqual({
      resend: false,
      cron: false,
      stripe: false,
      webhook: false,
      posthog: false,
      serviceRole: false,
    });
  });

  it("answers for each setting by itself", () => {
    vi.stubEnv("CRON_SECRET", SECRETS.CRON_SECRET);
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", SECRETS.STRIPE_WEBHOOK_SECRET);
    expect(settingFlags()).toMatchObject({ cron: true, webhook: true, resend: false, stripe: false });
  });

  it("holds true and false only, never a value", () => {
    setAll();
    const flags = settingFlags();
    for (const value of Object.values(flags)) expect(typeof value).toBe("boolean");
    expect(JSON.stringify(flags)).not.toContain("SECRET");
  });
});

describe("bootLines", () => {
  it("writes one line with every flag, and no warning when everything is set", () => {
    setAll();
    const { summary, warnings } = bootLines();
    expect(summary).toBe(
      "[boot] settings: resend=true cron=true stripe=true webhook=true posthog=true serviceRole=true"
    );
    expect(warnings).toEqual([]);
  });

  it("says what each absent setting switches off", () => {
    setAll();
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("CRON_SECRET", "");
    const { summary, warnings } = bootLines();
    expect(summary).toContain("resend=false cron=false stripe=true");
    expect(warnings).toEqual([
      "[boot] RESEND_API_KEY is not set: no email is sent.",
      "[boot] CRON_SECRET is not set: the daily email job fails before it starts.",
    ]);
  });

  it("warns when ADDON_CERTS is on, because it lets any account add an exam without paying", () => {
    setAll();
    expect(bootLines().warnings).toEqual([]);
    vi.stubEnv("ADDON_CERTS", "true");
    expect(bootLines().warnings).toEqual([
      "[boot] ADDON_CERTS is set to true: any account can add an exam without paying. It must stay unset.",
    ]);
  });

  it("never prints a value", () => {
    setAll();
    vi.stubEnv("ADDON_CERTS", "true");
    const { summary, warnings } = bootLines();
    expect([summary, ...warnings].join("\n")).not.toContain("SECRET");
  });
});

describe("logBootLines", () => {
  it("writes the summary and the warnings to the server log", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    setAll();
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
    logBootLines();
    expect(info).toHaveBeenCalledTimes(1);
    expect(info.mock.calls[0][0]).toContain("webhook=false");
    expect(warn).toHaveBeenCalledWith("[boot] STRIPE_WEBHOOK_SECRET is not set: no payment is confirmed.");
  });
});
