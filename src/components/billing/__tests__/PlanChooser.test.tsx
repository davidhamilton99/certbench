// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ApiError } from "@/contracts/errors";
import { regionPricing } from "@/lib/pricing/ppp";
import { PRO_PRICE_REGION_NOTE } from "@/lib/pricing/terms";

const h = vi.hoisted(() => ({
  calls: [] as { key: string; input: unknown }[],
  track: vi.fn(),
  leaveFor: vi.fn(),
  region: (() => Promise.reject(new Error("not set"))) as () => Promise<unknown>,
  checkout: (() => Promise.resolve({ url: "https://checkout.example/session" })) as () => Promise<{ url: string }>,
}));

vi.mock("@/lib/analytics", () => ({ track: (...args: unknown[]) => h.track(...args) }));
vi.mock("../leave", () => ({ leaveFor: (url: string) => h.leaveFor(url) }));
vi.mock("@/lib/api-client", () => ({
  api: async (contract: { method: string; path: string }, input: unknown) => {
    const key = `${contract.method} ${contract.path}`;
    h.calls.push({ key, input });
    if (key === "GET /api/pricing/region") return h.region();
    if (key === "POST /api/stripe/checkout") return h.checkout();
    throw new Error(`unexpected request: ${key}`);
  },
}));

import { PlanChooser, REGIONAL_PRICE_NOTE, savingPercent } from "../PlanChooser";

const LIST = regionPricing(null);
const INDIA = regionPricing("IN");
const ALL = ["monthly", "quarterly", "annual"] as const;

function chooser(props: Partial<Parameters<typeof PlanChooser>[0]> = {}) {
  return (
    <PlanChooser
      plans={ALL}
      defaultPlan="quarterly"
      initialPricing={LIST}
      returnTo="pricing"
      signInHref={(plan) => `/register?next=${plan}`}
      {...props}
    />
  );
}

/** A promise that a test settles when it chooses. */
function held<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const pay = () => fireEvent.click(screen.getByRole("button", { name: "Continue to payment" }));

beforeEach(() => {
  h.calls = [];
  h.track.mockClear();
  h.leaveFor.mockClear();
  h.region = () => Promise.resolve(LIST);
  h.checkout = () => Promise.resolve({ url: "https://checkout.example/session" });
});

afterEach(cleanup);

describe("the plan chooser", () => {
  it("is a set of native radio buttons named Billing period, with the page's period chosen first", () => {
    render(chooser());
    const group = screen.getByRole("group", { name: "Billing period" });
    expect(group.tagName).toBe("FIELDSET");
    const radios = screen.getAllByRole("radio") as HTMLInputElement[];
    expect(radios.map((r) => r.value)).toEqual(["monthly", "quarterly", "annual"]);
    for (const radio of radios) {
      expect(radio.tagName).toBe("INPUT");
      expect(radio.type).toBe("radio");
      // One name: one stop for the Tab key, and the arrow keys move between them.
      expect(radio.name).toBe(radios[0].name);
      expect(group).toContainElement(radio);
    }
    expect(screen.getByRole("radio", { name: /Three months/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Monthly/ })).not.toBeChecked();
  });

  it("lists only the periods the page sells, and chooses the first when the default is not one of them", () => {
    render(chooser({ plans: ["monthly", "quarterly"], defaultPlan: "annual" }));
    expect(screen.getAllByRole("radio")).toHaveLength(2);
    expect(screen.queryByRole("radio", { name: /Annual/ })).toBeNull();
    expect(screen.getByRole("radio", { name: /Monthly/ })).toBeChecked();
  });

  it("prints the visitor's own regional price plainly: no struck-through figure, no badge, no green", () => {
    const { container } = render(chooser({ initialPricing: INDIA }));
    expect(screen.getByText("$7.60")).toBeInTheDocument();
    expect(screen.getByText("$15.60")).toBeInTheDocument();
    expect(screen.getByText("$39.60")).toBeInTheDocument();
    expect(screen.queryByText("$19")).toBeNull();
    expect(screen.queryByText("$39")).toBeNull();
    expect(container.innerHTML).not.toMatch(/line-through|text-success|bg-success/);
    expect(container.textContent).not.toMatch(/Save \d|Lowest cost/);
    // What a longer period saves is a sentence in the option it belongs to.
    expect(screen.getByRole("radio", { name: /Three months/ }).closest("label")?.textContent).toContain(
      "This is 32% less than three monthly payments."
    );
    expect(screen.getByRole("radio", { name: /Annual/ }).closest("label")?.textContent).toContain(
      "This is 57% less than twelve monthly payments."
    );
    expect(screen.getByText(REGIONAL_PRICE_NOTE)).toBeInTheDocument();
    // Nothing was asked for: the server had already worked the prices out.
    expect(h.calls).toEqual([]);
  });

  it("says that prices are adjusted by region to a visitor whose own prices are not", () => {
    render(chooser());
    expect(screen.getByText(PRO_PRICE_REGION_NOTE)).toBeInTheDocument();
    expect(screen.queryByText(REGIONAL_PRICE_NOTE)).toBeNull();
  });

  it("prints no figure until the regional prices are known, and keeps the figure's place meanwhile", async () => {
    const region = held<unknown>();
    h.region = () => region.promise;
    const { container } = render(chooser({ initialPricing: undefined }));

    expect(container.textContent).not.toContain("$");
    const figures = [...container.querySelectorAll("label .cb-display")];
    expect(figures).toHaveLength(3);
    for (const figure of figures) {
      expect(figure.textContent).toBe("");
      // A fixed line height: the row is as tall without the figure as with it.
      expect(figure.className).toMatch(/\bh-8\b/);
    }

    await act(async () => region.resolve(regionPricing("BR")));
    expect(screen.getByText("$11.40")).toBeInTheDocument();
    expect(screen.getByText("$23.40")).toBeInTheDocument();
    expect(screen.queryByText("$19")).toBeNull();
    expect(h.calls.map((c) => c.key)).toEqual(["GET /api/pricing/region"]);
  });

  it("shows the list prices, and says that prices are adjusted by region, when the regional prices cannot be fetched", async () => {
    h.region = () => Promise.reject(new ApiError("internal", "Request failed (502)"));
    render(chooser({ initialPricing: undefined }));
    expect(await screen.findByText("$19")).toBeInTheDocument();
    expect(screen.getByText("$39")).toBeInTheDocument();
    expect(screen.getByText("$99")).toBeInTheDocument();
    expect(screen.getByText(PRO_PRICE_REGION_NOTE)).toBeInTheDocument();
  });

  it("says how the chosen period renews, and where the plan is canceled", () => {
    render(chooser());
    expect(screen.getByText(/The plan renews every three months until you cancel\./)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /Monthly/ }));
    expect(screen.getByText(/The plan renews every month until you cancel\./)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /Annual/ }));
    expect(screen.getByText(/The plan renews every year until you cancel\./)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "billing page" }).getAttribute("href")).toBe("/help#account");
  });
});

describe("opening the payment page", () => {
  it("asks for the chosen period, and counts the checkout only once there is a payment page", async () => {
    const session = held<{ url: string }>();
    h.checkout = () => session.promise;
    const onPress = vi.fn();
    render(chooser({ onPress }));
    fireEvent.click(screen.getByRole("radio", { name: /Annual/ }));
    pay();

    await waitFor(() => expect(h.calls.map((c) => c.key)).toContain("POST /api/stripe/checkout"));
    expect(h.calls.at(-1)?.input).toEqual({ interval: "annual", returnTo: "pricing" });
    expect(onPress).toHaveBeenCalledWith("annual");
    // While it opens: the button is busy, the choice cannot be changed, and it is said in words.
    const button = screen.getByRole("button", { name: "Continue to payment" });
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByRole("group", { name: "Billing period" })).toBeDisabled();
    expect(screen.getByRole("status").textContent).toBe("The payment page is opening.");
    expect(h.track).not.toHaveBeenCalledWith("checkout_started", expect.anything());
    expect(h.leaveFor).not.toHaveBeenCalled();

    await act(async () => session.resolve({ url: "https://checkout.example/annual" }));
    expect(h.track).toHaveBeenCalledWith("checkout_started", { interval: "annual" });
    expect(h.leaveFor).toHaveBeenCalledWith("https://checkout.example/annual");
  });

  it("opens only one payment page when the button is pressed twice", async () => {
    const session = held<{ url: string }>();
    h.checkout = () => session.promise;
    render(chooser());
    pay();
    pay();
    await waitFor(() => expect(h.calls).toHaveLength(1));
    await act(async () => session.resolve({ url: "https://checkout.example/once" }));
    expect(h.calls.filter((c) => c.key === "POST /api/stripe/checkout")).toHaveLength(1);
  });

  it("sends a visitor who is not signed in to create an account, with the period they chose, and counts no checkout", async () => {
    h.checkout = () => Promise.reject(new ApiError("unauthorized"));
    render(chooser());
    fireEvent.click(screen.getByRole("radio", { name: /Monthly/ }));
    pay();
    await waitFor(() => expect(h.leaveFor).toHaveBeenCalledWith("/register?next=monthly"));
    expect(h.track).not.toHaveBeenCalledWith("checkout_started", expect.anything());
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("says what went wrong in a sentence, and makes the choice available again", async () => {
    const limit = "Too many attempts to open the payment page were made in the past hour. Please try again later.";
    h.checkout = () => Promise.reject(new ApiError("rate_limited", limit));
    render(chooser());
    pay();
    expect((await screen.findByRole("alert")).textContent).toBe(limit);
    expect(screen.getByRole("group", { name: "Billing period" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Continue to payment" }).getAttribute("aria-busy")).toBeNull();
    expect(h.track).not.toHaveBeenCalledWith("checkout_started", expect.anything());
    expect(h.leaveFor).not.toHaveBeenCalled();

    // A message that was not written for a person is never shown.
    h.checkout = () => Promise.reject(new ApiError("internal", "Request failed (502)"));
    pay();
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe("The payment page could not be opened. Please try again.")
    );
    h.checkout = () => Promise.reject(new ApiError("rate_limited"));
    pay();
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/^Too many requests were made/));
  });

  it("finishes the page's own work before it asks for the payment page, and stops if that fails", async () => {
    const order: string[] = [];
    h.checkout = async () => {
      order.push("checkout");
      return { url: "https://checkout.example/session" };
    };
    const { unmount } = render(
      chooser({
        beforeCheckout: async () => {
          order.push("before");
        },
      })
    );
    pay();
    await waitFor(() => expect(h.leaveFor).toHaveBeenCalled());
    expect(order).toEqual(["before", "checkout"]);
    unmount();

    h.calls = [];
    render(chooser({ beforeCheckout: () => Promise.reject(new ApiError("internal", "Request failed (500)")) }));
    pay();
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(h.calls).toEqual([]);
  });
});

describe("what a longer period saves", () => {
  it("is worked out from the list prices", () => {
    expect(savingPercent("monthly")).toBeNull();
    expect(savingPercent("quarterly")).toBe(32);
    expect(savingPercent("annual")).toBe(57);
  });

  it("is the same percentage in every region, so one sentence is true everywhere", () => {
    const cents = (price: string) => Math.round(Number.parseFloat(price.replace("$", "")) * 100);
    for (const country of [null, "PL", "BR", "IN"]) {
      const { prices } = regionPricing(country);
      const monthly = cents(prices.monthly.discounted);
      expect(Math.round((1 - cents(prices.quarterly.discounted) / (3 * monthly)) * 100), String(country)).toBe(
        savingPercent("quarterly")
      );
      expect(Math.round((1 - cents(prices.annual.discounted) / (12 * monthly)) * 100), String(country)).toBe(
        savingPercent("annual")
      );
    }
  });
});
