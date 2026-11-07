import { redirect } from "next/navigation";
import { createClient } from "@/server/supabase/server";
import { isPathCert } from "@/core/path/types";

export const metadata = {
  title: "Get started",
};

/**
 * The old goal-setting flow now lives inside the guided path: the exam is
 * picked on /start and the goal questions come one at a time between stops.
 * This route stays for old links, emails and in-flight checkouts, and sends
 * everyone to their path, Pro members included: the path is home, and the
 * toolkit sits one tap away from it (`?cert=` picks the exam).
 */
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ cert?: string | string[] }>;
}) {
  const { cert } = await searchParams;
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login");

  const slug = typeof cert === "string" ? cert : undefined;
  redirect(slug && isPathCert(slug) ? `/path/${slug}` : "/start");
}
