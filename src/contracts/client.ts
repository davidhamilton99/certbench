import { lazyContract } from "./lazy";

/**
 * The endpoints that public pages and the study path call, named without their
 * schemas (see ./lazy). Import an endpoint from here in a component that is
 * part of a public page's first load; `api()` fetches its schemas with the
 * first request. A signed-in workspace screen may import the contract itself.
 *
 * Each pair of path and method is checked against its contract by
 * src/contracts/__tests__/lazy-contracts.test.ts.
 */

// The study path.
export const getPathStop = lazyContract("/api/path/stop", "POST", () => import("./path").then((m) => m.getPathStop));
export const getPathLab = lazyContract("/api/path/lab", "POST", () => import("./path").then((m) => m.getPathLab));
export const getPathRehearsal = lazyContract("/api/path/rehearsal", "POST", () =>
  import("./path").then((m) => m.getPathRehearsal)
);
export const getPathProgress = lazyContract("/api/path/progress", "GET", () =>
  import("./path").then((m) => m.getPathProgress)
);
export const savePathProgress = lazyContract("/api/path/progress", "POST", () =>
  import("./path").then((m) => m.savePathProgress)
);
export const enrollInPath = lazyContract("/api/path/enroll", "POST", () => import("./path").then((m) => m.enrollInPath));
export const recordPathAnswers = lazyContract("/api/path/answers", "POST", () =>
  import("./path").then((m) => m.recordPathAnswers)
);

// Billing.
export const createCheckout = lazyContract("/api/stripe/checkout", "POST", () =>
  import("./billing").then((m) => m.createCheckout)
);
export const addCertCheckout = lazyContract("/api/stripe/cert-checkout", "POST", () =>
  import("./billing").then((m) => m.addCertCheckout)
);
export const createPortal = lazyContract("/api/stripe/portal", "POST", () =>
  import("./billing").then((m) => m.createPortal)
);
export const getRegionPricing = lazyContract("/api/pricing/region", "GET", () =>
  import("./billing").then((m) => m.getRegionPricing)
);

// The public tools.
export const captureToolLead = lazyContract("/api/tools/lead", "POST", () =>
  import("./tools").then((m) => m.captureToolLead)
);
export const getDrillProgress = lazyContract("/api/tools/progress", "GET", () =>
  import("./tools").then((m) => m.getDrillProgress)
);
export const saveDrillProgress = lazyContract("/api/tools/progress", "POST", () =>
  import("./tools").then((m) => m.saveDrillProgress)
);

// A study set opened from a shared link (/share/[setId]). The player and the
// component that counts the visit are shared with the signed-in pages, so
// every endpoint those two components call is named here, the member's own
// (the bookmark, the report) included: one contract imported as a value would
// bring the schema library back into the public page.
export const saveSetProgress = lazyContract("/api/study-sets/progress", "POST", () =>
  import("./study-sets").then((m) => m.saveSetProgress)
);
export const clearSetProgress = lazyContract("/api/study-sets/progress/clear", "POST", () =>
  import("./study-sets").then((m) => m.clearSetProgress)
);
export const recordCommunityAttempt = lazyContract("/api/community/attempt", "POST", () =>
  import("./community").then((m) => m.recordCommunityAttempt)
);
export const toggleBookmark = lazyContract("/api/community/bookmark", "POST", () =>
  import("./community").then((m) => m.toggleBookmark)
);
export const reportCommunitySet = lazyContract("/api/community/report", "POST", () =>
  import("./community").then((m) => m.reportCommunitySet)
);

// The answer to "How did your exam go?" (/story), reached from the post-exam email.
export const submitStory = lazyContract("/api/story", "POST", () => import("./story").then((m) => m.submitStory));
