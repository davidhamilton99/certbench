import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { EndpointContract } from "@/contracts/common";
import { ApiError } from "@/contracts/errors";
import { lazyContract } from "@/contracts/lazy";
import { CONNECTION_LOST, PAGE_OUT_OF_DATE, REQUEST_TIMED_OUT, userMessage } from "@/lib/errors/user-message";
import { api } from "../api-client";

const save = {
  path: "/api/thing",
  method: "POST",
  input: z.object({ name: z.string() }),
  output: z.object({ ok: z.boolean() }),
} satisfies EndpointContract;

const read = {
  path: "/api/thing",
  method: "GET",
  input: z.object({ id: z.string() }),
  output: z.object({ name: z.string() }),
} satisfies EndpointContract;

function respond(status: number, body: unknown) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("api()", () => {
  it("posts the input as JSON and returns the validated output", async () => {
    const fetchMock = respond(200, { ok: true, extra: "dropped" });
    vi.stubGlobal("fetch", fetchMock);
    await expect(api(save, { name: "a" })).resolves.toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/thing");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ name: "a" }));
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("puts a GET's input in the address", async () => {
    const fetchMock = respond(200, { name: "n" });
    vi.stubGlobal("fetch", fetchMock);
    await api(read, { id: "7" });
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toBe("/api/thing?id=7");
  });

  it("starts the request before a lazy contract's schemas have arrived", async () => {
    const order: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        order.push("request");
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      })
    );
    const lazy = lazyContract<typeof save>("/api/thing", "POST", async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      order.push("schemas");
      return save;
    });
    await expect(api(lazy, { name: "a" })).resolves.toEqual({ ok: true });
    expect(order).toEqual(["request", "schemas"]);
  });

  it("throws the endpoint's own code and sentence", async () => {
    vi.stubGlobal("fetch", respond(402, { error: { code: "quota_exceeded", message: "You have used your 10 free questions for today." } }));
    const err = await api(save, { name: "a" }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("quota_exceeded");
    expect(userMessage(err)).toBe("You have used your 10 free questions for today.");
  });

  it("does not trust a body that is not the error envelope", async () => {
    vi.stubGlobal("fetch", respond(502, { error: { code: "made_up", message: "x" } }));
    const err = await api(save, { name: "a" }).catch((e) => e);
    expect(err.code).toBe("internal");
    expect(userMessage(err)).toMatch(/^The request could not be completed\./);
  });

  it("says the connection was lost when the request cannot be made", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      })
    );
    const err = await api(save, { name: "a" }).catch((e) => e);
    expect(userMessage(err)).toBe(CONNECTION_LOST);
  });

  it("says the request took too long when its time limit passes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        const e = new Error("The operation timed out.");
        e.name = "TimeoutError";
        throw e;
      })
    );
    const err = await api(save, { name: "a" }).catch((e) => e);
    expect(userMessage(err)).toBe(REQUEST_TIMED_OUT);
  });

  // A new version of the site published while a page is open takes the old
  // schema file away. The server has answered, so the connection is there:
  // the page must say to reload, and must not say to try again (the request
  // was carried out).
  it("says the page is out of date when the schemas cannot be fetched after the server answered", async () => {
    vi.stubGlobal("fetch", respond(200, { ok: true }));
    const load = vi.fn(async (): Promise<typeof save> => {
      throw new Error("Failed to fetch dynamically imported module");
    });
    const lazy = lazyContract<typeof save>("/api/thing", "POST", load);
    const err = await api(lazy, { name: "a" }).catch((e) => e);
    expect(userMessage(err)).toBe(PAGE_OUT_OF_DATE);
    expect(userMessage(err)).not.toMatch(/try again/i);
    // One request to the server, and the file was asked for twice.
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("reads the answer when the schemas arrive at the second attempt", async () => {
    vi.stubGlobal("fetch", respond(200, { ok: true }));
    let calls = 0;
    const lazy = lazyContract<typeof save>("/api/thing", "POST", async () => {
      calls += 1;
      if (calls === 1) throw new Error("Failed to fetch dynamically imported module");
      return save;
    });
    await expect(api(lazy, { name: "a" })).resolves.toEqual({ ok: true });
    expect(calls).toBe(2);
  });

  it("passes keepalive through for a last save", async () => {
    const fetchMock = respond(200, { ok: true });
    vi.stubGlobal("fetch", fetchMock);
    await api(save, { name: "a" }, { keepalive: true });
    expect((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].keepalive).toBe(true);
  });
});
