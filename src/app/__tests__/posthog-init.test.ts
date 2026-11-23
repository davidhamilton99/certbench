import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The PostHog snippet is a string in the root layout, so it is read as text.
const layout = readFileSync(join(process.cwd(), "src", "app", "layout.tsx"), "utf8");
const init = layout.slice(layout.indexOf("posthog.init("));

describe("PostHog in the root layout", () => {
  // An uncaught error in a browser outside an error page was reported nowhere:
  // the error pages report what reaches them, and Sentry is not set up.
  it("captures uncaught browser errors", () => {
    expect(init).toContain("capture_exceptions:true");
  });

  it("still sends through the site's own address and hides the tokens of email links", () => {
    expect(init).toContain("api_host:'/ingest'");
    expect(init).toContain("before_send:");
    expect(init).toContain("searchParams.set('token','redacted')");
  });
});
