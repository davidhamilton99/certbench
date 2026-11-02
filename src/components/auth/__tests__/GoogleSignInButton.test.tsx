// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

const signInWithOAuth = vi.hoisted(() =>
  vi.fn<(args: { options: { redirectTo: string } }) => Promise<object>>(async () => ({}))
);
vi.mock("@/lib/supabase-browser", () => ({
  createClient: () => ({ auth: { signInWithOAuth } }),
}));

const track = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics", () => ({ track }));

import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

const button = () => screen.getByRole("button", { name: /google|redirecting/i });

function arriveAt(url: string) {
  window.history.replaceState(null, "", url);
}

beforeEach(() => {
  vi.clearAllMocks();
  arriveAt("/tools/subnetting-practice");
});

describe("leaving for Google", () => {
  it("tells the callback where they're headed and which page to come back to", async () => {
    render(<GoogleSignInButton next="/tools/subnetting-practice" />);
    await act(async () => void fireEvent.click(button()));

    const sent = new URL(signInWithOAuth.mock.calls[0][0].options.redirectTo);
    expect(sent.pathname).toBe("/auth/callback");
    expect(sent.searchParams.get("next")).toBe("/tools/subnetting-practice");
    expect(sent.searchParams.get("back")).toBe("/tools/subnetting-practice");
    expect(track).toHaveBeenCalledWith("google_signin_clicked", { page: "/tools/subnetting-practice" });
  });

  it("keeps the page's own query in the way back", async () => {
    arriveAt("/login?next=%2Fpath%2Fnetwork-plus-n10-009");
    render(<GoogleSignInButton next="/path/network-plus-n10-009" />);
    await act(async () => void fireEvent.click(button()));

    const sent = new URL(signInWithOAuth.mock.calls[0][0].options.redirectTo);
    expect(sent.searchParams.get("back")).toBe("/login?next=%2Fpath%2Fnetwork-plus-n10-009");
  });
});

describe("back without signing in", () => {
  it("says so once, and tidies the address", () => {
    arriveAt("/tools/subnetting-practice?signin_cancelled=1#error=access_denied&sb=");
    render(<GoogleSignInButton />);

    expect(screen.getByRole("status").textContent).toMatch(/didn.t finish.*use your email/);
    expect(window.location.search).toBe("");
    expect(window.location.hash).toBe("");
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith("google_signin_cancelled", {
      page: "/tools/subnetting-practice",
      via: "google",
    });
  });

  it("leaves the rest of the page's query alone", () => {
    arriveAt("/login?next=%2Fpath%2Fnetwork-plus-n10-009&signin_cancelled=1");
    render(<GoogleSignInButton />);

    expect(window.location.pathname).toBe("/login");
    expect(window.location.search).toBe("?next=%2Fpath%2Fnetwork-plus-n10-009");
  });

  it("drops the note when they try again", async () => {
    arriveAt("/tools/subnetting-practice?signin_cancelled=1");
    render(<GoogleSignInButton />);
    await act(async () => void fireEvent.click(button()));

    expect(screen.queryByRole("status")).toBeNull();
  });

  it("says nothing on an ordinary visit", () => {
    render(<GoogleSignInButton />);

    expect(screen.queryByRole("status")).toBeNull();
    expect(track).not.toHaveBeenCalled();
  });
});

describe("the browser's back button from Google", () => {
  const restored = () => Object.assign(new Event("pageshow"), { persisted: true });

  it("doesn't leave a restored page stuck on Redirecting", async () => {
    render(<GoogleSignInButton />);
    await act(async () => void fireEvent.click(button()));
    expect((button() as HTMLButtonElement).disabled).toBe(true);

    act(() => void window.dispatchEvent(restored()));

    expect((button() as HTMLButtonElement).disabled).toBe(false);
    expect(button().textContent).toContain("Continue with Google");
    expect(screen.getByRole("status")).toBeTruthy();
    expect(track).toHaveBeenCalledWith("google_signin_cancelled", {
      page: "/tools/subnetting-practice",
      via: "back",
    });
  });

  it("ignores a page restored without having left for Google", () => {
    render(<GoogleSignInButton />);

    act(() => void window.dispatchEvent(restored()));

    expect(screen.queryByRole("status")).toBeNull();
    expect(track).not.toHaveBeenCalled();
  });
});
