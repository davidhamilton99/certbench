// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

const CERT = "security-plus-sy0-701";
const KEY = `cb_path_start_owed_${CERT}`;

/** A fresh copy of the module (its memory of what it has read) over a fresh store. */
async function fresh(store: Record<string, string> = {}) {
  vi.resetModules();
  const calls = { get: 0 };
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => {
        calls.get++;
        return k in store ? store[k] : null;
      },
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
    },
  });
  return { ...(await import("../path-start")), store, calls };
}

describe("the path start a public page leaves owed", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("is owed after a public page's answer began the copy, and is taken once", async () => {
    const { oweStartEvent, takeOwedStartEvent, store } = await fresh();

    oweStartEvent(CERT);
    expect(store[KEY]).toBe("1");

    expect(takeOwedStartEvent(CERT)).toBe(true);
    expect(store[KEY]).toBeUndefined();
    // The second answer on the path page records nothing more.
    expect(takeOwedStartEvent(CERT)).toBe(false);
  });

  it("is not owed on a device where no public page began the copy", async () => {
    const { takeOwedStartEvent } = await fresh();
    expect(takeOwedStartEvent(CERT)).toBe(false);
  });

  it("is kept across a page load: the home page marks it, the path page takes it", async () => {
    const home = await fresh();
    home.oweStartEvent(CERT);

    const path = await fresh(home.store);
    expect(path.takeOwedStartEvent(CERT)).toBe(true);
    expect(path.takeOwedStartEvent(CERT)).toBe(false);
  });

  it("is kept for each exam separately", async () => {
    const { oweStartEvent, takeOwedStartEvent } = await fresh();
    oweStartEvent(CERT);
    expect(takeOwedStartEvent("network-plus-n10-009")).toBe(false);
    expect(takeOwedStartEvent(CERT)).toBe(true);
  });

  it("reads the device once for an exam, however many answers follow", async () => {
    const { takeOwedStartEvent, calls } = await fresh();
    for (let i = 0; i < 20; i++) takeOwedStartEvent(CERT);
    expect(calls.get).toBe(1);
  });

  it("can be owed again in the same tab after it was found clear", async () => {
    const { oweStartEvent, takeOwedStartEvent } = await fresh();
    expect(takeOwedStartEvent(CERT)).toBe(false);
    oweStartEvent(CERT);
    expect(takeOwedStartEvent(CERT)).toBe(true);
  });

  it("owes nothing, and throws nothing, in a browser that refuses storage", async () => {
    vi.resetModules();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: () => {
          throw new Error("The operation is insecure.");
        },
        setItem: () => {
          throw new Error("The operation is insecure.");
        },
        removeItem: () => {
          throw new Error("The operation is insecure.");
        },
      },
    });
    const { oweStartEvent, takeOwedStartEvent } = await import("../path-start");
    expect(() => oweStartEvent(CERT)).not.toThrow();
    expect(takeOwedStartEvent(CERT)).toBe(false);
  });
});
