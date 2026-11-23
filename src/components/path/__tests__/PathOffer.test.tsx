// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ApiError } from "@/contracts/errors";

const h = vi.hoisted(() => ({
  calls: [] as { contract: string; input: unknown }[],
  track: vi.fn(),
  leaveFor: vi.fn(),
  pricing: null as unknown,
  /** What the payment endpoints answer with: a session, or an error to throw. */
  checkout: null as null | Error,
}));

vi.mock("@/lib/analytics", () => ({ track: (...args: unknown[]) => h.track(...args) }));
vi.mock("@/components/billing/leave", () => ({ leaveFor: (url: string) => h.leaveFor(url) }));
vi.mock("@/lib/api-client", () => ({
  api: async (contract: { method: string; path: string }, input: unknown) => {
    const key = `${contract.method} ${contract.path}`;
    h.calls.push({ contract: key, input });
    if (key === "GET /api/pricing/region") return h.pricing;
    if (key === "POST /api/path/enroll") return { enrolled: true };
    if (h.checkout) throw h.checkout;
    return { url: "https://checkout.example/session" };
  },
}));

import { PathOffer, PathPaymentPastDue } from "../PathOffer";

const BASE_PRICES = {
  discountPercent: null,
  prices: {
    monthly: { original: "$19", discounted: "$19" },
    quarterly: { original: "$39", discounted: "$39" },
    annual: { original: "$99", discounted: "$99" },
  },
};

function offer(props: Partial<Parameters<typeof PathOffer>[0]> = {}) {
  return (
    <PathOffer
      cert="security-plus-sy0-701"
      certId="cert-1"
      examName="Security+"
      remainingStops={22}
      questionCount={842}
      proPlan={false}
      examDate={null}
      context="reveal"
      {...props}
    />
  );
}

/** The checkout request, once the button has been pressed. */
async function checkoutInput() {
  await waitFor(() => expect(h.calls.some((c) => (c.input as { interval?: string })?.interval)).toBe(true));
  return h.calls.find((c) => (c.input as { interval?: string })?.interval)?.input;
}

beforeEach(() => {
  h.calls = [];
  h.track.mockClear();
  h.leaveFor.mockClear();
  h.pricing = BASE_PRICES;
  h.checkout = null;
});

afterEach(cleanup);

describe("PathOffer", () => {
  it("offers monthly beside three months in the one plan chooser, with monthly chosen first", async () => {
    const { container } = render(offer());
    expect(screen.getByRole("heading", { level: 2, name: "Continue your study path with Pro" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Billing period" })).toBeInTheDocument();
    const monthly = screen.getByRole("radio", { name: /Monthly/ });
    const quarterly = screen.getByRole("radio", { name: /Three months/ });
    expect(monthly).toBeChecked();
    expect(quarterly).not.toBeChecked();
    // The path sells two periods: a year is sold on the pricing page only.
    expect(screen.getAllByRole("radio")).toHaveLength(2);

    expect(await screen.findByText("$19")).toBeInTheDocument();
    expect(screen.getByText("$39")).toBeInTheDocument();
    // Three months against three monthly payments (39 of 57), said in a sentence and not on a badge.
    expect(quarterly.closest("label")?.textContent).toContain("This is 32% less than three monthly payments.");
    expect(container.textContent).not.toMatch(/Save \d/);
    expect(screen.getByText(/The plan renews every month until you cancel\./)).toBeInTheDocument();
    expect(screen.getByText(/If you study with Pro for 30 days or more and do not pass your exam/)).toBeInTheDocument();
    // Green is kept for marks and scores: nothing that sells is set in it.
    expect(container.innerHTML).not.toMatch(/text-success|bg-success|line-through/);
  });

  it("prints no price until the learner's regional prices are known", async () => {
    let answer!: (pricing: unknown) => void;
    h.pricing = new Promise((resolve) => {
      answer = resolve;
    });
    const { container } = render(offer());
    expect(container.textContent).not.toContain("$");
    answer({
      discountPercent: 40,
      prices: {
        monthly: { original: "$19", discounted: "$11.40" },
        quarterly: { original: "$39", discounted: "$23.40" },
        annual: { original: "$99", discounted: "$59.40" },
      },
    });
    expect(await screen.findByText("$11.40")).toBeInTheDocument();
    expect(screen.getByText("$23.40")).toBeInTheDocument();
    // The list price is not shown beside the regional price, struck through or otherwise.
    expect(screen.queryByText("$19")).toBeNull();
    expect(screen.queryByText("$39")).toBeNull();
    expect(screen.getByText("Prices are shown in US dollars and are adjusted for your region.")).toBeInTheDocument();
  });

  it("uses the prices the page already has, and asks for none", () => {
    render(offer({ initialPricing: BASE_PRICES }));
    expect(screen.getByText("$19")).toBeInTheDocument();
    expect(h.calls).toEqual([]);
  });

  it("checks out monthly when nothing else is chosen, and counts the checkout once the payment page exists", async () => {
    render(offer());
    fireEvent.click(screen.getByRole("button", { name: "Continue to payment" }));
    expect(await checkoutInput()).toEqual({ interval: "monthly", returnTo: "path/security-plus-sy0-701" });
    await waitFor(() => expect(h.leaveFor).toHaveBeenCalledWith("https://checkout.example/session"));
    expect(h.track).toHaveBeenCalledWith("checkout_started", { interval: "monthly" });
    expect(h.track).toHaveBeenCalledWith("path_offer_clicked", {
      cert: "security-plus-sy0-701",
      context: "reveal",
      offer: "pro",
      interval: "monthly",
    });
  });

  it("checks out the period chosen", async () => {
    render(offer());
    fireEvent.click(screen.getByRole("radio", { name: /Three months/ }));
    expect(screen.getByRole("radio", { name: /Three months/ })).toBeChecked();
    expect(screen.getByText(/The plan renews every three months until you cancel\./)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue to payment" }));
    expect(await checkoutInput()).toEqual({ interval: "quarterly", returnTo: "path/security-plus-sy0-701" });
    await waitFor(() => expect(h.track).toHaveBeenCalledWith("checkout_started", { interval: "quarterly" }));
    // The exam is claimed before checkout, so the purchase unlocks this path.
    const order = h.calls.map((c) => c.contract);
    expect(order.indexOf("POST /api/path/enroll")).toBeGreaterThan(-1);
    expect(order.indexOf("POST /api/path/enroll")).toBeLessThan(order.indexOf("POST /api/stripe/checkout"));
  });

  it("sends a learner whose session has ended to sign in and come back, and counts no checkout", async () => {
    h.checkout = new ApiError("unauthorized");
    render(offer());
    fireEvent.click(screen.getByRole("button", { name: "Continue to payment" }));
    await waitFor(() => expect(h.leaveFor).toHaveBeenCalledWith("/login?next=/path/security-plus-sy0-701"));
    expect(h.track).not.toHaveBeenCalledWith("checkout_started", expect.anything());
  });

  it("says what went wrong in a sentence, never in the error's own words", async () => {
    h.checkout = new ApiError("internal", "Request failed (502)");
    render(offer());
    fireEvent.click(screen.getByRole("button", { name: "Continue to payment" }));
    expect((await screen.findByRole("alert")).textContent).toBe("The payment page could not be opened. Please try again.");
    expect(h.track).not.toHaveBeenCalledWith("checkout_started", expect.anything());
  });

  it("offers a Pro member the exam for a single payment, with no period to choose", async () => {
    render(offer({ proPlan: true }));
    expect(screen.getByRole("heading", { level: 2, name: "Add Security+ to your plan" })).toBeInTheDocument();
    expect(screen.queryByRole("radio")).toBeNull();
    expect(screen.getByText("as a single payment")).toBeInTheDocument();
    expect(await screen.findByText("$39")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Add Security\+/ }));
    await waitFor(() => expect(h.track).toHaveBeenCalledWith("checkout_started", { interval: "cert_addon" }));
    expect(h.calls.map((c) => c.contract)).toContain("POST /api/stripe/cert-checkout");
    expect(h.leaveFor).toHaveBeenCalledWith("https://checkout.example/session");
    expect(h.track).toHaveBeenCalledWith("path_offer_clicked", {
      cert: "security-plus-sy0-701",
      context: "reveal",
      offer: "add_exam",
    });
  });

  it("does not count an added exam's checkout when the payment page could not be opened", async () => {
    h.checkout = new ApiError("conflict", "That certification is already in your plan.");
    render(offer({ proPlan: true }));
    fireEvent.click(screen.getByRole("button", { name: /Add Security\+/ }));
    expect((await screen.findByRole("alert")).textContent).toBe("That certification is already in your plan.");
    expect(h.track).not.toHaveBeenCalledWith("checkout_started", expect.anything());
    expect(h.leaveFor).not.toHaveBeenCalled();
  });

  it("never shows a button that cannot be pressed: without the account it says so and offers to try again", async () => {
    const onRetry = vi.fn(async () => {});
    for (const proPlan of [false, true]) {
      const { unmount } = render(offer({ certId: null, proPlan, onRetry }));
      expect(screen.getByText("Your account could not be reached.")).toBeInTheDocument();
      // Nothing is sold while the account is unknown, and no button is disabled.
      expect(screen.queryByRole("radio")).toBeNull();
      expect(screen.queryByRole("button", { name: /Continue to payment|Add Security\+/ })).toBeNull();
      for (const button of screen.getAllByRole("button")) expect(button).not.toBeDisabled();
      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
      await waitFor(() => expect(onRetry).toHaveBeenCalled());
      onRetry.mockClear();
      unmount();
    }
    expect(h.calls.filter((c) => c.contract.startsWith("POST"))).toEqual([]);
  });

  it("moves the focus to its title when the account answers after Try again, and the plans take the button's place", async () => {
    const onRetry = vi.fn(async () => {});
    const { rerender } = render(offer({ certId: null, onRetry }));
    const again = screen.getByRole("button", { name: "Try again" });
    again.focus();
    fireEvent.click(again);
    await waitFor(() => expect(onRetry).toHaveBeenCalledTimes(1));
    // Still no account: the button is still there, and keeps the focus.
    expect(document.activeElement).toBe(again);

    // The account answers. The button has gone, and the focus that it held is on the offer's title.
    rerender(offer({ certId: "cert-1", onRetry }));
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
    expect(await screen.findByRole("button", { name: "Continue to payment" })).toBeInTheDocument();
    const title = screen.getByRole("heading", { level: 2, name: "Continue your study path with Pro" });
    expect(document.activeElement).toBe(title);
    // The title takes the focus so that it is read; it is not a stop for the Tab key.
    expect(title).toHaveAttribute("tabindex", "-1");
  });

  it("leaves the focus alone when the account answers without Try again having been pressed, or when something else holds the focus", async () => {
    // Nobody asked: the page reached the account by itself.
    const first = render(offer({ certId: null, onRetry: async () => {} }));
    first.rerender(offer({ certId: "cert-1" }));
    await screen.findByRole("button", { name: "Continue to payment" });
    expect(document.activeElement).toBe(document.body);
    first.unmount();

    // Asked, and then the learner moved to another control before the account answered.
    const elsewhere = document.createElement("button");
    document.body.appendChild(elsewhere);
    try {
      const onRetry = vi.fn(async () => {});
      const second = render(offer({ certId: null, onRetry }));
      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
      await waitFor(() => expect(onRetry).toHaveBeenCalled());
      elsewhere.focus();
      second.rerender(offer({ certId: "cert-1", onRetry }));
      await screen.findByRole("button", { name: "Continue to payment" });
      expect(document.activeElement).toBe(elsewhere);
    } finally {
      elsewhere.remove();
    }
  });

  it("says what Pro includes for this exam", () => {
    render(offer({ labCount: 31, questionCount: 1008 }));
    expect(screen.getByText("All 22 remaining steps of your Security+ study path")).toBeInTheDocument();
    expect(screen.getByText("All 31 hands-on labs, which work like the exam's performance-based questions")).toBeInTheDocument();
    expect(screen.getByText("All 1,008 Security+ questions, with spaced review")).toBeInTheDocument();
  });
});

// In the offer's place for a member whose last payment did not go through:
// the checkout would refuse such a member a second plan.
describe("PathPaymentPastDue", () => {
  it("says what the billing page says, and leads there", () => {
    const { container } = render(<PathPaymentPastDue />);
    expect(screen.getByRole("heading", { level: 2, name: "Your last payment did not go through." })).toBeInTheDocument();
    expect(screen.getByText("Please update your payment method to keep CertBench Pro.")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Manage billing" });
    expect(link).toHaveAttribute("href", "/upgrade");
    // The link is the one thing to press, and nothing else on the card is drawn as if it could be.
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.getAllByRole("link")).toEqual([link]);
    // A notice, not the offer: no rule in the pressable colour along its top, and nothing in a marking colour.
    expect(container.firstElementChild?.className).not.toMatch(/border-t-primary|border-primary/);
    expect(container.innerHTML).not.toMatch(/text-success|text-destructive|text-warning/);
  });

  it("asks for no price and counts no offer as seen", () => {
    render(<PathPaymentPastDue />);
    expect(h.calls).toEqual([]);
    expect(h.track).not.toHaveBeenCalled();
  });
});
