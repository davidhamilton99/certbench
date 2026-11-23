// @vitest-environment jsdom
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

/** What the mocked router and session report, set by each test. */
const state = vi.hoisted(() => ({
  pathname: "/pricing",
  signedIn: false as boolean | null,
  setTheme: vi.fn(),
}));

vi.mock("next/navigation", () => ({ usePathname: () => state.pathname }));
// The link as an anchor that shows what it was told about fetching its page
// early. A press goes nowhere: the test's browser has no pages to open.
vi.mock("next/link", () => ({
  default: ({
    prefetch,
    children,
    onClick,
    ...rest
  }: { prefetch?: boolean | null; children?: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      data-prefetch={String(prefetch)}
      {...rest}
      onClick={(event) => {
        onClick?.(event);
        event.preventDefault();
      }}
    >
      {children}
    </a>
  ),
  // No page is ever on its way here.
  useLinkStatus: () => ({ pending: false }),
}));
vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: "light", setTheme: state.setTheme }) }));
vi.mock("@/components/auth/useSignedIn", () => ({ useSignedIn: () => state.signedIn }));
vi.mock("@/components/workspace/ThemeToggle", () => ({
  ThemeToggle: () => <button type="button">Theme</button>,
}));

import { MarketingHeader } from "@/components/marketing/MarketingHeader";

const LINKS = ["Security+", "Network+", "A+", "Pricing", "For educators", "About"];

beforeEach(() => {
  state.pathname = "/pricing";
  state.signedIn = false;
  state.setTheme.mockClear();
});

const menuButton = () => screen.getByRole("button", { name: "Menu" });
const menuList = () => screen.queryByRole("navigation", { name: "Menu" });

describe("the bar", () => {
  it("lists the six pages, and names the one that is open", () => {
    render(<MarketingHeader />);
    const bar = screen.getByRole("navigation", { name: "Main" });
    expect(within(bar).getAllByRole("link").map((a) => a.textContent)).toEqual(LINKS);
    const current = within(bar)
      .getAllByRole("link")
      .filter((a) => a.getAttribute("aria-current") === "page");
    expect(current.map((a) => a.textContent)).toEqual(["Pricing"]);
  });

  it("marks no link on a page that is not in the bar", () => {
    state.pathname = "/help";
    render(<MarketingHeader />);
    const bar = screen.getByRole("navigation", { name: "Main" });
    expect(within(bar).getAllByRole("link").filter((a) => a.hasAttribute("aria-current"))).toEqual([]);
  });

  it("fetches a page only once the visitor shows that they mean to open it", () => {
    render(<MarketingHeader />);
    const link = within(screen.getByRole("navigation", { name: "Main" })).getByRole("link", { name: "About" });
    expect(link).toHaveAttribute("data-prefetch", "false");
    fireEvent.focus(link);
    // `null` is the framework's own behaviour: fetch now.
    expect(link).toHaveAttribute("data-prefetch", "null");
  });
});

describe("the menu", () => {
  it("is closed until asked for, and the button says so", () => {
    render(<MarketingHeader />);
    expect(menuButton()).toHaveAttribute("aria-expanded", "false");
    expect(menuList()).toBeNull();
    const region = document.getElementById(menuButton().getAttribute("aria-controls")!);
    expect(region).not.toBeNull();
    expect(region).toHaveAttribute("hidden");
  });

  it("opens the same links as a plain list, with the way in and the theme", () => {
    render(<MarketingHeader />);
    fireEvent.click(menuButton());
    expect(menuButton()).toHaveAttribute("aria-expanded", "true");
    expect(document.getElementById(menuButton().getAttribute("aria-controls")!)).not.toHaveAttribute("hidden");

    const list = menuList()!;
    expect(within(list).getAllByRole("link").map((a) => a.textContent)).toEqual([...LINKS, "Sign in"]);
    expect(within(list).getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
    // The sign-in page carries the sign-in client: it is fetched only once the row is reached.
    const signIn = within(list).getByRole("link", { name: "Sign in" });
    expect(signIn).toHaveAttribute("data-prefetch", "false");
    fireEvent.focus(signIn);
    expect(signIn).toHaveAttribute("data-prefetch", "null");
    expect(within(list).getByRole("link", { name: "Pricing" })).toHaveAttribute("aria-current", "page");
    expect(within(list).getByRole("button", { name: "Switch to dark mode" })).toBeInTheDocument();
    // A list, so a screen reader says how many links there are.
    expect(within(list).getAllByRole("listitem")).toHaveLength(LINKS.length + 2);
  });

  it("puts in the list only what the bar has no room for at each width", () => {
    render(<MarketingHeader />);
    fireEvent.click(menuButton());
    const list = menuList()!;
    const row = (name: string) => within(list).getByRole("link", { name }).closest("li")!;
    // The first four stand in the bar from the md width, so their rows go from there.
    for (const name of LINKS.slice(0, 4)) expect(row(name)).toHaveClass("md:hidden");
    // The last two stay in the list until the lg width, where the button itself goes.
    for (const name of LINKS.slice(4)) expect(row(name)).not.toHaveClass("md:hidden");
    expect(menuButton()).toHaveClass("lg:hidden");
    // "Sign in" and the theme are in the bar from the sm width.
    expect(row("Sign in")).toHaveClass("sm:hidden");
    expect(within(list).getByRole("button", { name: "Switch to dark mode" }).closest("li")).toHaveClass("sm:hidden");
  });

  it("closes on the Escape key and returns to the button", () => {
    render(<MarketingHeader />);
    fireEvent.click(menuButton());
    within(menuList()!).getByRole("link", { name: "About" }).focus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(menuButton()).toHaveAttribute("aria-expanded", "false");
    expect(menuList()).toBeNull();
    expect(document.activeElement).toBe(menuButton());
  });

  it("closes on a second press of the button", () => {
    render(<MarketingHeader />);
    fireEvent.click(menuButton());
    fireEvent.click(menuButton());
    expect(menuButton()).toHaveAttribute("aria-expanded", "false");
  });

  it("closes on a press anywhere else on the page, and stays open for a press inside the header", () => {
    render(
      <>
        <MarketingHeader />
        <p>The page</p>
      </>
    );
    fireEvent.click(menuButton());
    fireEvent.pointerDown(within(menuList()!).getByRole("link", { name: "About" }));
    expect(menuButton()).toHaveAttribute("aria-expanded", "true");
    fireEvent.pointerDown(screen.getByText("The page"));
    expect(menuButton()).toHaveAttribute("aria-expanded", "false");
  });

  it("closes when the focus leaves the bar, and stays open while the focus moves inside it", () => {
    render(
      <>
        <MarketingHeader />
        <a href="/help#account">billing page</a>
      </>
    );
    fireEvent.click(menuButton());
    const about = within(menuList()!).getByRole("link", { name: "About" });
    fireEvent.blur(menuButton(), { relatedTarget: about });
    expect(menuButton()).toHaveAttribute("aria-expanded", "true");
    // Tab from the last row to the page's first link: the list would cover it.
    fireEvent.blur(about, { relatedTarget: screen.getByRole("link", { name: "billing page" }) });
    expect(menuButton()).toHaveAttribute("aria-expanded", "false");
    expect(menuList()).toBeNull();
  });

  it("closes when a page is opened from it", () => {
    const { rerender } = render(<MarketingHeader />);
    fireEvent.click(menuButton());
    // The router moves to the new page: the list was opened on the old one.
    state.pathname = "/about";
    rerender(<MarketingHeader />);
    expect(menuButton()).toHaveAttribute("aria-expanded", "false");
    expect(menuList()).toBeNull();
  });

  it("closes when the row for the page that is already open is pressed", () => {
    render(<MarketingHeader />);
    fireEvent.click(menuButton());
    fireEvent.click(within(menuList()!).getByRole("link", { name: "Pricing" }));
    expect(menuButton()).toHaveAttribute("aria-expanded", "false");
  });

  it("leaves out Sign in for someone who is signed in", () => {
    state.signedIn = true;
    render(<MarketingHeader />);
    fireEvent.click(menuButton());
    expect(within(menuList()!).queryByRole("link", { name: "Sign in" })).toBeNull();
    expect(screen.getByRole("link", { name: "Your study path" })).toHaveAttribute("href", "/start");
  });

  it("changes the theme from its last row", () => {
    render(<MarketingHeader />);
    fireEvent.click(menuButton());
    fireEvent.click(within(menuList()!).getByRole("button", { name: "Switch to dark mode" }));
    expect(state.setTheme).toHaveBeenCalledWith("dark");
  });
});
