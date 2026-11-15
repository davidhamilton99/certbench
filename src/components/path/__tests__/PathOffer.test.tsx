// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => ({
  calls: [] as { contract: string; input: unknown }[],
  track: vi.fn(),
  pricing: null as unknown,
}));

vi.mock("@/lib/analytics", () => ({ track: (...args: unknown[]) => h.track(...args) }));
vi.mock("@/lib/api-client", () => ({
  api: async (contract: { method: string; path: string }, input: unknown) => {
    const key = `${contract.method} ${contract.path}`;
    h.calls.push({ contract: key, input });
    if (key === "GET /api/pricing/region") return h.pricing;
    if (key === "POST /api/path/enroll") return { enrolled: true };
    return { url: "https://checkout.example/session" };
  },
}));

import { PathOffer } from "../PathOffer";

const BASE_PRICES = {
  discountPercent: null,
  prices: {
    monthly: { original: "$19", discounted: "$19" },
    quarterly: { original: "$39", discounted: "$39" },
    annual: { original: "$149", discounted: "$149" },
  },
};

function offer(proPlan = false) {
  return (
    <PathOffer
      cert="security-plus-sy0-701"
      certId="cert-1"
      examName="Security+"
      remainingStops={22}
      questionCount={842}
      proPlan={proPlan}
      examDate={null}
      context="reveal"
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
  h.pricing = BASE_PRICES;
  // The button sends the browser to Stripe; jsdom can't navigate, so keep it from trying.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("PathOffer", () => {
  it("offers monthly beside three months, with monthly picked first", async () => {
    render(offer());
    const monthly = screen.getByRole("radio", { name: /Monthly/ });
    const quarterly = screen.getByRole("radio", { name: /3 months/ });
    expect(monthly).toBeChecked();
    expect(quarterly).not.toBeChecked();
    expect(screen.getByText("$19")).toBeInTheDocument();
    expect(screen.getByText("$39")).toBeInTheDocument();
    // Three months against three monthly payments: 39 / 57.
    expect(screen.getByText("Save 32%")).toBeInTheDocument();
    expect(screen.getByText("Renews monthly. Cancel anytime.")).toBeInTheDocument();
    expect(screen.getByText(/Study with Pro for 30\+ days and don't pass\?/)).toBeInTheDocument();
  });

  it("checks out monthly when nothing else is picked", async () => {
    render(offer());
    fireEvent.click(screen.getByRole("button", { name: /Unlock my path/ }));
    expect(await checkoutInput()).toEqual({ interval: "monthly", returnTo: "path/security-plus-sy0-701" });
    expect(h.track).toHaveBeenCalledWith("checkout_started", { interval: "monthly" });
    expect(h.track).toHaveBeenCalledWith("path_offer_clicked", {
      cert: "security-plus-sy0-701",
      context: "reveal",
      offer: "pro",
      interval: "monthly",
    });
  });

  it("checks out the plan picked", async () => {
    render(offer());
    fireEvent.click(screen.getByRole("radio", { name: /3 months/ }));
    expect(screen.getByRole("radio", { name: /3 months/ })).toBeChecked();
    expect(screen.getByText("Renews every 3 months. Cancel anytime.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Unlock my path/ }));
    expect(await checkoutInput()).toEqual({ interval: "quarterly", returnTo: "path/security-plus-sy0-701" });
    expect(h.track).toHaveBeenCalledWith("checkout_started", { interval: "quarterly" });
    // The exam is claimed before checkout, so the purchase unlocks this path.
    expect(h.calls.map((c) => c.contract)).toContain("POST /api/path/enroll");
  });

  it("shows a regional discount on both plans", async () => {
    h.pricing = {
      discountPercent: 40,
      prices: {
        monthly: { original: "$19", discounted: "$11.40" },
        quarterly: { original: "$39", discounted: "$23.40" },
        annual: { original: "$149", discounted: "$89.40" },
      },
    };
    render(offer());
    expect(await screen.findByText("$11.40")).toBeInTheDocument();
    expect(screen.getByText("$23.40")).toBeInTheDocument();
    expect(screen.getByText("$19")).toHaveClass("line-through");
    expect(screen.getByText("$39")).toHaveClass("line-through");
    expect(screen.getByText("Save 32%")).toBeInTheDocument();
  });

  it("offers a Pro member the exam as a one-time add-on, with no plan to pick", async () => {
    render(offer(true));
    expect(screen.queryByRole("radio")).toBeNull();
    expect(screen.getByText("one time")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Add Security\+/ }));
    await waitFor(() => expect(h.track).toHaveBeenCalledWith("checkout_started", { interval: "cert_addon" }));
    expect(h.track).toHaveBeenCalledWith("path_offer_clicked", {
      cert: "security-plus-sy0-701",
      context: "reveal",
      offer: "add_exam",
    });
  });
});
