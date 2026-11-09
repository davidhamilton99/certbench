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

  it("sends an old post-checkout link to the path, never the workspace", async () => {
    const back = await proxy(
      new NextRequest("https://certbench.dev/upgrade?upgraded=true&next=%2Fpath%2Fnetwork-plus-n10-009")
    );
    expect(back.status).toBe(307);
    expect(back.headers.get("location")).toBe("https://certbench.dev/path/network-plus-n10-009?upgraded=1");

    const bare = await proxy(new NextRequest("https://certbench.dev/upgrade?upgraded=true"));
    expect(bare.headers.get("location")).toBe("https://certbench.dev/start?upgraded=1");

    const offsite = await proxy(new NextRequest("https://certbench.dev/upgrade?upgraded=true&next=https://evil.example"));
    expect(offsite.headers.get("location")).toBe("https://certbench.dev/start?upgraded=1");
    expect(updateSession).not.toHaveBeenCalled();
  });

  it("leaves the plan page itself to the session refresh", async () => {
    await proxy(new NextRequest("https://certbench.dev/upgrade"));
    await proxy(new NextRequest("https://certbench.dev/upgrade?reason=pbq"));
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
