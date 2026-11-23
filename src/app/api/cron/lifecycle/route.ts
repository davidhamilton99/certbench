import { NextRequest, NextResponse } from "next/server";
import { serverEnv } from "@/env";
import { runLifecycleEmails } from "@/server/services/lifecycle-email";
import { captureServerEvent } from "@/server/analytics";
import { reportServerError, type ErrorPlace } from "@/server/api/report-error";

/** The PostHog person a run's summary is recorded on: the job, not a user. */
const RUN_ID = "system:lifecycle-cron";

/** This handler, as an error report names it. */
const CRON: ErrorPlace = { route: "/api/cron/lifecycle", method: "GET", kind: "route" };

/**
 * Daily lifecycle-email pass, invoked by the Vercel cron (vercel.json).
 * Machine endpoint authenticated by CRON_SECRET (Vercel sends it as a
 * Bearer token automatically when the env var is set), so it is a plain
 * handler: a documented exception to the defineEndpoint factory.
 *
 * Every outcome leaves something to check in PostHog, on the job's own person:
 *   - `lifecycle_run_started` when an authorized call begins;
 *   - `lifecycle_run` with the run's numbers when it ends (`stoppedEarly` says
 *     that it ran out of time before it reached every account);
 *   - `lifecycle_run_failed` with the reason when it could not run or broke,
 *     and beside it a `server_error`, the one event every fault on the server
 *     is filed under, so that a single alert covers this job too.
 * A start with neither of the other two is a run that was cut off, for example
 * by the function's time limit below. A day with no start is a day on which
 * the cron did not call, or was turned away.
 */
export const maxDuration = 300;

const runFailed = () =>
  NextResponse.json({ error: { code: "internal", message: "Lifecycle run failed" } }, { status: 500 });

export async function GET(req: NextRequest) {
  // The secret is read where a failure can be recorded. Read outside any
  // handler, a missing secret threw before anything ran: Vercel's daily call
  // received an empty 500 that left no trace, and no lifecycle email was sent
  // from July to November 2026.
  let secret: string;
  try {
    secret = serverEnv("CRON_SECRET");
  } catch (err) {
    console.error("lifecycle cron failed:", err);
    await captureServerEvent(RUN_ID, "lifecycle_run_failed", { message: "CRON_SECRET is not set" });
    await reportServerError(err, CRON);
    return runFailed();
  }

  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Unauthorized" } },
      { status: 401 }
    );
  }

  await captureServerEvent(RUN_ID, "lifecycle_run_started");
  try {
    const result = await runLifecycleEmails();
    console.log("lifecycle emails:", JSON.stringify(result));
    // The run's numbers in PostHog too, so that a run that sends nothing, or
    // stops early, shows up there and not only in Vercel's logs.
    await captureServerEvent(RUN_ID, "lifecycle_run", { ...result });
    return NextResponse.json(result);
  } catch (err) {
    console.error("lifecycle cron failed:", err);
    await captureServerEvent(RUN_ID, "lifecycle_run_failed", {
      message: err instanceof Error ? err.message.slice(0, 200) : "unknown",
    });
    await reportServerError(err, CRON);
    return runFailed();
  }
}
