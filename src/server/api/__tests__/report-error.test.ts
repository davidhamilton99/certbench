import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const capture = vi.hoisted(() => vi.fn<(...args: unknown[]) => Promise<void>>(async () => {}));
const sentry = vi.hoisted(() => ({
  /** How many times the Sentry package has been loaded. */
  loads: 0,
  captureException: vi.fn(),
  captureRequestError: vi.fn(),
}));

vi.mock("@/server/analytics", () => ({ captureServerEvent: capture }));
vi.mock("@sentry/nextjs", () => {
  sentry.loads += 1;
  return { captureException: sentry.captureException, captureRequestError: sentry.captureRequestError };
});

import { reportRequestError, reportServerError, SERVER_ID, serverErrorEvent } from "../report-error";

const request = (path: string) => ({
  path,
  method: "GET",
  headers: { cookie: "sb-abc-auth-token=secret", "x-forwarded-for": "203.0.113.7" },
});
const page = (routePath: string) => ({ routerKind: "App Router", routePath, routeType: "render" });

beforeEach(() => {
  capture.mockClear();
  sentry.captureException.mockClear();
  sentry.captureRequestError.mockClear();
  // Unset, as in a deployment that has never been given a DSN.
  vi.stubEnv("SENTRY_DSN", undefined);
  vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("serverErrorEvent", () => {
  it("says where the error happened and what kind it was", () => {
    const error = Object.assign(new TypeError("x is not a function"), { digest: "3513353068" });
    expect(
      serverErrorEvent(error, { route: "/path/[cert]", path: "/path/security-plus-sy0-701", method: "GET", kind: "render" })
    ).toEqual({
      route: "/path/[cert]",
      path: "/path/security-plus-sy0-701",
      method: "GET",
      kind: "render",
      digest: "3513353068",
      error_name: "TypeError",
      $process_person_profile: false,
    });
  });

  it("never carries the error's own words, which can hold what a member typed", () => {
    const error = new Error('duplicate key value violates unique constraint: Key (email)=(member@example.com)');
    const event = serverErrorEvent(error, { route: "/api/user/profile", path: "/api/user/profile", method: "POST" });
    expect(JSON.stringify(event)).not.toContain("member@example.com");
    expect(event).not.toHaveProperty("message");
  });

  it("leaves the query string out of the address", () => {
    const event = serverErrorEvent(new Error("x"), {
      route: "/objectives/[cert]/[code]",
      path: "/objectives/security-plus-sy0-701/1-2?email=member@example.com&utm_source=mail#top",
    });
    expect(event.path).toBe("/objectives/security-plus-sy0-701/1-2");
  });

  it("reports the route in place of an address that can hold a token or an account's id", () => {
    const cases: [string, string][] = [
      ["/readiness/[token]", "/readiness/eyJ1IjoidXNlci0xIn0.c2lnbmF0dXJl"],
      ["/share/[setId]", "/share/2b1f3c9e-1111-4222-8333-444455556666"],
      ["/certifications/[certId]/domain/[domainId]", "/certifications/abc/domain/def"],
      ["/unknown/[...rest]", "/unknown/a/b/c"],
    ];
    for (const [route, path] of cases) {
      const event = serverErrorEvent(new Error("x"), { route, path });
      expect(event.path, route).toBe(route);
      expect(JSON.stringify(event), route).not.toContain(path);
    }
  });

  it("copes with something thrown that is not an Error", () => {
    const event = serverErrorEvent("a string was thrown", { route: "/pricing", path: "/pricing" });
    expect(event.error_name).toBe("string");
    expect(event.digest).toBeUndefined();
    expect(JSON.stringify(event)).not.toContain("a string was thrown");
  });
});

describe("reportServerError", () => {
  const place = { route: "/api/path/progress", path: "/api/path/progress", method: "GET", kind: "route" };

  it("records one server_error event, filed under the server and not under a person", async () => {
    await reportServerError(new Error("boom"), place);
    expect(capture).toHaveBeenCalledTimes(1);
    const [id, event, properties] = capture.mock.calls[0];
    expect(id).toBe(SERVER_ID);
    expect(id).toBe("certbench-server");
    expect(event).toBe("server_error");
    expect(properties).toMatchObject({ route: "/api/path/progress", method: "GET", error_name: "Error" });
  });

  it("does not load Sentry in a deployment without a DSN", async () => {
    const before = sentry.loads;
    await reportServerError(new Error("boom"), place);
    expect(sentry.loads).toBe(before);
    expect(sentry.captureException).not.toHaveBeenCalled();
  });

  it("sends the error to Sentry as well when a DSN is set", async () => {
    vi.stubEnv("SENTRY_DSN", "https://key@o1.ingest.sentry.io/1");
    const error = new Error("boom");
    await reportServerError(error, place);
    expect(sentry.captureException).toHaveBeenCalledWith(error);
    expect(capture).toHaveBeenCalledTimes(1);
  });

  it("never throws, whatever happens to the report", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    capture.mockRejectedValueOnce(new Error("analytics is down"));
    await expect(reportServerError(new Error("boom"), place)).resolves.toBeUndefined();
    expect(log).toHaveBeenCalled();
  });
});

describe("reportRequestError", () => {
  it("records what Next caught, without headers, cookies or the query string", async () => {
    const error = Object.assign(new Error("render failed"), { digest: "1234567890" });
    await reportRequestError(error, request("/pricing?plan=quarterly"), page("/pricing"));

    expect(capture).toHaveBeenCalledTimes(1);
    const [id, event, properties] = capture.mock.calls[0];
    expect(id).toBe("certbench-server");
    expect(event).toBe("server_error");
    expect(properties).toEqual({
      route: "/pricing",
      path: "/pricing",
      method: "GET",
      kind: "render",
      digest: "1234567890",
      error_name: "Error",
      $process_person_profile: false,
    });
    const sent = JSON.stringify(capture.mock.calls[0]);
    expect(sent).not.toContain("secret");
    expect(sent).not.toContain("203.0.113.7");
    expect(sent).not.toContain("quarterly");
  });

  it("passes the error to Sentry only when a DSN is set", async () => {
    const error = new Error("render failed");
    await reportRequestError(error, request("/pricing"), page("/pricing"));
    expect(sentry.captureRequestError).not.toHaveBeenCalled();

    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://key@o1.ingest.sentry.io/1");
    const req = request("/pricing");
    const ctx = page("/pricing");
    await reportRequestError(error, req, ctx);
    expect(sentry.captureRequestError).toHaveBeenCalledWith(error, req, ctx);
  });

  it("never throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    capture.mockRejectedValueOnce(new Error("analytics is down"));
    await expect(reportRequestError(new Error("x"), request("/"), page("/"))).resolves.toBeUndefined();
  });
});
