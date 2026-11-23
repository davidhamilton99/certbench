// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";

/** Whether the link's page is on its way: set by each test. */
const status = vi.hoisted(() => ({ pending: false }));
vi.mock("next/link", () => ({ useLinkStatus: () => ({ pending: status.pending }) }));

import { LinkArrow, LinkPending } from "../link-arrow";

beforeEach(() => {
  status.pending = false;
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe("LinkArrow", () => {
  it("is an arrow, and turns into the small spinner only once the page has been on its way for a moment", () => {
    const { container, rerender } = render(<LinkArrow />);
    expect(container.querySelector("svg.lucide-arrow-right")).not.toBeNull();
    status.pending = true;
    rerender(<LinkArrow />);
    // A page that arrives at once shows nothing.
    expect(container.querySelector("svg.animate-spin")).toBeNull();
    act(() => vi.advanceTimersByTime(150));
    expect(container.querySelector("svg.animate-spin")).not.toBeNull();
    status.pending = false;
    rerender(<LinkArrow />);
    expect(container.querySelector("svg.lucide-arrow-right")).not.toBeNull();
  });
});

describe("LinkPending", () => {
  it("keeps the words in place, unseen, under the spinner while the page is on its way", () => {
    status.pending = true;
    const { container } = render(
      <a href="/start">
        <LinkPending>Start for free</LinkPending>
      </a>
    );
    expect(screen.getByText("Start for free")).not.toHaveClass("opacity-0");
    act(() => vi.advanceTimersByTime(150));
    expect(screen.getByText("Start for free")).toHaveClass("opacity-0");
    expect(container.querySelector("svg.animate-spin")).toHaveAttribute("aria-hidden", "true");
    // The link keeps its name for a screen reader.
    expect(screen.getByRole("link", { name: "Start for free" })).toBeInTheDocument();
  });

  it("keeps every box inline, so a link in running text keeps its underline, and sizes its own spinner", () => {
    status.pending = true;
    const { container } = render(
      <a href="/start" className="cb-link">
        <LinkPending>Choose your exam</LinkPending>
      </a>
    );
    act(() => vi.advanceTimersByTime(150));
    const link = container.querySelector("a")!;
    // An underline reaches only the words in inline boxes: a flex, grid or
    // block box around them would take a text link's underline away.
    for (const box of link.querySelectorAll("span")) {
      expect(box.className).not.toMatch(/(?:^|\s)(?:inline-)?(?:flex|grid|block|table)(?:\s|$)/);
    }
    // Outside a Button nothing else sizes the spinner: it is the small size of its own, over the words.
    expect(link.querySelector("svg.animate-spin")).toHaveClass("absolute", "inset-0", "m-auto", "size-4");
    expect(screen.getByRole("link", { name: "Choose your exam" })).toBe(link);
  });
});
