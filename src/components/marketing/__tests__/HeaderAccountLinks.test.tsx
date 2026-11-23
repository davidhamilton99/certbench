// @vitest-environment jsdom
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

/** Which page is on its way, and whether a session was found: set by each test. */
const state = vi.hoisted(() => ({ pendingHref: null as string | null, signedIn: false }));

// The link as an anchor that shows what it was told about fetching its page
// early, and that tells its children whether its page is on the way.
vi.mock("next/link", async () => {
  const { createContext, useContext } = await import("react");
  const Href = createContext<string | null>(null);
  return {
    default: ({
      prefetch,
      children,
      href,
      ...rest
    }: { prefetch?: boolean | null; children?: ReactNode; href: string } & AnchorHTMLAttributes<HTMLAnchorElement>) => (
      <Href.Provider value={href}>
        <a data-prefetch={String(prefetch)} href={href} {...rest}>
          {children}
        </a>
      </Href.Provider>
    ),
    useLinkStatus: () => ({ pending: useContext(Href) === state.pendingHref }),
  };
});
vi.mock("@/components/auth/useSignedIn", () => ({ useSignedIn: () => state.signedIn }));

import { HeaderAccountLinks } from "@/components/marketing/HeaderAccountLinks";

beforeEach(() => {
  state.pendingHref = null;
  state.signedIn = false;
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

/** The small spinner inside a link, if it is drawn. */
const spinner = (link: HTMLElement) => link.querySelector("svg.animate-spin");

describe("the header's account links", () => {
  it("answer a press on Start for free while /start is on its way, and keep the button's width and name", () => {
    state.pendingHref = "/start";
    render(<HeaderAccountLinks />);
    const start = screen.getByRole("link", { name: "Start for free" });
    // A page that arrives at once shows nothing.
    expect(spinner(start)).toBeNull();
    act(() => vi.advanceTimersByTime(150));
    expect(spinner(start)).not.toBeNull();
    // The words stay in place, unseen, so the button keeps its width and its name.
    expect(screen.getByText("Start for free")).toHaveClass("opacity-0");
    expect(screen.getByRole("link", { name: "Start for free" })).toBe(start);
  });

  it("show nothing of the kind while no page is on its way", () => {
    render(<HeaderAccountLinks />);
    act(() => vi.advanceTimersByTime(500));
    const start = screen.getByRole("link", { name: "Start for free" });
    expect(spinner(start)).toBeNull();
    expect(screen.getByText("Start for free")).not.toHaveClass("opacity-0");
  });

  it("answer a press on Your study path the same way for someone signed in", () => {
    state.signedIn = true;
    state.pendingHref = "/start";
    render(<HeaderAccountLinks />);
    act(() => vi.advanceTimersByTime(150));
    expect(spinner(screen.getByRole("link", { name: "Your study path" }))).not.toBeNull();
  });

  it("fetch the sign-in page only once the visitor shows that they mean to open it", () => {
    render(<HeaderAccountLinks />);
    const signIn = screen.getByRole("link", { name: "Sign in" });
    expect(signIn).toHaveAttribute("href", "/login");
    expect(signIn).toHaveAttribute("data-prefetch", "false");
    fireEvent.pointerEnter(signIn);
    // `null` is the framework's own behaviour: fetch now.
    expect(signIn).toHaveAttribute("data-prefetch", "null");
    // The way in that starts the study path keeps its early fetch.
    expect(screen.getByRole("link", { name: "Start for free" })).toHaveAttribute("data-prefetch", "undefined");
  });
});
