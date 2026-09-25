"use client";

import { useEffect } from "react";
import { identifyUser } from "@/lib/analytics";

/**
 * Ties the PostHog person to the signed-in user on every authenticated page.
 * Mounted once in the workspace layout, so it covers email login, Google
 * OAuth, and returning sessions alike — without it, authed events stay
 * anonymous (PostHog runs identified_only).
 */
export function AnalyticsIdentify({
  userId,
  email,
}: {
  userId: string;
  email?: string | null;
}) {
  useEffect(() => {
    identifyUser(userId, email ? { email } : undefined);
  }, [userId, email]);
  return null;
}
