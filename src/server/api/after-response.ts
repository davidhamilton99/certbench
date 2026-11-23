import "server-only";

import { after } from "next/server";
import { reportServerError } from "@/server/api/report-error";

/**
 * Work that the visitor does not wait for: a welcome email, an error report,
 * a refresh of something already held. Next's `after()` runs it once the
 * response has gone and keeps the server instance alive until it settles.
 *
 * `after()` exists only while a request is being served. Outside one (a
 * script, a unit test, a host that cannot extend a request) the work still
 * runs, simply without that guarantee. The work must not throw: a failure is
 * logged and reported here, and goes no further.
 */
export function afterResponse(work: () => unknown | Promise<unknown>): void {
  const run = async () => {
    try {
      await work();
    } catch (err) {
      console.error("[after response] background work failed:", err);
      await reportFailure(err);
    }
  };
  try {
    after(run);
  } catch {
    void run();
  }
}

/**
 * Background work that failed is reported as a server error. The visitor has
 * had their response by then, so nothing they see says that the email was not
 * sent or the record not written: the log line alone left it to be found by
 * chance.
 *
 * The report carries the kind of error and none of its words (an email
 * provider's message can hold an address); the full error is in the log.
 *
 * A report is never the work that is reported: `reportServerError` does not
 * throw, so work that is itself a report cannot arrive here, and this report
 * is sent directly, not handed to `afterResponse` again. If it fails after
 * all, that is logged and nothing more is tried.
 */
async function reportFailure(err: unknown): Promise<void> {
  try {
    const fault = new Error("Background work failed after the response");
    if (err instanceof Error) fault.name = err.name;
    await reportServerError(fault, { route: "service:after-response", kind: "service" });
  } catch (reportError) {
    console.error("[after response] the failure could not be reported:", reportError);
  }
}
