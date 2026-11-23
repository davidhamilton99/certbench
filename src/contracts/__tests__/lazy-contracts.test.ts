import { describe, expect, it, vi } from "vitest";
import * as client from "../client";
import type { EndpointContract } from "../common";
import { isLazyContract, warmContracts, type LazyContract } from "../lazy";

/**
 * A lazy contract writes an endpoint's path and method a second time, apart
 * from the contract that owns them. This holds every pair to its contract, so
 * the two cannot drift.
 */
describe("lazy contracts", () => {
  const entries = Object.entries(client);

  it("names the endpoints public pages call", () => {
    expect(entries.length).toBeGreaterThanOrEqual(14);
    for (const [, value] of entries) expect(isLazyContract(value)).toBe(true);
  });

  it.each(entries)("%s has the path and method of its contract", async (name, lazy) => {
    const full = await lazy.load();
    expect(full, name).toBeTruthy();
    expect(lazy.path).toBe(full.path);
    expect(lazy.method).toBe(full.method);
    expect(typeof full.output.parse).toBe("function");
  });
});

describe("warmContracts", () => {
  /** A lazy contract whose fetch is watched. */
  const watched = (load: () => Promise<EndpointContract>): LazyContract => ({ path: "/api/thing", method: "POST", load });

  it("fetches each endpoint's schemas in the background", () => {
    const loads = [
      vi.fn((): Promise<EndpointContract> => client.getPathProgress.load()),
      vi.fn((): Promise<EndpointContract> => client.savePathProgress.load()),
    ];
    warmContracts(loads.map(watched));
    for (const load of loads) expect(load).toHaveBeenCalledOnce();
  });

  it("leaves a failed fetch for the first real call, without an unhandled rejection", async () => {
    const load = vi.fn(async (): Promise<EndpointContract> => {
      throw new Error("Failed to fetch dynamically imported module");
    });
    expect(() => warmContracts([watched(load)])).not.toThrow();
    // The rejection is consumed inside: give it a turn to surface if it were not.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(load).toHaveBeenCalledOnce();
  });
});
