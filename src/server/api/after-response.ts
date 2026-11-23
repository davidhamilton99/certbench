import "server-only";

import { after } from "next/server";

/**
 * Work that the visitor does not wait for: a welcome email, an error report,
 * a refresh of something already held. Next's `after()` runs it once the
 * response has gone and keeps the server instance alive until it settles.
 *
 * `after()` exists only while a request is being served. Outside one (a
 * script, a unit test, a host that cannot extend a request) the work still
 * runs, simply without that guarantee. The work must not throw: a failure is
 * logged here and goes no further.
 */
export function afterResponse(work: () => unknown | Promise<unknown>): void {
  const run = async () => {
    try {
      await work();
    } catch (err) {
      console.error("[after response] background work failed:", err);
    }
  };
  try {
    after(run);
  } catch {
    void run();
  }
}
