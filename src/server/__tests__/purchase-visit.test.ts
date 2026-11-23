import { describe, expect, it } from "vitest";
import { visitMetadata, visitOf } from "../purchase-visit";

const AGENT = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";

describe("visitMetadata", () => {
  it("keeps the browser's PostHog ids and its user agent under names that say what they are", () => {
    expect(visitMetadata({ distinctId: "019a-anonymous", sessionId: "019a-session" }, AGENT)).toEqual({
      posthog_distinct_id: "019a-anonymous",
      posthog_session_id: "019a-session",
      posthog_user_agent: AGENT,
    });
  });

  it("keeps only what is known", () => {
    expect(visitMetadata(undefined, null)).toEqual({});
    expect(visitMetadata({}, "  ")).toEqual({});
    // PostHog blocked in the browser: the request still says what browser it was.
    expect(visitMetadata(undefined, AGENT)).toEqual({ posthog_user_agent: AGENT });
    expect(visitMetadata({ sessionId: "019a-session" }, null)).toEqual({ posthog_session_id: "019a-session" });
  });

  // Stripe refuses a metadata value longer than 500 characters, and with it the payment page.
  it("cuts a user agent to the 500 characters Stripe keeps", () => {
    const long = `${AGENT} ${"x".repeat(600)}`;
    const kept = visitMetadata(undefined, long).posthog_user_agent;
    expect(kept).toHaveLength(500);
    expect(long.startsWith(kept)).toBe(true);
  });
});

describe("visitOf", () => {
  it("reads back what a payment page kept", () => {
    const metadata = {
      supabase_user_id: "user-1",
      ...visitMetadata({ distinctId: "019a-anonymous", sessionId: "019a-session" }, AGENT),
    };
    expect(visitOf(metadata)).toEqual({ distinctId: "019a-anonymous", sessionId: "019a-session", userAgent: AGENT });
  });

  it("reads nothing from a page opened before the visit was kept, or without metadata", () => {
    expect(visitOf({ supabase_user_id: "user-1" })).toEqual({});
    expect(visitOf(null)).toEqual({});
    expect(visitOf(undefined)).toEqual({});
    // Stripe returns an empty string for a key that was cleared.
    expect(visitOf({ posthog_session_id: "" })).toEqual({});
  });
});
