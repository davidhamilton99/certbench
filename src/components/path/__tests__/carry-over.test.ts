// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { CORE1_V15 } from "@/data/a-plus-v15";
import { carryOverPreV15Path } from "../carry-over";
import { readLocalPath } from "../local-path";
import { pathRehearsalKey, pathStorageKey, pathUnlockedKey } from "../storage-key";

const store = new Map<string, string>();
Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  },
});

const NEW = "a-plus-core1-220-1201";
const OLD = "a-plus-core1-220-1101";
const rec = (t: number) => ({ a: 1, c: 1, s: 1, t });
const stop = (at: number) => ({ n: 1, c: 3, t: 3, at });
const retired = Object.keys(CORE1_V15.retired)[0];

function save(cert: string, owner: string | null, items: Record<string, unknown>, stops: Record<string, unknown> = {}) {
  store.set(pathStorageKey(cert), JSON.stringify({ v: 1, owner, progress: { items, stops } }));
}

beforeEach(() => store.clear());

describe("carrying a device's A+ path over to 220-1201", () => {
  it("re-keys the old copy for V15, moves it to the new slug and removes it", async () => {
    save(OLD, null, { "r|3.6|printer-types|0a1b2c3d": rec(1), [`q|5.1|${retired}`]: rec(2) }, { "1.2": stop(3), "5.1": stop(4) });
    store.set(pathUnlockedKey(OLD), "123");
    store.set(pathRehearsalKey(OLD), "{}");

    await carryOverPreV15Path(NEW);

    const carried = readLocalPath(NEW)!;
    expect(carried.owner).toBeNull();
    expect(carried.progress.items).toEqual({ "r|3.8|printer-types|0a1b2c3d": rec(1) });
    expect(carried.progress.stops).toEqual({ "3.1": stop(3) });
    expect(store.get(pathUnlockedKey(NEW))).toBe("123");
    expect([pathStorageKey(OLD), pathUnlockedKey(OLD), pathRehearsalKey(OLD)].some((k) => store.has(k))).toBe(false);
  });

  it("merges into what's already saved under the new slug", async () => {
    save(NEW, "u1", { "q|2.1|a": rec(5) });
    save(OLD, "u1", { "r|2.1|ports-protocols|1a2b3c4d": rec(1) });

    await carryOverPreV15Path(NEW);

    const merged = readLocalPath(NEW)!;
    expect(merged.owner).toBe("u1");
    expect(Object.keys(merged.progress.items).sort()).toEqual(["q|2.1|a", "r|2.1|ports-protocols|1a2b3c4d"]);
  });

  it("never folds another account's old path into this one", async () => {
    save(NEW, "u1", { "q|2.1|a": rec(5) });
    save(OLD, "u2", { "r|2.1|ports-protocols|1a2b3c4d": rec(1) });

    await carryOverPreV15Path(NEW);

    expect(Object.keys(readLocalPath(NEW)!.progress.items)).toEqual(["q|2.1|a"]);
    expect(store.has(pathStorageKey(OLD))).toBe(false);
  });

  it("does nothing for an exam that never changed slug, or a device without an old copy", async () => {
    save("network-plus-n10-009", null, { "q|1.1|a": rec(1) });
    await carryOverPreV15Path("network-plus-n10-009");
    await carryOverPreV15Path(NEW);
    expect([...store.keys()]).toEqual([pathStorageKey("network-plus-n10-009")]);
  });
});
