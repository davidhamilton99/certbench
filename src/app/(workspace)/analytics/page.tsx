import { redirect } from "next/navigation";
import { requireProPage } from "@/server/auth";
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
/** An objective is listed once it has this many answers: fewer say too little. */
const MIN_ATTEMPTED = 3;

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ cert?: string }>;
}) {
  const { cert: certSlug } = await searchParams;
  const { db, user } = await requireProPage();

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
    { minAttempted: MIN_ATTEMPTED, limit: 8 }
  );

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <div className="grid gap-1.5">
        <h1 className="cb-subsection">Analytics</h1>
        <p className="text-small text-muted-foreground">These figures are from your work on {active.name}.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle as="h2">Readiness over time</CardTitle>
          <CardDescription>The chart shows the last readiness score recorded on each day.</CardDescription>
        </CardHeader>
        <CardContent>
          <ReadinessChart points={readinessSeries} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle as="h2">Activity</CardTitle>
          <CardDescription>
            The chart shows the questions answered on each of the last {ACTIVITY_RANGE_DAYS} days.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityChart days={activityDays} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle as="h2">Objectives with the lowest scores</CardTitle>
          <CardDescription>
            An objective is listed once you have answered at least {MIN_ATTEMPTED} of its questions. The lowest
            score is first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {weakest.length === 0 ? (
            <p className="text-small text-muted-foreground">
              There are not enough answers yet. The list appears as you answer more questions.
            </p>
          ) : (
            <table className="w-full text-small">
              <caption className="sr-only">Objectives with the lowest scores</caption>
              <thead>
                <tr className="border-b border-border text-left text-note text-muted-foreground">
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Objective
                  </th>
                  <th scope="col" className="py-2 pl-3 text-right font-medium">
                    Score
                  </th>
                  <th scope="col" className="py-2 pl-3 text-right font-medium">
                    Correct
                  </th>
                </tr>
              </thead>
              <tbody>
                {weakest.map((w) => (
                  <tr key={w.subObjectiveId} className="border-b border-border last:border-0">
                    <th scope="row" className="py-2 pr-3 text-left font-normal">
                      <span className="mr-2 font-mono text-xs text-muted-foreground">{w.code}</span>
                      {w.title}
                    </th>
                    <td className="py-2 pl-3 text-right tabular-nums">{Math.round(w.accuracy)}%</td>
                    <td className="whitespace-nowrap py-2 pl-3 text-right tabular-nums text-muted-foreground">
                      {w.correct} of {w.attempted}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
