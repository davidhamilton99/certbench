import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const next = vi.hoisted(() => ({
  /** Work handed to Next's after(), when a request is being served. */
  queued: [] as (() => Promise<void>)[],
  /** False to stand for code that runs outside a request, where after() throws. */
  inRequest: true,
}));

vi.mock("next/server", () => ({
  after: (work: () => Promise<void>) => {
    if (!next.inRequest) throw new Error("`after` was called outside a request scope.");
    next.queued.push(work);
  },
}));

import { afterResponse } from "../after-response";

beforeEach(() => {
  next.queued = [];
  next.inRequest = true;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("afterResponse", () => {
  it("leaves the work for after the response while a request is being served", async () => {
    const work = vi.fn(async () => {});
    afterResponse(work);
    expect(work).not.toHaveBeenCalled();
    expect(next.queued).toHaveLength(1);
    await next.queued[0]();
    expect(work).toHaveBeenCalledTimes(1);
  });

  it("still runs the work where there is no request to wait for", async () => {
    next.inRequest = false;
    const work = vi.fn(async () => {});
    afterResponse(work);
    await Promise.resolve();
    expect(work).toHaveBeenCalledTimes(1);
  });

  it("logs work that fails and lets the failure go no further", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    afterResponse(async () => {
      throw new Error("the email provider refused");
    });
    await expect(next.queued[0]()).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledWith("[after response] background work failed:", expect.any(Error));

    next.inRequest = false;
    afterResponse(() => {
      throw new Error("thrown at once");
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(log).toHaveBeenCalledTimes(2);
  });
});
