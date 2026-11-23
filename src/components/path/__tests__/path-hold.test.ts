// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hasSessionCookie } from "@/lib/supabase-lazy";
import { HOLD_ATTRIBUTE, HOLD_LATE_MS, HOLD_WAIT_MS, holdScript, holdsStage } from "../path-hold";
import { pathGuestKey, pathStorageKey } from "../storage-key";

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

const html = document.documentElement;
const SESSION = "sb-abcdefghijklmnop-auth-token";

/** Run the inline script the way the page runs it, for an exam. */
function runScript(exam = cert, search = "") {
  window.history.replaceState(null, "", `/path/${exam}${search}`);
  new Function(holdScript(exam))();
}

/** What the inline script decides, run the way the page runs it. */
function scriptHolds(search = "", exam = cert): boolean {
  html.removeAttribute("data-path-returning");
  runScript(exam, search);
  return html.hasAttribute("data-path-returning");
}

const started = { items: { a: {} }, stops: {} };

beforeEach(() => {
  store.clear();
  for (const name of Object.values(HOLD_ATTRIBUTE)) html.removeAttribute(name);
});

afterEach(() => {
  document.cookie = `${SESSION}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  document.cookie = `${SESSION}.0=; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  vi.useRealTimers();
});

describe("holding the path's stage", () => {
  it("shows a first visit its warm-up at once", () => {
    expect(holdsStage(cert, "")).toBe(false);
    expect(scriptHolds("")).toBe(false);
  });

  it("holds for a learner who has started this path on the device", () => {
    store.set(pathStorageKey(cert), JSON.stringify({ v: 1, owner: null, progress: started }));
    expect(holdsStage(cert, "")).toBe(true);
    expect(scriptHolds("")).toBe(true);
  });

  it("holds for a buyer back from paying, with or without progress here", () => {
    expect(holdsStage(cert, "?upgraded=1")).toBe(true);
    expect(scriptHolds("?upgraded=1")).toBe(true);
    expect(scriptHolds("?x=2&upgraded=1")).toBe(true);
    expect(scriptHolds("?upgraded=10")).toBe(false);
  });

  it("holds for an A+ learner whose path is still under the 220-1101 slug", () => {
    const core1 = "a-plus-core1-220-1201";
    store.set(pathStorageKey("a-plus-core1-220-1101"), JSON.stringify({ v: 1, owner: null, progress: { items: {}, stops: { warmup: {} } } }));
    expect(holdsStage(core1, "")).toBe(true);
    expect(scriptHolds("", core1)).toBe(true);
    // Only A+ had an old slug.
    expect(holdsStage(cert, "")).toBe(false);
  });

  it("ignores another exam's progress and a broken save", () => {
    store.set(pathStorageKey("security-plus-sy0-701"), JSON.stringify({ progress: started }));
    expect(holdsStage(cert, "")).toBe(false);
    store.set(pathStorageKey(cert), "{not json");
    expect(holdsStage(cert, "")).toBe(false);
    expect(scriptHolds("")).toBe(false);
  });

  it("holds for someone who is signed in: their account may hold a path that this device does not", () => {
    document.cookie = `${SESSION}=session`;
    // The page's own check and the sign-in client's agree on what a session cookie is.
    expect(hasSessionCookie()).toBe(true);
    expect(holdsStage(cert, "")).toBe(true);
    expect(scriptHolds("")).toBe(true);

    // A long session is kept in numbered pieces.
    document.cookie = `${SESSION}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    document.cookie = `${SESSION}.0=piece`;
    expect(hasSessionCookie()).toBe(true);
    expect(holdsStage(cert, "")).toBe(true);
    expect(scriptHolds("")).toBe(true);
  });

  it("does not take another cookie for a session", () => {
    document.cookie = "theme=dark";
    expect(hasSessionCookie()).toBe(false);
    expect(holdsStage(cert, "")).toBe(false);
    expect(scriptHolds("")).toBe(false);
    document.cookie = "theme=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  });

  it("holds on a first visit to a newer exam version when the device holds the earlier version's path", () => {
    // SY0-701's answers are brought along, so SY0-801 opens on the learner's own screen.
    store.set(pathStorageKey("security-plus-sy0-701"), JSON.stringify({ v: 1, owner: null, progress: started }));
    expect(holdsStage("security-plus-sy0-801", "")).toBe(true);
    expect(scriptHolds("", "security-plus-sy0-801")).toBe(true);
    // The earlier version does not wait for the newer one's.
    store.clear();
    store.set(pathStorageKey("security-plus-sy0-801"), JSON.stringify({ v: 1, owner: null, progress: started }));
    expect(holdsStage("security-plus-sy0-701", "")).toBe(false);
    expect(scriptHolds("", "security-plus-sy0-701")).toBe(false);
  });

  it("holds for work played beside an account's copy", () => {
    // The account's copy is empty, and a signed-out visitor has answered beside it.
    store.set(pathStorageKey(cert), JSON.stringify({ v: 1, owner: "u1", progress: { items: {}, stops: {} } }));
    expect(holdsStage(cert, "")).toBe(false);
    store.set(pathGuestKey(cert), JSON.stringify(started));
    expect(holdsStage(cert, "")).toBe(true);
    expect(scriptHolds("")).toBe(true);
  });
});

describe("the held stage's clocks", () => {
  beforeEach(() => vi.useFakeTimers());

  it("lets the stage say that it is loading after half a second", () => {
    runScript();
    vi.advanceTimersByTime(HOLD_WAIT_MS - 1);
    expect(html.hasAttribute(HOLD_ATTRIBUTE.wait)).toBe(false);
    vi.advanceTimersByTime(1);
    expect(html.hasAttribute(HOLD_ATTRIBUTE.wait)).toBe(true);
  });

  it("says that the page is late when its scripts have not started after ten seconds", () => {
    runScript();
    vi.advanceTimersByTime(HOLD_LATE_MS - 1);
    expect(html.hasAttribute(HOLD_ATTRIBUTE.late)).toBe(false);
    vi.advanceTimersByTime(1);
    expect(html.hasAttribute(HOLD_ATTRIBUTE.late)).toBe(true);
  });

  it("is never late once the page's scripts are running", () => {
    runScript();
    // The study path marks the page as live when it starts (PathApp).
    html.setAttribute(HOLD_ATTRIBUTE.live, "");
    vi.advanceTimersByTime(HOLD_LATE_MS * 2);
    expect(html.hasAttribute(HOLD_ATTRIBUTE.late)).toBe(false);
  });
});

describe("the held stage's style rules", () => {
  const css = readFileSync(path.resolve(process.cwd(), "src/app/globals.css"), "utf8");
  /** The declarations of the rule with exactly this selector. */
  const rule = (selector: string) => {
    const at = css.indexOf(`${selector} {`);
    return at < 0 ? null : css.slice(at + selector.length + 2, css.indexOf("}", at)).trim();
  };
  const held = 'html[data-path-returning] .path-stage[data-ready="false"]';

  it("hide the held body so that it cannot be read, focused or pressed, never with opacity", () => {
    expect(rule(`${held} > .path-stage-body`)).toBe("visibility: hidden;");
    // A stage at opacity 0 is still read aloud, focused and pressed.
    expect(css).not.toMatch(/\.path-stage[^{}]*\{[^}]*opacity:\s*0/);
  });

  it("show each sentence only when its time has come", () => {
    expect(css).toMatch(/\.path-wait,\s*\.path-late \{ display: none; \}/);
    expect(
      rule(`html[data-path-returning][data-path-wait]:not([data-path-late]) .path-stage[data-ready="false"] > .path-wait`)
    ).toBe("display: block;");
    // A first visit whose scripts never arrive is told so as well.
    expect(rule('html[data-path-late] .path-stage[data-ready="false"] > .path-late')).toBe("display: block;");
    expect(rule(`html[data-path-returning][data-path-late] .path-stage[data-ready="false"] > .path-stage-body`)).toBe(
      "display: none;"
    );
  });
});
