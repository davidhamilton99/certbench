import { NextRequest, NextResponse } from "next/server";
import { serverEnv } from "@/env";
import { runLifecycleEmails } from "@/server/services/lifecycle-email";

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
    return NextResponse.json(result);
  } catch (err) {
    console.error("lifecycle cron failed:", err);
    return NextResponse.json(
      { error: { code: "internal", message: "Lifecycle run failed" } },
      { status: 500 }
    );
  }
}
