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
  it("tells the callback where they are headed and which page to come back to", async () => {
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

describe("where Google sign-in returns to", () => {
  const sentNext = () => new URL(signInWithOAuth.mock.calls[0][0].options.redirectTo).searchParams.get("next");

  it("is the exam list when the page names nowhere", async () => {
    render(<GoogleSignInButton />);
    await act(async () => void fireEvent.click(button()));
    expect(sentNext()).toBe("/start");
  });

  it("keeps a chosen plan on the way back to the pricing page", async () => {
    arriveAt("/register?next=%2Fpricing%3Fplan%3Dquarterly");
    render(<GoogleSignInButton next="/pricing?plan=quarterly" />);
    await act(async () => void fireEvent.click(button()));
    expect(sentNext()).toBe("/pricing?plan=quarterly");
  });

  it.each(["//evil.com/x", "https://evil.com/x", "/\\evil.com"])("is never another site (%s)", async (next) => {
    render(<GoogleSignInButton next={next} />);
    await act(async () => void fireEvent.click(button()));
    expect(sentNext()).toBe("/start");
  });
});

describe("when the trip to Google cannot begin", () => {
  it("says that the sign-in service could not be reached, and is ready to be pressed again", async () => {
    signInWithOAuth.mockRejectedValueOnce(Object.assign(new Error("fetch failed"), { name: "AuthRetryableFetchError" }));
    render(<GoogleSignInButton />);
    await act(async () => void fireEvent.click(button()));

    expect(screen.getByRole("alert").textContent).toBe(
      "The sign-in service could not be reached. Please try again in a few minutes."
    );
    expect(button().hasAttribute("aria-busy")).toBe(false);
  });

  it("gives a sentence of its own for any other failure, never the service's words", async () => {
    signInWithOAuth.mockResolvedValueOnce({ error: { message: "Unsupported provider: provider is not enabled" } });
    render(<GoogleSignInButton />);
    await act(async () => void fireEvent.click(button()));

    expect(screen.getByRole("alert").textContent).toBe(
      "Google sign-in could not be started. Please try again, or use your email address below."
    );
    expect(document.body.textContent).not.toContain("Unsupported provider");
  });
});

describe("back without signing in", () => {
  it("says so once, and tidies the address", () => {
    arriveAt("/tools/subnetting-practice?signin_cancelled=1#error=access_denied&sb=");
    render(<GoogleSignInButton />);

    expect(screen.getByRole("status").textContent).toMatch(/was not completed.*use your email/);
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

  it("does not leave a restored page stuck waiting on the trip to Google", async () => {
    render(<GoogleSignInButton />);
    await act(async () => void fireEvent.click(button()));
    // While it waits the button says that it is busy and takes no further
    // press. It is not disabled: a disabled button loses the keyboard's place.
    expect(button().getAttribute("aria-busy")).toBe("true");
    expect(button().getAttribute("aria-disabled")).toBe("true");
    expect((button() as HTMLButtonElement).disabled).toBe(false);
    await act(async () => void fireEvent.click(button()));
    expect(signInWithOAuth).toHaveBeenCalledTimes(1);

    act(() => void window.dispatchEvent(restored()));

    expect(button().hasAttribute("aria-busy")).toBe(false);
    expect(button().hasAttribute("aria-disabled")).toBe(false);
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
