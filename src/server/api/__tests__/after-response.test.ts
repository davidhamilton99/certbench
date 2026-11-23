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

// The report of a fault, watched: nothing is sent anywhere from a test.
const report = vi.hoisted(() =>
  vi.fn<(error: unknown, place: { route: string; kind?: string }) => Promise<void>>(async () => {})
);
vi.mock("@/server/api/report-error", () => ({ reportServerError: report }));

import { afterResponse } from "../after-response";

const PLACE = { route: "service:after-response", kind: "service" };

beforeEach(() => {
  next.queued = [];
  next.inRequest = true;
  report.mockReset();
  report.mockResolvedValue(undefined);
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
    expect(report).not.toHaveBeenCalled();
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

  // The defect: work that failed after the response left one line in the log.
  // The visitor had been answered, so nothing else said that it had failed.
  it("reports work that failed as a server error, once, before the instance is let go", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    let reported = false;
    report.mockImplementation(async () => {
      await Promise.resolve();
      reported = true;
    });

    afterResponse(async () => {
      throw new TypeError("Cannot read properties of undefined (reading 'send')");
    });
    await next.queued[0]();

    // The work Next waits for includes the report: it is sent before the promise settles.
    expect(reported).toBe(true);
    expect(report).toHaveBeenCalledTimes(1);
    const [fault, place] = report.mock.calls[0] as unknown as [Error, typeof PLACE];
    expect(place).toEqual(PLACE);
    // The kind of error, for whoever reads the report.
    expect(fault.name).toBe("TypeError");
  });

  it("reports none of the failure's own words, which can hold an address", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const failure = new Error("The email to sam@example.com could not be delivered");

    afterResponse(async () => {
      throw failure;
    });
    await next.queued[0]();

    const [fault, place] = report.mock.calls[0] as unknown as [Error, typeof PLACE];
    expect(fault).not.toBe(failure);
    expect(fault.message).toBe("Background work failed after the response");
    expect(JSON.stringify([fault.message, fault.name, place])).not.toContain("sam@example.com");
    // The log keeps the whole error, for the person who looks the fault up.
    expect(log).toHaveBeenCalledWith("[after response] background work failed:", failure);
  });

  it("reports a failure that is not an error object", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const notAnError: unknown = "a bare string";
    afterResponse(() => {
      throw notAnError;
    });
    await next.queued[0]();
    expect(report).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenCalledWith(expect.objectContaining({ name: "Error" }), PLACE);
  });

  it("reports where there is no request to wait for, too", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    next.inRequest = false;
    afterResponse(async () => {
      throw new Error("refused");
    });
    await vi.waitFor(() => expect(report).toHaveBeenCalledTimes(1));
  });

  it("never reports a report: one that fails is logged, and nothing more is tried", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    report.mockRejectedValue(new Error("the analytics service did not answer"));

    afterResponse(async () => {
      throw new Error("the email provider refused");
    });
    await expect(next.queued[0]()).resolves.toBeUndefined();

    expect(report).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith("[after response] the failure could not be reported:", expect.any(Error));
    // Nothing was handed to after() again: the queue holds only the work that was given.
    expect(next.queued).toHaveLength(1);
  });

  it("reports nothing for work that is itself a report and settles, as a report always does", async () => {
    // reportServerError never throws: it catches its own failure and logs it.
    afterResponse(() => report(new Error("An endpoint failed"), { route: "/api/thing", kind: "route" }));
    await next.queued[0]();
    expect(report).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenCalledWith(expect.any(Error), { route: "/api/thing", kind: "route" });
  });
});
