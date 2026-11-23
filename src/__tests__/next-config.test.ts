import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

// The config wraps itself with Sentry only when a DSN is set. Loading the
// package is slow and has nothing to do with what is checked here.
vi.mock("@sentry/nextjs", () => ({ withSentryConfig: (config: unknown) => config }));

import nextConfig from "../../next.config";

const source = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");

async function headerRules() {
  return (await nextConfig.headers?.()) ?? [];
}

describe("next.config", () => {
  it("does not name the framework in a response header", () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });

  it("switches the image optimizer endpoint off: no page uses it", () => {
    expect(nextConfig.images?.unoptimized).toBe(true);
  });

  it("leaves Vercel's image optimizer, which ignores unoptimized, no local file or remote host", () => {
    expect(nextConfig.images?.localPatterns).toEqual([]);
    expect(nextConfig.images?.remotePatterns ?? []).toEqual([]);
  });

  it("sends the security headers on every response", async () => {
    const everywhere = (await headerRules()).find((rule) => rule.source === "/:path*");
    const headers = Object.fromEntries((everywhere?.headers ?? []).map((h) => [h.key, h.value]));
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["Strict-Transport-Security"]).toContain("max-age=63072000");

    const policy = headers["Content-Security-Policy"].split(";").map((part) => part.trim());
    expect(policy).toEqual(["frame-ancestors 'none'", "base-uri 'self'", "object-src 'none'", "form-action 'self'"]);
  });

  it("has no header rule left for the service worker file that no longer exists", async () => {
    const sources = (await headerRules()).map((rule) => rule.source);
    expect(sources).not.toContain("/sw.js");
    expect(sources).toHaveLength(2);
  });

  it("still sends PostHog through this site and keeps the redirects of retired pages", async () => {
    const rewrites = await nextConfig.rewrites?.();
    expect(Array.isArray(rewrites) ? rewrites.map((r) => r.source) : []).toContain("/ingest/:path*");
    const redirects = (await nextConfig.redirects?.()) ?? [];
    expect(redirects.find((r) => r.source === "/study-materials/new")?.destination).toBe("/study-materials");
    expect(nextConfig.skipTrailingSlashRedirect).toBe(true);
  });

  it("passes Sentry no option that its package marks as deprecated", () => {
    expect(source).not.toMatch(/disableLogger|automaticVercelMonitors/);
  });
});
