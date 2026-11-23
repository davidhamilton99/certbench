// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

const track = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics", () => ({ track }));

type Answer = { data: { session?: object | null; user?: { id: string; email: string } | null }; error: object | null };
const auth = vi.hoisted(() => ({
  signInWithPassword: vi.fn<(args: object) => Promise<Answer>>(),
  signUp: vi.fn<(args: { options: Record<string, unknown> }) => Promise<Answer>>(),
  signInWithOAuth: vi.fn(async () => ({ error: null })),
}));
vi.mock("@/lib/supabase-browser", () => ({ createClient: () => ({ auth }) }));

import { InlineSignup } from "@/components/auth/InlineSignup";

const USER = { id: "u1", email: "sam@example.com" };
const onSignedIn = vi.fn<(userId: string, email: string | undefined, method: string) => Promise<void> | void>();

function show(props: Partial<Parameters<typeof InlineSignup>[0]> = {}) {
  return render(
    <InlineSignup nextPath="/security-plus-practice-test?exam=scored" submitLabel="Show my score" onSignedIn={onSignedIn} {...props} />
  );
}

const field = (name: string) => screen.getByLabelText(name) as HTMLInputElement;
const fill = () => {
  fireEvent.change(field("Email address"), { target: { value: USER.email } });
  fireEvent.change(field("Password"), { target: { value: "correct-horse" } });
};
const press = (name: string | RegExp) => act(async () => void fireEvent.click(screen.getByRole("button", { name })));
const describedBy = (input: HTMLElement) =>
  (input.getAttribute("aria-describedby") ?? "")
    .split(" ")
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent);

beforeEach(() => {
  vi.clearAllMocks();
  onSignedIn.mockResolvedValue(undefined);
  auth.signUp.mockResolvedValue({ data: { session: {}, user: USER }, error: null });
  auth.signInWithPassword.mockResolvedValue({ data: { user: USER }, error: null });
});

describe("the sign-up form that stays on the page", () => {
  it("labels its two fields in view, and keeps the password rule under the field", () => {
    show();
    expect(field("Email address").type).toBe("email");
    expect(field("Email address").autocomplete).toBe("email");
    expect(field("Password").autocomplete).toBe("new-password");
    expect(field("Password").minLength).toBe(8);
    expect(describedBy(field("Password"))).toEqual(["Use at least 8 characters."]);
    // Nothing is said by a placeholder, which disappears at the first key press.
    expect(field("Email address").getAttribute("placeholder")).toBeNull();
    expect(field("Password").getAttribute("placeholder")).toBeNull();
    expect(field("Email address").hasAttribute("aria-label")).toBe(false);
  });

  it("states what creating an account accepts, with both documents linked", () => {
    show();
    const note = screen.getByText(/By creating an account you accept the/);
    expect([...note.querySelectorAll("a")].map((a) => a.getAttribute("href"))).toEqual(["/terms", "/privacy"]);
  });

  it("creates the account without a name and hands the page its next step", async () => {
    show();
    fill();
    await press("Show my score");
    expect(auth.signUp.mock.calls[0][0].options).not.toHaveProperty("data");
    expect(track).toHaveBeenCalledWith("signup_submitted", { method: "email" });
    expect(onSignedIn).toHaveBeenCalledWith("u1", USER.email, "email_signup");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("says so, and is ready again, when the page's next step fails after the account is made", async () => {
    onSignedIn.mockRejectedValue(new Error("the score could not be opened"));
    show();
    fill();
    await press("Show my score");
    expect(screen.getByRole("alert").textContent).toBe(
      "You are signed in, but the next step could not be opened. Please reload the page."
    );
    expect(screen.getByRole("button", { name: "Show my score" }).hasAttribute("aria-busy")).toBe(false);
  });

  it("becomes the sign-in form, with the reason, when the address has an account already", async () => {
    auth.signUp.mockResolvedValue({ data: {}, error: { message: "User already registered", code: "user_already_exists" } });
    show();
    fill();
    await press("Show my score");

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toBe("An account with this email address already exists. Please sign in.");
    expect(document.body.textContent).not.toContain("User already registered");
    expect(describedBy(field("Email address"))).toContain(alert.textContent);
    expect(field("Email address").getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByRole("button", { name: "Sign in and continue" })).toBeTruthy();
    expect(onSignedIn).not.toHaveBeenCalled();
  });

  it("says that the sign-in service could not be reached when the request fails", async () => {
    auth.signUp.mockRejectedValue(new TypeError("Failed to fetch"));
    show();
    fill();
    await press("Show my score");
    expect(screen.getByRole("alert").textContent).toBe(
      "The sign-in service could not be reached. Please try again in a few minutes."
    );
    expect(screen.getByRole("button", { name: "Show my score" }).hasAttribute("aria-busy")).toBe(false);
  });

  it("says that the visitor stays on the page, except where the account leads elsewhere", () => {
    const { unmount } = show();
    expect(document.body.textContent).toContain("You will stay on this page.");
    unmount();
    show({ staysOnPage: false });
    expect(document.body.textContent).not.toContain("You will stay on this page.");
  });
});

describe("its sign-in mode", () => {
  it("moves the focus to the email field when the form changes, in both directions", async () => {
    show();
    await press("Sign in");
    expect(document.activeElement).toBe(field("Email address"));
    expect(screen.getByRole("button", { name: "Sign in and continue" })).toBeTruthy();

    field("Password").focus();
    await press("Create a free account");
    expect(document.activeElement).toBe(field("Email address"));
    expect(screen.getByRole("button", { name: "Show my score" })).toBeTruthy();
  });

  it("offers the way to a forgotten password, and drops what only a new account needs", async () => {
    show();
    expect(screen.queryByRole("link", { name: "Forgotten your password?" })).toBeNull();
    await press("Sign in");
    const reset = screen.getByRole("link", { name: "Forgotten your password?" });
    expect(reset.getAttribute("href")).toBe("/forgot-password");
    expect(reset.className).toContain("cb-link");
    expect(field("Password").autocomplete).toBe("current-password");
    expect(describedBy(field("Password"))).toEqual([]);
    expect(screen.queryByText(/By creating an account you accept the/)).toBeNull();
  });

  it("signs in and hands the page its next step", async () => {
    show();
    await press("Sign in");
    fill();
    await press("Sign in and continue");
    expect(onSignedIn).toHaveBeenCalledWith("u1", USER.email, "email_login");
  });

  it("says that the two do not match in a sentence of its own, tied to both fields", async () => {
    auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: "Invalid login credentials", code: "invalid_credentials" },
    });
    show();
    await press("Sign in");
    fill();
    await press("Sign in and continue");
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toBe("The email address and password do not match.");
    for (const name of ["Email address", "Password"]) {
      expect(field(name).getAttribute("aria-invalid")).toBe("true");
      expect(describedBy(field(name))).toContain(alert.textContent);
    }
  });
});
