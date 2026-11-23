// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

/**
 * With no browser error capture switched on, these two calls are the whole of
 * the error reporting on the public pages and the study path: a refactor that
 * drops one must turn a test red.
 */
const analytics = vi.hoisted(() => ({ captureError: vi.fn(), track: vi.fn() }));
vi.mock("@/lib/analytics", () => analytics);

import PageError from "../error";
import GlobalError from "../global-error";

const failure = () => Object.assign(new Error("The page failed to render."), { digest: "4031985677" });

beforeEach(() => {
  analytics.captureError.mockClear();
  // The boundary writes the error to the console as well; the test's own output stays quiet.
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("the root error boundary", () => {
  it("reports the error once, with its digest and the boundary's name", () => {
    const error = failure();
    render(<PageError error={error} reset={vi.fn()} />);
    expect(analytics.captureError).toHaveBeenCalledTimes(1);
    expect(analytics.captureError).toHaveBeenCalledWith(error, {
      digest: "4031985677",
      page: window.location.pathname,
      boundary: "root",
    });
  });
});

describe("the global error boundary", () => {
  it("reports the error once, with its digest and the boundary's name", () => {
    const error = failure();
    // It draws its own html and body, which React places in the test's document.
    render(<GlobalError error={error} reset={vi.fn()} />);
    expect(analytics.captureError).toHaveBeenCalledTimes(1);
    expect(analytics.captureError).toHaveBeenCalledWith(error, {
      digest: "4031985677",
      page: window.location.pathname,
      boundary: "global",
    });
  });
});
