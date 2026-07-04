import { redirect } from "next/navigation";
import { createClient } from "@/server/supabase/server";
import { listEnrollments } from "@/server/data/enrollments";
import {
  getCertificationBySlug,
  listActiveCertifications,
  listDomains,
  listSubObjectives,
} from "@/server/data/certifications";
import { listRecentSnapshots } from "@/server/data/readiness";
import { listCompletedActivity } from "@/server/data/attempts";
import { listPerformance } from "@/server/data/performance";
import { getQuestionSubObjectiveMap } from "@/server/data/questions";
import {
  shapeActivityByDay,
  shapeReadinessSeries,
  shapeWeakestSubObjectives,
} from "@/core/analytics/shape";
import { ReadinessChart } from "@/components/workspace/analytics/ReadinessChart";
import { ActivityChart } from "@/components/workspace/analytics/ActivityChart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "Analytics",
};

const ACTIVITY_RANGE_DAYS = 30;

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ cert?: string }>;
}) {
  const { cert: certSlug } = await searchParams;
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login");

  const enrollments = await listEnrollments(db, user.id);
  if (enrollments.length === 0) redirect("/onboarding");

  let active = certSlug ? await getCertificationBySlug(db, certSlug) : null;
  if (!active || !enrollments.some((e) => e.certificationId === active!.id)) {
    const certs = await listActiveCertifications(db);
    active = certs.find((c) => c.id === enrollments[0].certificationId) ?? null;
  }
  if (!active) redirect("/onboarding");

  const [snapshots, activity, performance, questionToSub, subObjectives, domains] =
    await Promise.all([
      listRecentSnapshots(db, user.id, active.id, 90),
      listCompletedActivity(db, user.id, active.id),
      listPerformance(db, user.id, active.id),
      getQuestionSubObjectiveMap(db, active.id),
      listSubObjectives(db, active.id),
      listDomains(db, active.id),
    ]);

  const readinessSeries = shapeReadinessSeries(snapshots);
  const activityDays = shapeActivityByDay(activity, ACTIVITY_RANGE_DAYS);
  const weakest = shapeWeakestSubObjectives(
    performance,
    questionToSub,
    subObjectives,
    new Map(domains.map((d) => [d.id, d.domainNumber])),
    { minAttempted: 3, limit: 8 }
  );

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">{active.name}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Readiness over time</CardTitle>
          <CardDescription>Latest snapshot per day</CardDescription>
        </CardHeader>
        <CardContent>
          <ReadinessChart points={readinessSeries} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
          <CardDescription>
            Questions answered per day, last {ACTIVITY_RANGE_DAYS} days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityChart days={activityDays} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Weakest sub-objectives</CardTitle>
          <CardDescription>
            At least 3 attempts · lowest accuracy first
          </CardDescription>
        </CardHeader>
        <CardContent>
          {weakest.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Not enough data yet — keep answering questions.
            </p>
          ) : (
            <div className="grid gap-2">
              {weakest.map((w) => (
                <div
                  key={w.subObjectiveId}
                  className="flex items-baseline justify-between gap-3 text-sm"
                >
                  <span className="truncate">
                    <span className="font-mono text-xs text-muted-foreground">
                      {w.code}
                    </span>{" "}
                    {w.title}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {Math.round(w.accuracy)}% · {w.correct}/{w.attempted}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
