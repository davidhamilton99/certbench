import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const updateSession = vi.hoisted(() => vi.fn(async () => new Response("ok")));
vi.mock("@/server/supabase/middleware", () => ({ updateSession }));

import { config, proxy } from "../proxy";

/** Whether the proxy runs for a path, by its matcher. */
const runsOn = (path: string) => new RegExp(`^${config.matcher[0]}$`).test(path);

beforeEach(() => updateSession.mockClear());

describe("proxy", () => {
  it("sends a trailing-slash URL to the page's one URL, as Next would", async () => {
    const res = await proxy(new NextRequest("https://certbench.dev/objectives/network-plus-n10-009/1-3/?ref=x"));
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe("https://certbench.dev/objectives/network-plus-n10-009/1-3?ref=x");
    expect(updateSession).not.toHaveBeenCalled();
  });

  it("leaves the home page and slash-free URLs to the session refresh", async () => {
    await proxy(new NextRequest("https://certbench.dev/"));
    await proxy(new NextRequest("https://certbench.dev/pricing"));
    expect(updateSession).toHaveBeenCalledTimes(2);
  });

  it("never runs on the PostHog proxy, whose API paths end in a slash", () => {
    expect(runsOn("/ingest/e/")).toBe(false);
    expect(runsOn("/ingest/s/")).toBe(false);
    expect(runsOn("/ingest/static/recorder.js")).toBe(false);
    expect(runsOn("/_next/static/chunks/app.js")).toBe(false);
    expect(runsOn("/pricing")).toBe(true);
    expect(runsOn("/path/network-plus-n10-009")).toBe(true);
  });
});
