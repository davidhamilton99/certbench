import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DeadlineError,
  fetchWithTimeLimit,
  SESSION_CHECK_LIMIT_MS,
  SUPABASE_TIME_LIMIT_MS,
  withDeadline,
} from "../time-limit";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("the limits", () => {
  it("gives a Supabase request 8 seconds and the session check 3.5 seconds", () => {
    expect(SUPABASE_TIME_LIMIT_MS).toBe(8000);
    expect(SESSION_CHECK_LIMIT_MS).toBe(3500);
  });
});

describe("fetchWithTimeLimit", () => {
  it("sends every request with a signal that ends it after the limit", async () => {
    const fetchMock = vi.fn(async () => new Response("ok"));
    vi.stubGlobal("fetch", fetchMock);
    const timeout = vi.spyOn(AbortSignal, "timeout");

    await fetchWithTimeLimit()("https://example.supabase.co/rest/v1/profiles", { method: "GET" });

    expect(timeout).toHaveBeenCalledWith(SUPABASE_TIME_LIMIT_MS);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://example.supabase.co/rest/v1/profiles");
    expect(init.method).toBe("GET");
    expect(init.signal).toBe(timeout.mock.results[0].value);
  });

  it("keeps the caller's own signal working beside the limit", async () => {
    const fetchMock = vi.fn(async () => new Response("ok"));
    vi.stubGlobal("fetch", fetchMock);
    const own = new AbortController();

    await fetchWithTimeLimit(50)("https://example.supabase.co/auth/v1/user", { signal: own.signal });

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const signal = init.signal as AbortSignal;
    expect(signal.aborted).toBe(false);
    own.abort();
    expect(signal.aborted).toBe(true);
  });

  it("ends a request that has not answered within the limit", async () => {
    // A service that never answers: the request settles only when its signal ends it.
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_input: unknown, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
          })
      )
    );
    await expect(fetchWithTimeLimit(20)("https://example.supabase.co/rest/v1/x")).rejects.toMatchObject({
      name: "TimeoutError",
    });
  });
});

describe("withDeadline", () => {
  it("gives the result of work that finishes in time", async () => {
    await expect(withDeadline(Promise.resolve("done"), 1000, "The work")).resolves.toBe("done");
  });

  it("passes on the failure of work that fails in time", async () => {
    await expect(withDeadline(Promise.reject(new Error("refused")), 1000, "The work")).rejects.toThrow("refused");
  });

  it("stops waiting once the time has passed, and says what ran out of time", async () => {
    vi.useFakeTimers();
    const never = new Promise<string>(() => {});
    const result = withDeadline(never, SESSION_CHECK_LIMIT_MS, "The session check");
    const outcome = expect(result).rejects.toBeInstanceOf(DeadlineError);
    await vi.advanceTimersByTimeAsync(SESSION_CHECK_LIMIT_MS);
    await outcome;
    await expect(result).rejects.toThrow("The session check did not finish within 3500 ms.");
  });

  it("does not leave a timer running after the work has settled", async () => {
    vi.useFakeTimers();
    await withDeadline(Promise.resolve(1), 5000, "The work");
    expect(vi.getTimerCount()).toBe(0);
  });
});
