// @vitest-environment jsdom
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, within } from "@testing-library/react";

/** Which page is on its way after a press: none, unless a test sets one. */
const link = vi.hoisted(() => ({ pendingHref: null as string | null }));

// The link as a plain anchor that tells its children whether its page is on the way.
vi.mock("next/link", async () => {
  const { createContext, useContext } = await import("react");
  const Href = createContext<string | null>(null);
  return {
    default: ({ children, href, ...rest }: { children?: ReactNode; href: string } & AnchorHTMLAttributes<HTMLAnchorElement>) => (
      <Href.Provider value={href}>
        <a href={href} {...rest}>
          {children}
        </a>
      </Href.Provider>
    ),
    useLinkStatus: () => ({ pending: useContext(Href) === link.pendingHref }),
  };
});

import HelpPage from "../page";

afterEach(() => {
  link.pendingHref = null;
  vi.useRealTimers();
});

describe("the help page's answers", () => {
  // /start has no loading screen, so the pressed link is the only thing that can answer the press.
  it("answer a press on Choose your exam while /start is on its way, and keep the link's name and its words", () => {
    vi.useFakeTimers();
    link.pendingHref = "/start";
    render(<HelpPage />);
    const start = screen.getByRole("link", { name: "Choose your exam" });
    expect(start).toHaveAttribute("href", "/start");
    // A page that arrives at once shows nothing.
    expect(start.querySelector("svg.animate-spin")).toBeNull();
    act(() => vi.advanceTimersByTime(150));
    expect(start.querySelector("svg.animate-spin")).not.toBeNull();
    // The words stay in place, unseen, so the link keeps its width and its name, and it is still a text link.
    expect(within(start).getByText("Choose your exam")).toHaveClass("opacity-0");
    expect(screen.getByRole("link", { name: "Choose your exam" })).toBe(start);
    expect(start.className).toBe("cb-link");
    // A link whose page is not on its way shows nothing.
    expect(screen.getByRole("link", { name: "View plans and prices" }).querySelector("svg")).toBeNull();
  });
});
