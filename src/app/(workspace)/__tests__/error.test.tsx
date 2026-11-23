// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const analytics = vi.hoisted(() => ({ captureError: vi.fn(), track: vi.fn() }));
vi.mock("@/lib/analytics", () => analytics);

import WorkspaceError from "../error";

beforeEach(() => {
  analytics.captureError.mockClear();
  // The boundary writes the error to the console as well; the test's own output stays quiet.
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("the workspace's error boundary", () => {
  it("reports the error once, with its digest and the boundary's name, and gives the digest for support", () => {
    const error = Object.assign(new Error("The screen failed to render."), { digest: "2718281828" });
    render(<WorkspaceError error={error} reset={vi.fn()} />);
    expect(analytics.captureError).toHaveBeenCalledTimes(1);
    expect(analytics.captureError).toHaveBeenCalledWith(error, {
      digest: "2718281828",
      page: window.location.pathname,
      boundary: "workspace",
    });
    expect(screen.getByText("2718281828")).toBeInTheDocument();
  });
});
