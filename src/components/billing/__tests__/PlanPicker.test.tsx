// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BILLING_INTERVALS } from "@/contracts/billing";
import { ApiError } from "@/contracts/errors";
import { regionPricing } from "@/lib/pricing/ppp";

const h = vi.hoisted(() => ({
  calls: [] as { key: string; input: unknown }[],
  track: vi.fn(),
  leaveFor: vi.fn(),
  toastError: vi.fn(),
  checkout: null as null | Error,
}));

vi.mock("@/lib/analytics", () => ({ track: (...args: unknown[]) => h.track(...args) }));
vi.mock("../leave", () => ({ leaveFor: (url: string) => h.leaveFor(url) }));
vi.mock("sonner", () => ({ toast: { error: (message: string) => h.toastError(message) } }));
vi.mock("@/lib/api-client", () => ({
  api: async (contract: { method: string; path: string }, input: unknown) => {
    h.calls.push({ key: `${contract.method} ${contract.path}`, input });
    if (h.checkout) throw h.checkout;
    return { url: "https://checkout.example/session" };
  },
}));

import { AddCertButton } from "../AddCertButton";
import { PlanPicker } from "../PlanPicker";
import { BILLING_HELP_HREF, BILLING_PERIODS, isBillingPeriod, pricingWithPlan, registerThenPay } from "../plans";

const LIST = regionPricing(null);
const pay = () => fireEvent.click(screen.getByRole("button", { name: "Continue to payment" }));

beforeEach(() => {
  h.calls = [];
  h.track.mockClear();
  h.leaveFor.mockClear();
  h.toastError.mockClear();
  h.checkout = null;
});

afterEach(cleanup);

describe("the billing periods", () => {
  it("are the contract's, in the contract's order", () => {
    expect([...BILLING_PERIODS]).toEqual([...BILLING_INTERVALS]);
  });

  it("are told from anything else an address can hold", () => {
    expect(isBillingPeriod("annual")).toBe(true);
    expect(isBillingPeriod("weekly")).toBe(false);
    expect(isBillingPeriod(["annual"])).toBe(false);
    expect(isBillingPeriod(undefined)).toBe(false);
  });

  it("are carried through sign-up in a same-site address", () => {
    expect(pricingWithPlan("quarterly")).toBe("/pricing?plan=quarterly");
    expect(registerThenPay("quarterly")).toBe("/register?next=%2Fpricing%3Fplan%3Dquarterly");
    const next = new URL(registerThenPay("annual"), "https://certbench.dev").searchParams.get("next");
    expect(next).toBe("/pricing?plan=annual");
    expect(BILLING_HELP_HREF).toBe("/help#account");
  });
});

describe("the plan chooser on the pricing page and the billing page", () => {
  it("sells all three periods with three months chosen first, and counts the view for its page", () => {
    render(<PlanPicker initialPricing={LIST} surface="pricing" />);
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByRole("radio", { name: /Three months/ })).toBeChecked();
    expect(h.track).toHaveBeenCalledWith("pricing_viewed", { surface: "pricing" });
    expect(screen.getByRole("button", { name: "Continue to payment" })).toBeInTheDocument();
  });

  it("chooses again the period a visitor chose before they were sent to create an account", () => {
    render(<PlanPicker initialPricing={LIST} initialPlan="annual" surface="pricing" />);
    expect(screen.getByRole("radio", { name: /Annual/ })).toBeChecked();
  });

  it("sends a signed-out visitor on the pricing page to create an account, and back to the period they chose", async () => {
    h.checkout = new ApiError("unauthorized");
    render(<PlanPicker initialPricing={LIST} surface="pricing" />);
    fireEvent.click(screen.getByRole("radio", { name: /Monthly/ }));
    pay();
    await waitFor(() => expect(h.leaveFor).toHaveBeenCalledWith("/register?next=%2Fpricing%3Fplan%3Dmonthly"));
    expect(h.track).not.toHaveBeenCalledWith("checkout_started", expect.anything());
  });

  it("returns to the page it is on when the payment page is left, and counts the checkout", async () => {
    render(<PlanPicker initialPricing={LIST} />);
    expect(h.track).toHaveBeenCalledWith("pricing_viewed", { surface: "upgrade" });
    pay();
    await waitFor(() => expect(h.leaveFor).toHaveBeenCalledWith("https://checkout.example/session"));
    expect(h.calls).toEqual([{ key: "POST /api/stripe/checkout", input: { interval: "quarterly", returnTo: "upgrade" } }]);
    expect(h.track).toHaveBeenCalledWith("checkout_started", { interval: "quarterly" });
  });

  it("asks a member whose session has ended on the billing page to sign in and come back", async () => {
    h.checkout = new ApiError("unauthorized");
    render(<PlanPicker initialPricing={LIST} />);
    pay();
    await waitFor(() => expect(h.leaveFor).toHaveBeenCalledWith("/login?next=/upgrade"));
  });

  it("says on its button what the press does, on the billing page as on the pricing page", () => {
    // No page gave the button words of its own, so the chooser no longer takes any.
    render(<PlanPicker initialPricing={LIST} />);
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["Continue to payment"]);
  });
});

describe("adding a certification to a plan", () => {
  it("opens the payment page, and counts the checkout only then", async () => {
    render(<AddCertButton certId="cert-2" price="$39" />);
    fireEvent.click(screen.getByRole("button", { name: "Add for $39" }));
    await waitFor(() => expect(h.leaveFor).toHaveBeenCalledWith("https://checkout.example/session"));
    expect(h.calls).toEqual([{ key: "POST /api/stripe/cert-checkout", input: { certId: "cert-2" } }]);
    expect(h.track).toHaveBeenCalledWith("checkout_started", { interval: "cert_addon" });
  });

  it("says what went wrong in a sentence, and counts no checkout", async () => {
    h.checkout = new ApiError("internal", "Request failed (502)");
    render(<AddCertButton certId="cert-2" price="$39" />);
    fireEvent.click(screen.getByRole("button", { name: "Add for $39" }));
    await waitFor(() =>
      expect(h.toastError).toHaveBeenCalledWith("The payment page could not be opened. Please try again.")
    );
    expect(h.track).not.toHaveBeenCalled();
    expect(h.leaveFor).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Add for $39" }).getAttribute("aria-busy")).toBeNull();
  });
});
