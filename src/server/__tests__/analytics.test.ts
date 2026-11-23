import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const env = vi.hoisted(() => ({ NEXT_PUBLIC_POSTHOG_KEY: "phc_test" as string | undefined }));
vi.mock("@/env", () => ({ publicEnv: env }));

import {
  ANALYTICS_TIME_LIMIT_MS,
  VISIT_WINDOW_SECONDS,
  capturePurchase,
  captureServerEvent,
  type Purchase,
} from "../analytics";

const fetchMock = vi.fn();

/** What was sent to PostHog in the one request a call makes. */
const sent = () => {
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, init] = fetchMock.mock.calls[0];
  return { url, body: JSON.parse(init.body) };
};

beforeEach(() => {
  env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test";
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response("{}"));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("captureServerEvent", () => {
  it("sends the event under the person's id, and says it came from the server", async () => {
    await captureServerEvent("user-1", "story_submitted", { passed: true });
    const { url, body } = sent();
    expect(url).toBe("https://us.i.posthog.com/batch/");
    expect(body).toEqual({
      api_key: "phc_test",
      batch: [
        {
          event: "story_submitted",
          distinct_id: "user-1",
          properties: { passed: true, $lib: "certbench-server", $geoip_disable: true },
        },
      ],
    });
  });

  // The server's address is Vercel's: looked up, it placed every person in Ashburn.
  it("never asks PostHog to place the event by the server's address", async () => {
    await captureServerEvent("user-1", "lifecycle_email_sent", { $geoip_disable: false });
    expect(sent().body.batch[0].properties.$geoip_disable).toBe(true);
  });

  it("gives every send a time limit of two seconds", async () => {
    expect(ANALYTICS_TIME_LIMIT_MS).toBe(2000);
    const timeout = vi.spyOn(AbortSignal, "timeout");
    await captureServerEvent("user-1", "lifecycle_run");
    expect(timeout).toHaveBeenCalledWith(2000);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.signal).toBe(timeout.mock.results[0].value);
  });

  it("does not throw when the send runs out of time or the service is down", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockRejectedValue(new DOMException("The operation was aborted due to timeout", "TimeoutError"));
    await expect(captureServerEvent("user-1", "server_error")).resolves.toBeUndefined();
    expect(log).toHaveBeenCalled();
  });

  it("writes it to the log when PostHog refuses the events", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockResolvedValue(new Response("{}", { status: 400 }));
    await expect(captureServerEvent("user-1", "lifecycle_run")).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledWith("PostHog server capture was refused: 400");
  });

  it("sends nothing when no PostHog key is set", async () => {
    env.NEXT_PUBLIC_POSTHOG_KEY = undefined;
    await captureServerEvent("user-1", "lifecycle_run");
    await capturePurchase({ userId: "user-1", event: "subscription_activated", properties: {}, visit: {} });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("capturePurchase", () => {
  /** The payment page was opened at this time (Stripe's seconds), and paid two minutes later. */
  const OPENED = 1_763_900_000;
  const AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15";
  const purchase = (overrides: Partial<Purchase> = {}): Purchase => ({
    userId: "user-1",
    event: "subscription_activated",
    properties: { stripe_subscription_id: "sub_1", plan: "pro", interval: "monthly", revenue: 19, currency: "USD" },
    visit: { distinctId: "019a-anonymous", sessionId: "019a-session", userAgent: AGENT },
    checkoutAt: OPENED,
    paidAt: OPENED + 120,
    ...overrides,
  });
  const PAID_AT = new Date((OPENED + 120) * 1000).toISOString();

  it("identifies the browser as the buyer, then records the purchase on the visit, in one request", async () => {
    await capturePurchase(purchase());
    const { url, body } = sent();
    expect(url).toBe("https://us.i.posthog.com/batch/");
    expect(body).toEqual({
      api_key: "phc_test",
      batch: [
        {
          event: "$identify",
          distinct_id: "user-1",
          timestamp: PAID_AT,
          properties: {
            $anon_distinct_id: "019a-anonymous",
            $raw_user_agent: AGENT,
            $lib: "certbench-server",
            $geoip_disable: true,
          },
        },
        {
          event: "subscription_activated",
          distinct_id: "user-1",
          timestamp: PAID_AT,
          properties: {
            stripe_subscription_id: "sub_1",
            plan: "pro",
            interval: "monthly",
            revenue: 19,
            currency: "USD",
            $session_id: "019a-session",
            $raw_user_agent: AGENT,
            $lib: "certbench-server",
            $geoip_disable: true,
          },
        },
      ],
    });
  });

  it("identifies no one when the browser already was the buyer", async () => {
    await capturePurchase(purchase({ visit: { distinctId: "user-1", sessionId: "019a-session", userAgent: AGENT } }));
    const { batch } = sent().body;
    expect(batch.map((e: { event: string }) => e.event)).toEqual(["subscription_activated"]);
    expect(batch[0].properties.$session_id).toBe("019a-session");
  });

  it("places a purchase paid within the hour on the visit that opened its page", async () => {
    await capturePurchase(purchase({ paidAt: OPENED + VISIT_WINDOW_SECONDS }));
    expect(sent().body.batch[1].properties.$session_id).toBe("019a-session");
  });

  // A bank debit is paid days after its page: the visit had long ended.
  it("does not place a purchase paid later than that on the visit, but still on the buyer", async () => {
    await capturePurchase(purchase({ paidAt: OPENED + VISIT_WINDOW_SECONDS + 1 }));
    const { batch } = sent().body;
    expect(batch.map((e: { event: string }) => e.event)).toEqual(["$identify", "subscription_activated"]);
    expect(batch[1].properties).not.toHaveProperty("$session_id");
    expect(batch[1].distinct_id).toBe("user-1");
  });

  it("does not place a purchase on a visit when it is not known when the page was opened", async () => {
    await capturePurchase(purchase({ checkoutAt: undefined }));
    expect(sent().body.batch[1].properties).not.toHaveProperty("$session_id");
  });

  it("records a payment page opened without PostHog on the buyer alone, as before", async () => {
    await capturePurchase(purchase({ visit: {} }));
    const { batch } = sent().body;
    expect(batch).toEqual([
      {
        event: "subscription_activated",
        distinct_id: "user-1",
        timestamp: PAID_AT,
        properties: {
          stripe_subscription_id: "sub_1",
          plan: "pro",
          interval: "monthly",
          revenue: 19,
          currency: "USD",
          $lib: "certbench-server",
          $geoip_disable: true,
        },
      },
    ]);
  });

  it("is dated when it was sent where Stripe gave no time", async () => {
    await capturePurchase(purchase({ paidAt: undefined }));
    for (const event of sent().body.batch) expect(event).not.toHaveProperty("timestamp");
  });

  it("does not throw when PostHog is down", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    await expect(capturePurchase(purchase())).resolves.toBeUndefined();
  });
});
