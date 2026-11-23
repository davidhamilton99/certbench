import { describe, expect, it } from "vitest";
import * as client from "../client";
import { isLazyContract } from "../lazy";

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
