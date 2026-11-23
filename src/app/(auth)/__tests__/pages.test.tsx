// @vitest-environment jsdom
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { renderToString } from "react-dom/server";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push() {}, refresh() {} }) }));
vi.mock("@/lib/analytics", () => ({ track() {} }));

import { PRO_SCOPE_TERMS } from "@/lib/pricing/terms";
import AuthLayout, { metadata } from "../layout";
import ForgotPasswordPage from "../forgot-password/page";
import LoginPage from "../login/page";
import RegisterPage from "../register/page";
import ResetPasswordPage from "../reset-password/page";
import VerifyPage from "../verify/page";

/** A page inside the account layout, as the server sends it. */
function served(page: ReactElement): Document {
  return new DOMParser().parseFromString(renderToString(<AuthLayout>{page}</AuthLayout>), "text/html");
}

const PAGES: [string, () => ReactElement, string][] = [
  ["/login", LoginPage, "Sign in to CertBench"],
  ["/register", RegisterPage, "Create your account"],
  ["/forgot-password", ForgotPasswordPage, "Reset your password"],
  ["/reset-password", ResetPasswordPage, "Set a new password"],
  ["/verify", VerifyPage, "Please check your inbox"],
];

describe.each(PAGES)("the account page %s", (_path, Page, title) => {
  const doc = served(<Page />);

  it("has its title as the page's one h1, in the server's HTML", () => {
    const headings = doc.querySelectorAll("h1");
    expect(headings).toHaveLength(1);
    expect(headings[0].textContent).toBe(title);
    // The first heading in the document is the title: nothing comes before it.
    expect(doc.querySelector("h1, h2, h3")).toBe(headings[0]);
  });

  it("has the wordmark in a header and one main region that the skip link can move to", () => {
    expect(doc.querySelector("header a")?.getAttribute("aria-label")).toBe("CertBench home");
    const mains = doc.querySelectorAll("main");
    expect(mains).toHaveLength(1);
    expect(mains[0].id).toBe("main-content");
    expect(mains[0].getAttribute("tabindex")).toBe("-1");
    expect(mains[0].contains(doc.querySelector("h1"))).toBe(true);
  });

  it("underlines every link that stands inside a sentence", () => {
    const inSentences = [...doc.querySelectorAll("main p a")];
    expect(inSentences.filter((a) => !a.classList.contains("cb-link")).map((a) => a.textContent)).toEqual([]);
  });
});

describe("the registration page", () => {
  const doc = served(<RegisterPage />);

  it("keeps the form's title as the h1 at every width, with what happens next as a section under an h2", () => {
    // The h1 is not inside anything that is hidden on a phone.
    expect(doc.querySelector("h1")?.closest(".hidden")).toBeNull();
    const next = doc.querySelector("section[aria-labelledby]")!;
    const heading = doc.getElementById(next.getAttribute("aria-labelledby")!)!;
    expect(heading.tagName).toBe("H2");
    expect(heading.textContent).toBe("A study path for your CompTIA exam");
    expect([...next.querySelectorAll("h3")].map((h) => h.textContent)).toEqual([
      "Choose your exam.",
      "Study in short steps.",
      "Continue with Pro if you wish.",
    ]);
  });

  it("says that the account is free, in the page as the server sends it", () => {
    // The return address is read in the browser. Until then the page is the free one.
    expect(doc.querySelector("main")?.textContent).toContain("The account is free. No payment card is required.");
  });

  it("writes both lists of what happens next from the shared wording of the price terms and the guarantee", async () => {
    const { PASS_GUARANTEE_TERMS } = await import("@/lib/pricing/guarantee");
    const text = doc.querySelector("section[aria-labelledby]")!.textContent!;
    expect(text).toContain("Your first study step and the readiness checkpoint are free.");
    expect(text).toContain(PASS_GUARANTEE_TERMS);
  });
});

describe("the registration page, for a visitor who chose a plan on the pricing page", () => {
  it("says that payment comes next, in the card and in the list beside it, and nothing about needing no card", () => {
    window.history.replaceState(null, "", "/register?next=%2Fpricing%3Fplan%3Dquarterly");
    const { container, unmount } = render(<RegisterPage />);
    expect(container.textContent).toContain(
      "Create your account to continue to payment. You chose Pro, billed every three months."
    );
    const next = container.querySelector("section[aria-labelledby]")!;
    expect([...next.querySelectorAll("h3")].map((h) => h.textContent)).toEqual([
      "Pay for the plan that you chose.",
      "Choose your exam.",
      "Study in short steps.",
    ]);
    expect(next.textContent).toContain(
      "You return to the pricing page, where your plan is still selected. Payment is handled by Stripe."
    );
    // What one plan covers is said before the visitor pays, in the shared wording.
    expect(next.textContent).toContain(PRO_SCOPE_TERMS);
    expect(container.textContent).not.toMatch(/do not need a payment card|No payment card is required/);
    unmount();
    window.history.replaceState(null, "", "/");
  });
});

describe("the account pages", () => {
  it("are kept out of search", () => {
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });

  it("tell a new account to open the link in the email", () => {
    expect(served(<VerifyPage />).querySelector("main")?.textContent).toContain(
      "A verification link has been sent to your email address. Open the link to activate your account, and then sign in."
    );
  });
});
