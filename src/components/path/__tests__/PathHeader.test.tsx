// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  resetAnalytics: vi.fn(),
  loads: 0,
  signOut: vi.fn(async () => ({ error: null as null | Error })),
  /** When set, the sign-in client's script cannot be fetched. */
  offline: false,
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: h.push, refresh: h.refresh }) }));
// The link as an anchor that shows what it was told about fetching its page early.
vi.mock("next/link", () => ({
  default: ({
    prefetch,
    children,
    href,
    ...rest
  }: { prefetch?: boolean | null; children?: ReactNode; href: string } & AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a data-prefetch={String(prefetch)} href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/lib/analytics", () => ({ resetAnalytics: () => h.resetAnalytics() }));
vi.mock("@/lib/supabase-lazy", () => ({
  loadBrowserClient: async () => {
    h.loads++;
    if (h.offline) throw new Error("Failed to fetch dynamically imported module");
    return { auth: { signOut: h.signOut } };
  },
}));
// The theme switch has its own tests; here it is a plain button that holds its place.
vi.mock("@/components/workspace/ThemeToggle", () => ({
  ThemeToggle: () => <button type="button">Switch to dark mode</button>,
}));

import { PathHeader } from "../PathHeader";

function header(props: Partial<Parameters<typeof PathHeader>[0]> = {}) {
  return (
    <PathHeader
      cert="security-plus-sy0-801"
      examName="Security+"
      version="SY0-801"
      signedIn
      email="learner@example.com"
      onHome={() => {}}
      {...props}
    />
  );
}

const account = () => screen.getByRole("button", { name: "Account" });

beforeEach(() => {
  h.push.mockClear();
  h.refresh.mockClear();
  h.resetAnalytics.mockClear();
  h.signOut.mockClear();
  h.signOut.mockImplementation(async () => ({ error: null }));
  h.loads = 0;
  h.offline = false;
});

afterEach(cleanup);

describe("the study path's header", () => {
  it("is as wide as the stage under it", () => {
    const { container } = render(header());
    const bar = container.querySelector("header > div");
    expect(bar?.className).toContain("max-w-3xl");
    expect(bar?.className).not.toMatch(/max-w-5xl/);
  });

  it("names the exam as the way back to the study path, in the words it shows", () => {
    const onHome = vi.fn();
    render(header({ onHome }));
    const link = screen.getByRole("link", { name: /Security\+/ });
    // The words on the link are in its name, in order, and it has no tooltip that could differ.
    expect(link.textContent).toBe("Your Security+ SY0-801 study path");
    expect(link.hasAttribute("title")).toBe(false);
    expect(link.hasAttribute("aria-label")).toBe(false);
    expect(link.getAttribute("href")).toBe("/path/security-plus-sy0-801");
    fireEvent.click(link);
    expect(onHome).toHaveBeenCalledTimes(1);
  });

  it("shows a visitor who is not signed in the exam as words and the way to sign in", () => {
    render(header({ signedIn: false, email: null }));
    expect(screen.queryByRole("link", { name: /study path/ })).toBeNull();
    expect(screen.getByText("Security+", { exact: false })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe("/login?next=/path/security-plus-sy0-801");
    expect(screen.queryByRole("button", { name: "Account" })).toBeNull();
  });

  // The sign-in page carries the sign-in client. Fetched early from every view
  // of the study path, it cost every signed-out visitor about 220 KB of script.
  it("fetches the sign-in page only once the visitor shows that they mean to open it", () => {
    render(header({ signedIn: false, email: null }));
    const signIn = screen.getByRole("link", { name: "Sign in" });
    expect(signIn).toHaveAttribute("data-prefetch", "false");
    fireEvent.pointerEnter(signIn);
    // `null` is the framework's own behaviour: fetch now.
    expect(signIn).toHaveAttribute("data-prefetch", "null");
  });

  it("keeps the account's place the same width before and after the account is known", () => {
    const { container, rerender } = render(header({ ready: false }));
    const slot = () => container.querySelector("[data-slot='account']");
    // Neither "Sign in" nor the account button is shown until the account is known.
    expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Account" })).toBeNull();
    expect(slot()?.className).toContain("min-w-16");
    rerender(header({ ready: true, signedIn: false }));
    expect(slot()?.className).toContain("min-w-16");
    expect(slot()).toContainElement(screen.getByRole("link", { name: "Sign in" }));
    rerender(header({ ready: true, signedIn: true }));
    expect(slot()).toContainElement(account());
  });
});

describe("the account panel", () => {
  it("is a button that shows and hides a panel, with no menu roles", () => {
    const { container } = render(header());
    expect(account().getAttribute("aria-expanded")).toBe("false");
    expect(account().hasAttribute("aria-haspopup")).toBe(false);
    expect(screen.queryByText(/Signed in as/)).toBeNull();

    fireEvent.click(account());
    expect(account().getAttribute("aria-expanded")).toBe("true");
    const panel = document.getElementById(account().getAttribute("aria-controls") ?? "");
    expect(panel).not.toBeNull();
    expect(panel?.textContent).toContain("Signed in as learner@example.com");
    expect(container.querySelector("[role='menu'], [role='menuitem']")).toBeNull();

    fireEvent.click(account());
    expect(account().getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText(/Signed in as/)).toBeNull();
  });

  it("leads to the plan and billing page", () => {
    render(header());
    fireEvent.click(account());
    expect(screen.getByRole("link", { name: "Plan and billing" }).getAttribute("href")).toBe("/upgrade");
  });

  it("closes on Escape and gives the focus back to its button", () => {
    render(header());
    fireEvent.click(account());
    screen.getByRole("button", { name: "Sign out" }).focus();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    expect(account().getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(account());
  });

  it("closes when the focus leaves it, and stays open while the focus moves inside it", () => {
    render(header());
    fireEvent.click(account());
    const billing = screen.getByRole("link", { name: "Plan and billing" });
    fireEvent.blur(account(), { relatedTarget: billing });
    expect(account().getAttribute("aria-expanded")).toBe("true");
    const outside = screen.getByRole("button", { name: "Switch to dark mode" });
    fireEvent.blur(billing, { relatedTarget: outside });
    expect(account().getAttribute("aria-expanded")).toBe("false");
  });

  it("closes on a press outside it", () => {
    render(header());
    fireEvent.click(account());
    fireEvent.pointerDown(document.body);
    expect(account().getAttribute("aria-expanded")).toBe("false");
  });

  it("signs out with the sign-in client fetched at that moment, and goes to the home page", async () => {
    render(header());
    // Nothing of the sign-in client is fetched to draw the header.
    expect(h.loads).toBe(0);
    fireEvent.click(account());
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(h.push).toHaveBeenCalledWith("/"));
    expect(h.loads).toBe(1);
    expect(h.signOut).toHaveBeenCalledTimes(1);
    expect(h.resetAnalytics).toHaveBeenCalledTimes(1);
    expect(h.refresh).toHaveBeenCalledTimes(1);
  });

  it("says so in a sentence when signing out did not work, and can be tried again", async () => {
    h.offline = true;
    render(header());
    fireEvent.click(account());
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect((await screen.findByRole("alert")).textContent).toBe("You could not be signed out. Please try again.");
    expect(h.push).not.toHaveBeenCalled();
    expect(h.resetAnalytics).not.toHaveBeenCalled();

    h.offline = false;
    h.signOut.mockImplementationOnce(async () => ({ error: new Error("fetch failed") }));
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(h.signOut).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(h.push).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(h.push).toHaveBeenCalledWith("/"));
  });

  it("does not load the sign-in client with the page", () => {
    const source = readFileSync(join(process.cwd(), "src/components/path/PathHeader.tsx"), "utf8");
    expect(source).not.toMatch(/from "@\/lib\/supabase-browser"/);
    expect(source).toMatch(/loadBrowserClient/);
  });
});
