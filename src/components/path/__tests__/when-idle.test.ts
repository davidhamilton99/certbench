// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IDLE_FALLBACK_MS, IDLE_LIMIT_MS, whenIdleAfterLoad } from "../when-idle";

/**
 * Work that the page wants later (the schemas that read the server's answers)
 * waits until the first load is over and the browser is idle. Done during the
 * load, it would compete with what the visitor is waiting to see.
 */

type IdleWindow = {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};
const idleWindow = window as unknown as IdleWindow;

/** How far the document's first load has gone. */
let readyState: DocumentReadyState = "complete";

/** A browser that can say when it is idle: what it was asked, and the means to make it idle. */
function withIdleCallback() {
  const asked: { callback: () => void; timeout?: number; cancelled: boolean }[] = [];
  idleWindow.requestIdleCallback = (callback, options) => {
    asked.push({ callback, timeout: options?.timeout, cancelled: false });
    return asked.length;
  };
  idleWindow.cancelIdleCallback = (id) => {
    asked[id - 1].cancelled = true;
  };
  return asked;
}

beforeEach(() => {
  vi.useFakeTimers();
  readyState = "complete";
  Object.defineProperty(document, "readyState", { configurable: true, get: () => readyState });
});

afterEach(() => {
  vi.useRealTimers();
  delete idleWindow.requestIdleCallback;
  delete idleWindow.cancelIdleCallback;
  delete (document as unknown as { readyState?: unknown }).readyState;
});

describe("whenIdleAfterLoad", () => {
  it("does the work when the browser says that it is idle, and never at once", () => {
    const asked = withIdleCallback();
    const work = vi.fn();
    whenIdleAfterLoad(work);
    expect(work).not.toHaveBeenCalled();
    // The browser was asked once, with a limit so that a busy page still does the work in the end.
    expect(asked).toHaveLength(1);
    expect(asked[0].timeout).toBe(IDLE_LIMIT_MS);
    // No timer stands in where the browser can say so itself.
    vi.advanceTimersByTime(60_000);
    expect(work).not.toHaveBeenCalled();

    asked[0].callback();
    expect(work).toHaveBeenCalledTimes(1);
  });

  it("waits a short time after the load where the browser cannot say when it is idle", () => {
    const work = vi.fn();
    whenIdleAfterLoad(work);
    expect(work).not.toHaveBeenCalled();
    vi.advanceTimersByTime(IDLE_FALLBACK_MS - 1);
    expect(work).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(work).toHaveBeenCalledTimes(1);
  });

  it("asks for nothing while the first load is still going on, and waits for it to end", () => {
    const asked = withIdleCallback();
    const work = vi.fn();
    // The page's scripts are running, and its stylesheets, fonts and images are still arriving.
    readyState = "interactive";
    whenIdleAfterLoad(work);
    vi.advanceTimersByTime(60_000);
    expect(asked).toHaveLength(0);
    expect(work).not.toHaveBeenCalled();

    // The first load ends: only now is the browser asked to say when it is idle.
    readyState = "complete";
    window.dispatchEvent(new Event("load"));
    expect(asked).toHaveLength(1);
    expect(work).not.toHaveBeenCalled();
    asked[0].callback();
    expect(work).toHaveBeenCalledTimes(1);
  });

  it("waits for the end of the load before the timer starts, where a timer stands in", () => {
    const work = vi.fn();
    readyState = "loading";
    whenIdleAfterLoad(work);
    vi.advanceTimersByTime(60_000);
    expect(work).not.toHaveBeenCalled();
    window.dispatchEvent(new Event("load"));
    vi.advanceTimersByTime(IDLE_FALLBACK_MS);
    expect(work).toHaveBeenCalledTimes(1);
  });

  it("is called off by the function it returns: before the load ends, before the browser is idle, and before the timer", () => {
    const work = vi.fn();

    // Before the load has ended.
    readyState = "loading";
    whenIdleAfterLoad(work)();
    window.dispatchEvent(new Event("load"));
    vi.advanceTimersByTime(60_000);
    expect(work).not.toHaveBeenCalled();

    // Before the timer.
    readyState = "complete";
    whenIdleAfterLoad(work)();
    vi.advanceTimersByTime(60_000);
    expect(work).not.toHaveBeenCalled();

    // Before the browser is idle: it is told that the request no longer stands.
    const asked = withIdleCallback();
    whenIdleAfterLoad(work)();
    expect(asked[0].cancelled).toBe(true);
  });
});
