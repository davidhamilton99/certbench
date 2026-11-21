import { NextRequest, NextResponse } from "next/server";
import { serverEnv } from "@/env";
import { runLifecycleEmails } from "@/server/services/lifecycle-email";
import { captureServerEvent } from "@/server/analytics";

/** The PostHog person a run's summary is recorded on: the job, not a user. */
const RUN_ID = "system:lifecycle-cron";

/**
 * Daily lifecycle-email pass, invoked by the Vercel cron (vercel.json).
 * Machine endpoint authenticated by CRON_SECRET (Vercel sends it as a
 * Bearer token automatically when the env var is set), so it's a plain
 * handler — a documented exception to the defineEndpoint factory.
 */
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${serverEnv("CRON_SECRET")}`) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Unauthorized" } },
      { status: 401 }
    );
  }

  try {
    const result = await runLifecycleEmails();
    console.log("lifecycle emails:", JSON.stringify(result));
    // The run's numbers in PostHog too, so a run that sends nothing, or
    // doesn't run, shows up there rather than only in Vercel's logs.
    await captureServerEvent(RUN_ID, "lifecycle_run", { ...result });
    return NextResponse.json(result);
  } catch (err) {
    console.error("lifecycle cron failed:", err);
    await captureServerEvent(RUN_ID, "lifecycle_run_failed", {
      message: err instanceof Error ? err.message.slice(0, 200) : "unknown",
    });
    return NextResponse.json(
      { error: { code: "internal", message: "Lifecycle run failed" } },
      { status: 500 }
    );
  }
}
