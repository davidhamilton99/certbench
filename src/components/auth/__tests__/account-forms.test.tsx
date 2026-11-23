// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const track = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics", () => ({ track }));

type Answer = { data?: { session?: object | null; user?: object | null }; error?: object | null };
/** The sign-in service, as the forms call it. Each answer is set by the test. */
const auth = vi.hoisted(() => ({
  signInWithPassword: vi.fn<(args: object) => Promise<Answer>>(),
  signUp: vi.fn<(args: { email: string; password: string; options: Record<string, unknown> }) => Promise<Answer>>(),
  resetPasswordForEmail: vi.fn<(email: string, options: { redirectTo: string }) => Promise<Answer>>(),
  updateUser: vi.fn<(args: object) => Promise<Answer>>(),
  signInWithOAuth: vi.fn<(args: { options: { redirectTo: string } }) => Promise<Answer>>(),
}));
vi.mock("@/lib/supabase-browser", () => ({ createClient: () => ({ auth }) }));

import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { RegisterLead } from "@/components/auth/RegisterLead";
import { RegisterNextSteps } from "@/components/auth/RegisterNextSteps";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

function arriveAt(url: string) {
  window.history.replaceState(null, "", url);
}

const field = (name: string | RegExp) => screen.getByLabelText(name) as HTMLInputElement;
const type = (name: string | RegExp, value: string) => fireEvent.change(field(name), { target: { value } });
const press = (name: string | RegExp) => act(async () => void fireEvent.click(screen.getByRole("button", { name })));

/** The ids a field points to, resolved to the text a screen reader reads with the field. */
function described(input: HTMLElement): string[] {
  return (input.getAttribute("aria-describedby") ?? "")
    .split(" ")
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent ?? `missing #${id}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  arriveAt("/login");
  auth.signInWithPassword.mockResolvedValue({ data: { user: {} }, error: null });
  auth.signUp.mockResolvedValue({ data: { session: {}, user: {} }, error: null });
  auth.resetPasswordForEmail.mockResolvedValue({ error: null });
  auth.updateUser.mockResolvedValue({ error: null });
  auth.signInWithOAuth.mockResolvedValue({ error: null });
});

describe("the sign-in form", () => {
  it("takes the Tab key from the email address to the password, and only then to the reset link", () => {
    const { container } = render(<LoginForm />);
    const order = [...container.querySelectorAll("form input, form a, form button")].map(
      (el) => el.getAttribute("id") ?? el.textContent
    );
    expect(order).toEqual(["email", "password", "Forgotten your password?", "Sign in", "Create an account"]);
  });

  it("underlines its links, and gives the reset link a thumb-sized target", () => {
    render(<LoginForm />);
    const reset = screen.getByRole("link", { name: "Forgotten your password?" });
    expect(reset.className).toContain("cb-link");
    expect(reset.className).toContain("cb-tap");
    expect(screen.getByRole("link", { name: "Create an account" }).className).toContain("cb-link");
  });

  it("carries the return address on to the registration page", () => {
    arriveAt("/login?next=%2Fpath%2Fsecurity-plus-sy0-701");
    render(<LoginForm />);
    expect(screen.getByRole("link", { name: "Create an account" }).getAttribute("href")).toBe(
      "/register?next=%2Fpath%2Fsecurity-plus-sy0-701"
    );
  });

  it("returns to the page that asked for the sign-in, or to the exam list", async () => {
    arriveAt("/login?next=%2Fpricing%3Fplan%3Dannual");
    const { unmount } = render(<LoginForm />);
    type("Email address", "sam@example.com");
    type("Password", "correct-horse");
    await press("Sign in");
    expect(router.push).toHaveBeenLastCalledWith("/pricing?plan=annual");
    unmount();

    arriveAt("/login?next=https%3A%2F%2Fevil.com");
    render(<LoginForm />);
    type("Email address", "sam@example.com");
    type("Password", "correct-horse");
    await press("Sign in");
    expect(router.push).toHaveBeenLastCalledWith("/start");
  });

  it("says that the two do not match in a sentence of its own, announced and tied to both fields", async () => {
    auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: "Invalid login credentials", code: "invalid_credentials", status: 400 },
    });
    render(<LoginForm />);
    type("Email address", "sam@example.com");
    type("Password", "wrong");
    await press("Sign in");

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toBe("The email address and password do not match.");
    expect(document.body.textContent).not.toContain("Invalid login credentials");
    for (const name of ["Email address", "Password"]) {
      expect(field(name).getAttribute("aria-invalid")).toBe("true");
      expect(described(field(name))).toContain(alert.textContent);
    }
    expect(router.push).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Sign in" }).hasAttribute("aria-busy")).toBe(false);
  });

  it("says that the sign-in service could not be reached when the request fails", async () => {
    auth.signInWithPassword.mockRejectedValue(new TypeError("Failed to fetch"));
    render(<LoginForm />);
    type("Email address", "sam@example.com");
    type("Password", "correct-horse");
    await press("Sign in");
    expect(screen.getByRole("alert").textContent).toBe(
      "The sign-in service could not be reached. Please try again in a few minutes."
    );
  });

  it("says that an emailed link could not be used, and offers a new one", () => {
    arriveAt("/login?error=auth");
    render(<LoginForm />);
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("This link has expired or has already been used. Please request a new one.");
    expect(alert.querySelector("a")?.getAttribute("href")).toBe("/forgot-password");
  });
});

describe("the registration form", () => {
  beforeEach(() => arriveAt("/register"));

  it("asks for an email address and a password, and leaves the name to the visitor", () => {
    render(<RegisterForm />);
    expect(field("Display name (optional)").required).toBe(false);
    expect(described(field("Display name (optional)"))).toEqual([
      "If you leave this empty, the first part of your email address is used.",
    ]);
    expect(field("Email address").required).toBe(true);
    expect(field("Password").required).toBe(true);
    expect(field("Password").minLength).toBe(8);
    // The rule stays in view under the field: it is not a placeholder.
    expect(described(field("Password"))).toEqual(["Use at least 8 characters."]);
    expect(field("Password").getAttribute("placeholder")).toBeNull();
  });

  it("sends no name when none was given, so the profile is named from the email address", async () => {
    render(<RegisterForm />);
    type("Email address", "sam@example.com");
    type("Password", "correct-horse");
    await press("Create account");
    expect(auth.signUp.mock.calls[0][0].options).not.toHaveProperty("data");
    expect(track).toHaveBeenCalledWith("signup_submitted", { method: "email" });
    expect(router.push).toHaveBeenCalledWith("/start");
  });

  it("sends the name when one was given", async () => {
    render(<RegisterForm />);
    type("Display name (optional)", "  Sam Rivera ");
    type("Email address", "sam@example.com");
    type("Password", "correct-horse");
    await press("Create account");
    expect(auth.signUp.mock.calls[0][0].options.data).toEqual({ display_name: "Sam Rivera" });
  });

  it("states what creating an account accepts, with both documents linked", () => {
    render(<RegisterForm />);
    const note = screen.getByText(/By creating an account you accept the/);
    expect(note.textContent).toBe(
      "By creating an account you accept the terms and the privacy policy. Each document opens in a new tab."
    );
    const links = [...note.querySelectorAll("a")];
    expect(links.map((a) => [a.textContent, a.getAttribute("href"), a.getAttribute("target")])).toEqual([
      ["terms", "/terms", "_blank"],
      ["privacy policy", "/privacy", "_blank"],
    ]);
    for (const link of links) expect(link.className).toContain("cb-link");
  });

  it("returns to the pricing page with the chosen plan after the account is made, by email or through Google", async () => {
    arriveAt("/register?next=%2Fpricing%3Fplan%3Dquarterly");
    render(<RegisterForm />);
    expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe(
      "/login?next=%2Fpricing%3Fplan%3Dquarterly"
    );

    await press("Continue with Google");
    const sent = new URL(auth.signInWithOAuth.mock.calls[0][0].options.redirectTo);
    expect(sent.searchParams.get("next")).toBe("/pricing?plan=quarterly");

    type("Email address", "sam@example.com");
    type("Password", "correct-horse");
    await press("Create account");
    expect(router.push).toHaveBeenCalledWith("/pricing?plan=quarterly");
  });

  it("asks the visitor to open the confirmation email when the account has no session yet", async () => {
    auth.signUp.mockResolvedValue({ data: { session: null, user: {} }, error: null });
    render(<RegisterForm />);
    type("Email address", "sam@example.com");
    type("Password", "correct-horse");
    await press("Create account");
    expect(router.push).toHaveBeenCalledWith("/verify");
  });

  it("offers the sign-in page when the address has an account already", async () => {
    auth.signUp.mockResolvedValue({ data: {}, error: { message: "User already registered", code: "user_already_exists" } });
    render(<RegisterForm />);
    type("Email address", "sam@example.com");
    type("Password", "correct-horse");
    await press("Create account");

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("An account with this email address already exists. Please sign in.");
    expect(alert.querySelector("a")?.getAttribute("href")).toBe("/login");
    expect(document.body.textContent).not.toContain("User already registered");
    expect(field("Email address").getAttribute("aria-invalid")).toBe("true");
    expect(field("Password").hasAttribute("aria-invalid")).toBe(false);
    expect(router.push).not.toHaveBeenCalled();
  });
});

describe("the sentence under the title of the registration page", () => {
  it("says that the account is free", () => {
    arriveAt("/register");
    const { container } = render(<RegisterLead />);
    expect(container.textContent).toBe("The account is free. No payment card is required.");
  });

  it.each([
    ["monthly", "every month"],
    ["quarterly", "every three months"],
    ["annual", "every year"],
  ])("says that payment comes next for a visitor who chose the %s plan, and prints no price", (plan, period) => {
    arriveAt(`/register?next=${encodeURIComponent(`/pricing?plan=${plan}`)}`);
    const { container } = render(<RegisterLead />);
    expect(container.textContent).toBe(
      `Create your account to continue to payment. You chose Pro, billed ${period}.`
    );
    // The pricing page shows each visitor the price for their region; this page cannot know it.
    expect(container.textContent).not.toContain("$");
  });

  it("stays with the free account for any other return address", () => {
    arriveAt("/register?next=%2Fpath%2Fsecurity-plus-sy0-701");
    const { container } = render(<RegisterLead />);
    expect(container.textContent).toBe("The account is free. No payment card is required.");
  });
});

describe("the list of what happens next, beside the registration form", () => {
  const free = [
    { title: "Choose your exam.", body: "Free step one." },
    { title: "Study in short steps.", body: "Free step two." },
  ];
  const paying = [
    { title: "Pay for the plan that you chose.", body: "Payment is handled by Stripe." },
    { title: "Choose your exam.", body: "Paying step two." },
  ];
  const titles = (container: HTMLElement) => [...container.querySelectorAll("h3")].map((h) => h.textContent);

  it("tells a visitor who came for a free account that no payment card is needed", () => {
    arriveAt("/register");
    const { container } = render(<RegisterNextSteps free={free} paying={paying} />);
    expect(container.textContent).toContain("An account is free, and you do not need a payment card.");
    expect(titles(container)).toEqual(["Choose your exam.", "Study in short steps."]);
  });

  it("tells a visitor who chose a plan that payment comes next, and says nothing about needing no card", () => {
    arriveAt("/register?next=%2Fpricing%3Fplan%3Dannual");
    const { container } = render(<RegisterNextSteps free={free} paying={paying} />);
    expect(titles(container)).toEqual(["Pay for the plan that you chose.", "Choose your exam."]);
    expect(container.textContent).not.toMatch(/free|payment card/i);
    expect(container.querySelector("h2")?.textContent).toBe("A study path for your CompTIA exam");
  });
});

describe("the form that asks for a reset link", () => {
  it("sends the link through the sign-in callback, and gives the confirmation the focus", async () => {
    render(<ForgotPasswordForm />);
    type("Email address", "sam@example.com");
    await press("Send reset link");

    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith("sam@example.com", {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    const confirmation = await screen.findByText(/If an account exists for/);
    expect(confirmation.textContent).toBe(
      "If an account exists for sam@example.com, a link to reset the password has been sent to that address."
    );
    await waitFor(() => expect(document.activeElement).toBe(confirmation));
  });

  it("says in a sentence when the link could not be sent", async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ error: { message: "Email rate limit exceeded", status: 429 } });
    render(<ForgotPasswordForm />);
    type("Email address", "sam@example.com");
    await press("Send reset link");
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toBe("Too many attempts have been made. Please wait a minute and try again.");
    expect(described(field("Email address"))).toContain(alert.textContent);
  });
});

describe("the form that sets a new password", () => {
  it("says when the two passwords differ, on the second field, without asking the service", async () => {
    render(<ResetPasswordForm />);
    type("New password", "correct-horse");
    type("Confirm password", "correct-house");
    await press("Update password");
    expect(screen.getByRole("alert").textContent).toBe("The passwords do not match.");
    expect(field("Confirm password").getAttribute("aria-invalid")).toBe("true");
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it("offers a new link when the reset link has expired or was opened on another device", async () => {
    auth.updateUser.mockResolvedValue({ error: { message: "Auth session missing!" } });
    render(<ResetPasswordForm />);
    type("New password", "correct-horse");
    type("Confirm password", "correct-horse");
    await press("Update password");
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain(
      "Your reset link has expired, or it was opened on a different device. Please request a new link."
    );
    expect(alert.querySelector("a")?.getAttribute("href")).toBe("/forgot-password");
    expect(document.body.textContent).not.toContain("Auth session missing");
  });

  it("opens the study path once the password is saved", async () => {
    render(<ResetPasswordForm />);
    expect(described(field("New password"))).toEqual(["Use at least 8 characters."]);
    type("New password", "correct-horse");
    type("Confirm password", "correct-horse");
    await press("Update password");
    expect(auth.updateUser).toHaveBeenCalledWith({ password: "correct-horse" });
    expect(router.push).toHaveBeenCalledWith("/start");
  });
});
