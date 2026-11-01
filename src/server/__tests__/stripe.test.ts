import { describe, expect, it, vi } from "vitest";

vi.mock("@/env", () => ({ serverEnv: vi.fn() }));

import { hasLiveSubscription } from "../stripe";

/** A Stripe client whose customer has subscriptions in these states. */
const stripeWith = (...statuses: string[]) => {
  const list = vi.fn(async () => ({ data: statuses.map((status) => ({ status })) }));
  return { client: { subscriptions: { list } } as unknown as Parameters<typeof hasLiveSubscription>[0], list };
};

describe("hasLiveSubscription", () => {
  it("counts an active or trialing plan, which a second checkout would duplicate", async () => {
    expect(await hasLiveSubscription(stripeWith("active").client, "cus_1")).toBe(true);
    expect(await hasLiveSubscription(stripeWith("incomplete_expired", "trialing").client, "cus_1")).toBe(true);
  });

  it("lets someone buy again once a plan has lapsed", async () => {
    expect(await hasLiveSubscription(stripeWith().client, "cus_1")).toBe(false);
    expect(await hasLiveSubscription(stripeWith("incomplete_expired", "past_due").client, "cus_1")).toBe(false);
  });

  it("asks Stripe about this customer", async () => {
    const { client, list } = stripeWith();
    await hasLiveSubscription(client, "cus_42");
    expect(list).toHaveBeenCalledWith({ customer: "cus_42", limit: 10 });
  });
});
