import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => ({
  bootLines: 0,
  sentryServerStarts: 0,
  sentryPackageLoads: 0,
  reportRequestError: vi.fn<(...args: unknown[]) => Promise<void>>(async () => {}),
  init: vi.fn(),
  transition: vi.fn(),
}));

vi.mock("@/server/api/settings", () => ({
  logBootLines: () => {
    calls.bootLines += 1;
  },
}));
vi.mock("@/server/api/report-error", () => ({
  reportRequestError: (...args: unknown[]) => calls.reportRequestError(...args),
}));
vi.mock("../../sentry.server.config", () => {
  calls.sentryServerStarts += 1;
  return {};
});
vi.mock("@sentry/nextjs", () => {
  calls.sentryPackageLoads += 1;
  return {
    init: (...args: unknown[]) => calls.init(...args),
    replayIntegration: () => ({ name: "Replay" }),
    captureRouterTransitionStart: (...args: unknown[]) => calls.transition(...args),
  };
});

const ROOT = process.cwd();

beforeEach(() => {
  vi.resetModules();
  calls.bootLines = 0;
  calls.sentryServerStarts = 0;
  calls.sentryPackageLoads = 0;
  calls.reportRequestError.mockClear();
  calls.init.mockClear();
  calls.transition.mockClear();
  vi.stubEnv("SENTRY_DSN", undefined);
  vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", undefined);
  vi.stubEnv("NEXT_RUNTIME", "nodejs");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("where the hooks live", () => {
  it("keeps the server hook beside the app directory, where a production build looks for it", () => {
    expect(existsSync(join(ROOT, "src", "instrumentation.ts"))).toBe(true);
    expect(existsSync(join(ROOT, "instrumentation.ts"))).toBe(false);
  });

  it("has a browser hook, and no config file that a Turbopack build ignores", () => {
    expect(existsSync(join(ROOT, "src", "instrumentation-client.ts"))).toBe(true);
    expect(existsSync(join(ROOT, "sentry.client.config.ts"))).toBe(false);
    expect(existsSync(join(ROOT, "sentry.edge.config.ts"))).toBe(false);
    expect(existsSync(join(ROOT, "sentry.server.config.ts"))).toBe(true);
  });

  it("imports nothing at the top of either hook: every package is loaded where it is needed", () => {
    for (const file of ["instrumentation.ts", "instrumentation-client.ts"]) {
      const source = readFileSync(join(ROOT, "src", file), "utf8");
      const staticImports = source.split(/\r?\n/).filter((line) => /^import\s/.test(line) && !/^import type\s/.test(line));
      expect(staticImports, file).toEqual([]);
    }
  });
});

describe("register", () => {
  it("writes the settings line as a server instance starts", async () => {
    const { register } = await import("../instrumentation");
    await register();
    expect(calls.bootLines).toBe(1);
  });

  it("does not start Sentry, or load it, without a DSN", async () => {
    const { register } = await import("../instrumentation");
    await register();
    expect(calls.sentryServerStarts).toBe(0);
    expect(calls.sentryPackageLoads).toBe(0);
  });

  it("starts Sentry on the server when a DSN is set", async () => {
    vi.stubEnv("SENTRY_DSN", "https://key@o1.ingest.sentry.io/1");
    const { register } = await import("../instrumentation");
    await register();
    expect(calls.sentryServerStarts).toBe(1);
  });

  it("does nothing outside the Node.js runtime", async () => {
    vi.stubEnv("NEXT_RUNTIME", "edge");
    vi.stubEnv("SENTRY_DSN", "https://key@o1.ingest.sentry.io/1");
    const { register } = await import("../instrumentation");
    await register();
    expect(calls.bootLines).toBe(0);
    expect(calls.sentryServerStarts).toBe(0);
  });
});

describe("onRequestError", () => {
  it("hands a failed request to the error report", async () => {
    const { onRequestError } = await import("../instrumentation");
    const error = Object.assign(new Error("render failed"), { digest: "123" });
    const request = { path: "/pricing", method: "GET", headers: {} };
    const context = {
      routerKind: "App Router" as const,
      routePath: "/pricing",
      routeType: "render" as const,
      revalidateReason: undefined,
    };
    await onRequestError(error, request, context);
    expect(calls.reportRequestError).toHaveBeenCalledWith(error, request, context);
  });
});

describe("the browser hook", () => {
  it("requests nothing from Sentry in a build without a DSN", async () => {
    const hook = await import("../instrumentation-client");
    await Promise.resolve();
    expect(calls.sentryPackageLoads).toBe(0);
    expect(calls.init).not.toHaveBeenCalled();
    // Next calls this on every navigation: it must be safe before Sentry exists.
    expect(() => hook.onRouterTransitionStart("/pricing", "push")).not.toThrow();
    expect(calls.transition).not.toHaveBeenCalled();
  });

  it("loads and starts Sentry in a build with a DSN, and then reports navigations", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://key@o1.ingest.sentry.io/1");
    const hook = await import("../instrumentation-client");
    await vi.waitFor(() => expect(calls.init).toHaveBeenCalledTimes(1));
    expect(calls.init.mock.calls[0][0]).toMatchObject({
      dsn: "https://key@o1.ingest.sentry.io/1",
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 1,
    });
    hook.onRouterTransitionStart("/pricing", "push");
    expect(calls.transition).toHaveBeenCalledWith("/pricing", "push");
  });
});
