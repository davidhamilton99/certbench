// @vitest-environment jsdom
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

// The link as an anchor that shows what it was told about fetching its page early.
vi.mock("next/link", () => ({
  default: ({
    prefetch,
    children,
    ...rest
  }: { prefetch?: boolean | null; children?: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a data-prefetch={String(prefetch)} {...rest}>
      {children}
    </a>
  ),
}));

import { IntentLink } from "@/components/marketing/IntentLink";

describe("IntentLink", () => {
  it("does not fetch its page while it only sits on the screen", () => {
    render(<IntentLink href="/about">About</IntentLink>);
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("data-prefetch", "false");
  });

  it.each([
    ["the pointer enters it", (el: HTMLElement) => fireEvent.pointerEnter(el)],
    ["it takes the keyboard", (el: HTMLElement) => fireEvent.focus(el)],
    ["a finger lands on it", (el: HTMLElement) => fireEvent.touchStart(el)],
  ])("fetches its page once %s", (_, show) => {
    render(<IntentLink href="/about">About</IntentLink>);
    const link = screen.getByRole("link", { name: "About" });
    show(link);
    // `null` hands the decision back to the framework, which fetches a link that is on screen.
    expect(link).toHaveAttribute("data-prefetch", "null");
  });

  it("is a link like any other: its address, its classes and its state pass through", () => {
    render(
      <IntentLink href="/pricing" className="cb-link" aria-current="page">
        Pricing
      </IntentLink>
    );
    const link = screen.getByRole("link", { name: "Pricing" });
    expect(link).toHaveAttribute("href", "/pricing");
    expect(link).toHaveClass("cb-link");
    expect(link).toHaveAttribute("aria-current", "page");
  });

  it("still calls the handlers its caller gave it", () => {
    const onPointerEnter = vi.fn();
    const onFocus = vi.fn();
    const onTouchStart = vi.fn();
    render(
      <IntentLink href="/about" onPointerEnter={onPointerEnter} onFocus={onFocus} onTouchStart={onTouchStart}>
        About
      </IntentLink>
    );
    const link = screen.getByRole("link", { name: "About" });
    fireEvent.pointerEnter(link);
    fireEvent.focus(link);
    fireEvent.touchStart(link);
    expect(onPointerEnter).toHaveBeenCalledTimes(1);
    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(onTouchStart).toHaveBeenCalledTimes(1);
  });
});
