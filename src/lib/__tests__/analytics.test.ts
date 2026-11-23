// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { analyticsIds } from "../analytics";

type PostHog = NonNullable<Window["posthog"]>;

/** A PostHog on the page that answers the two ids as given. */
function posthogWith(ids: { get_distinct_id?: () => unknown; get_session_id?: () => unknown }): PostHog {
  return { capture: () => {}, identify: () => {}, reset: () => {}, ...ids };
}

afterEach(() => {
  delete window.posthog;
});

describe("analyticsIds", () => {
  it("reads the browser's distinct id and session id from PostHog", () => {
    window.posthog = posthogWith({
      get_distinct_id: () => "019a8f2e-0b1c-7d2e-9f30-4a5b6c7d8e9f",
      get_session_id: () => "019a8f2e-1111-7222-8333-444455556666",
    });
    expect(analyticsIds()).toEqual({
      distinctId: "019a8f2e-0b1c-7d2e-9f30-4a5b6c7d8e9f",
      sessionId: "019a8f2e-1111-7222-8333-444455556666",
    });
  });

  it("is empty where PostHog is not on the page (an ad blocker)", () => {
    expect(analyticsIds()).toEqual({});
  });

  // The page's snippet queues every call until the library arrives, and answers nothing.
  it("is empty while only PostHog's stub has loaded", () => {
    window.posthog = posthogWith({ get_distinct_id: () => undefined, get_session_id: () => undefined });
    expect(analyticsIds()).toEqual({});
  });

  it("keeps only ids that are text", () => {
    window.posthog = posthogWith({ get_distinct_id: () => "", get_session_id: () => 42 });
    expect(analyticsIds()).toEqual({});
  });

  it("never throws, so that a payment page always opens", () => {
    window.posthog = posthogWith({
      get_distinct_id: () => {
        throw new Error("persistence is not ready");
      },
    });
    expect(analyticsIds()).toEqual({});
  });
});
