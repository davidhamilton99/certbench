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
