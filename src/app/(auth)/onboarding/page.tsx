import { redirect } from "next/navigation";
import { createClient } from "@/server/supabase/server";
import { listEnrollments } from "@/server/data/enrollments";
import { getProfile } from "@/server/data/profiles";
import { getUserPlan } from "@/server/services/subscription";
import { isPathCert } from "@/core/path/types";

export const metadata = {
  title: "Get started",
};

/**
 * The old goal-setting flow now lives inside the guided path: the exam is
 * picked on /start and the goal questions come one at a time between stops.
 * This route stays for old links, emails and in-flight checkouts, and sends
 * everyone to the right place: Pro members with an exam to their dashboard,
 * everyone else to the path (`?cert=` picks the exam).
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

  const [profile, plan, enrollments] = await Promise.all([
    getProfile(db, user.id),
    getUserPlan(db, user.id),
    listEnrollments(db, user.id),
  ]);
  const pro = plan.plan === "pro" || profile?.role === "admin";
  if (pro && profile?.onboardingCompleted && enrollments.length > 0) redirect("/dashboard");

  const slug = typeof cert === "string" ? cert : undefined;
  redirect(slug && isPathCert(slug) ? `/path/${slug}` : "/start");
}
