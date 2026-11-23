import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const env = vi.hoisted(() => ({ NEXT_PUBLIC_POSTHOG_KEY: "phc_test" as string | undefined }));
vi.mock("@/env", () => ({ publicEnv: env }));

import { ANALYTICS_TIME_LIMIT_MS, captureServerEvent } from "../analytics";

const fetchMock = vi.fn();

beforeEach(() => {
  env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test";
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response("{}"));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("captureServerEvent", () => {
  it("sends the event under the person's id", async () => {
    await captureServerEvent("user-1", "subscription_activated", { interval: "monthly" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://us.i.posthog.com/capture/");
    expect(JSON.parse(init.body)).toEqual({
      api_key: "phc_test",
      event: "subscription_activated",
      distinct_id: "user-1",
      properties: { interval: "monthly", $lib: "certbench-server" },
    });
  });

  it("gives every send a time limit of two seconds", async () => {
    expect(ANALYTICS_TIME_LIMIT_MS).toBe(2000);
    const timeout = vi.spyOn(AbortSignal, "timeout");
    await captureServerEvent("user-1", "lifecycle_run");
    expect(timeout).toHaveBeenCalledWith(2000);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.signal).toBe(timeout.mock.results[0].value);
  });

  it("does not throw when the send runs out of time or the service is down", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockRejectedValue(new DOMException("The operation was aborted due to timeout", "TimeoutError"));
    await expect(captureServerEvent("user-1", "server_error")).resolves.toBeUndefined();
    expect(log).toHaveBeenCalled();
  });

  it("sends nothing when no PostHog key is set", async () => {
    env.NEXT_PUBLIC_POSTHOG_KEY = undefined;
    await captureServerEvent("user-1", "lifecycle_run");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
