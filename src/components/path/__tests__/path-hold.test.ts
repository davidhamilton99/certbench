// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { holdScript, holdsStage } from "../path-hold";
import { pathStorageKey } from "../storage-key";

const cert = "network-plus-n10-009";
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

/** What the inline script decides, run the way the page runs it. */
function scriptHolds(search: string): boolean {
  document.documentElement.removeAttribute("data-path-returning");
  window.history.replaceState(null, "", `/path/${cert}${search}`);
  new Function(holdScript(cert))();
  return document.documentElement.hasAttribute("data-path-returning");
}

beforeEach(() => store.clear());

describe("holding the path's stage", () => {
  it("shows a first visit its warm-up at once", () => {
    expect(holdsStage(cert, "")).toBe(false);
    expect(scriptHolds("")).toBe(false);
  });

  it("holds for a learner who has started this path on the device", () => {
    store.set(pathStorageKey(cert), JSON.stringify({ v: 1, owner: null, progress: { items: { a: {} }, stops: {} } }));
    expect(holdsStage(cert, "")).toBe(true);
    expect(scriptHolds("")).toBe(true);
  });

  it("holds for a buyer back from paying, with or without progress here", () => {
    expect(holdsStage(cert, "?upgraded=1")).toBe(true);
    expect(scriptHolds("?upgraded=1")).toBe(true);
    expect(scriptHolds("?x=2&upgraded=1")).toBe(true);
    expect(scriptHolds("?upgraded=10")).toBe(false);
  });

  it("ignores another exam's progress and a broken save", () => {
    store.set(pathStorageKey("security-plus-sy0-701"), JSON.stringify({ progress: { items: { a: {} }, stops: {} } }));
    expect(holdsStage(cert, "")).toBe(false);
    store.set(pathStorageKey(cert), "{not json");
    expect(holdsStage(cert, "")).toBe(false);
    expect(scriptHolds("")).toBe(false);
  });
});
