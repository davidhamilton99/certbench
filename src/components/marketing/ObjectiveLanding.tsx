import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { Footer } from "@/components/marketing/Footer";
import { SampleQuestion } from "@/components/marketing/SampleQuestion";
import { ExamVersionNote } from "@/components/marketing/ExamVersionNote";
import { QuickRound } from "@/components/path/QuickRound";
import { JsonLd } from "@/components/seo/JsonLd";
import { Button } from "@/components/ui/button";
import {
  OBJECTIVE_HUB_CERTS,
  replacedBy,
  usesOfficialObjectiveNumbers,
} from "@/lib/seo/exam-versions";
import { codeToSlug } from "@/lib/seo/objective-code";
import { breadcrumbList } from "@/lib/seo/structured-data";
import type { QuickRoundData } from "@/core/path/types";

export interface ObjectiveLandingData {
  certSlug: string;
  certName: string;
  shortCertName: string;
  examCode: string;
  code: string;
  title: string;
  topic: string;
  domainNumber: string | null;
  domainTitle: string | null;
  domainWeight: number | null;
  samples: {
    questionText: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }[];
  siblings: { code: string; title: string; topic: string; slug: string }[];
}

/** Maps a cert slug to its public practice-test hub page. */
const PRACTICE_HUB: Record<string, string> = {
  "security-plus-sy0-701": "/security-plus-practice-test",
  "network-plus-n10-009": "/network-plus-practice-test",
  "a-plus-core1-220-1101": "/a-plus-practice-test",
  "a-plus-core2-220-1102": "/a-plus-practice-test",
};

export function ObjectiveLanding({
  data,
  round = null,
}: {
  data: ObjectiveLandingData;
  /** This objective's stop of the guided path, played inline at the top. */
  round?: QuickRoundData | null;
}) {
  const hub = PRACTICE_HUB[data.certSlug] ?? "/start";
  const objectiveHub = OBJECTIVE_HUB_CERTS.includes(data.certSlug)
    ? `/objectives/${data.certSlug}`
    : null;
  // Network+ objective numbers aren't CompTIA's yet, so these pages go by topic.
  const official = usesOfficialObjectiveNumbers(data.certSlug);
  const retired = replacedBy(data.certSlug) !== null;
  const heading = official ? `Objective ${data.code}: ${data.title}` : `${data.topic}: ${data.shortCertName} practice questions`;
  const crumb = official ? `Objective ${data.code}` : data.topic;

  const breadcrumbs = breadcrumbList([
    { name: "CertBench", path: "/" },
    { name: `${data.shortCertName} practice`, path: hub },
    ...(objectiveHub ? [{ name: `${data.examCode} objectives`, path: objectiveHub }] : []),
    { name: crumb, path: `/objectives/${data.certSlug}/${codeToSlug(data.code)}` },
  ]);

  return (
    <div className="flex min-h-svh flex-col aurora-bg text-foreground">
      <JsonLd data={breadcrumbs} />
      <MarketingHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12 sm:py-16">
        {/* Breadcrumb */}
        <nav className="mb-4 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <Link href={hub} className="hover:text-foreground">
            {data.shortCertName} practice
          </Link>
          <ChevronRight className="size-3" />
          {objectiveHub && (
            <>
              <Link href={objectiveHub} className="hover:text-foreground">
                {data.examCode} objectives
              </Link>
              <ChevronRight className="size-3" />
            </>
          )}
          {official && data.domainNumber && (
            <>
              <span>Domain {data.domainNumber}</span>
              <ChevronRight className="size-3" />
            </>
          )}
          <span className={official ? "font-mono" : undefined}>{crumb}</span>
        </nav>

        <p className="font-mono text-xs text-muted-foreground">
          {data.certName} · {data.examCode}
        </p>
        <h1 className="mt-1 text-balance font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {heading}
        </h1>
        {retired && <ExamVersionNote certSlugs={[data.certSlug]} className="mt-4" />}

        {/* Lead with something to do: this objective's stop of the path. */}
        {round && (
          <section className="mt-6 grid gap-3">
            <p className="text-sm text-muted-foreground">
              Try it now: {round.reps.length} quick questions on this{" "}
              {official ? "objective" : "topic"}, no account needed.
            </p>
            <QuickRound
              cert={round.cert}
              stopId={data.code}
              examName={round.examName}
              reps={round.reps}
              label={official ? `Objective ${data.code} · ${round.title}` : round.title}
              surface="objective_page"
              pitch={`That's one of ${round.objectiveCount} ${round.examName} ${official ? "objectives" : "topics"}. Your path walks every one like this, then shows where you stand.`}
            />
          </section>
        )}

        <div className={round ? "mt-10 grid gap-3 text-muted-foreground" : "mt-4 grid gap-3 text-muted-foreground"}>
          {official ? (
            <p className="leading-relaxed">
              Practice questions for {data.shortCertName} objective {data.code},{" "}
              &ldquo;{data.title}.&rdquo; Every question is original, written to
              the {data.examCode} exam objectives, and comes with a full
              explanation — answer them below to see instant grading.
            </p>
          ) : (
            <p className="leading-relaxed">
              Practice questions on {data.topic} for {data.shortCertName}{" "}
              {data.examCode}. Every question is original, written for the
              exam, and comes with a full explanation — answer them below to
              see instant grading.
            </p>
          )}
          {official && data.domainTitle && data.domainWeight !== null && (
            <p className="leading-relaxed">
              This objective sits in{" "}
              <strong className="text-foreground">
                Domain {data.domainNumber}: {data.domainTitle}
              </strong>
              {retired ? (
                <>
                  {" "}
                  of the {data.examCode} exam.
                </>
              ) : (
                <>
                  , which is about {data.domainWeight}% of the exam — so mastering
                  it moves your readiness score meaningfully.
                </>
              )}
            </p>
          )}
        </div>

        {/* Interactive samples */}
        <section className="mt-8 grid gap-4">
          {round && (
            <h2 className="text-lg font-semibold tracking-tight">
              More {official ? data.code : data.topic} practice questions
            </h2>
          )}
          {data.samples.map((q, i) => (
            <SampleQuestion key={i} number={i + 1} question={q} />
          ))}
        </section>

        {/* CTA */}
        <section className="mt-10 grid justify-items-center gap-3 rounded-xl border bg-muted/40 px-6 py-10 text-center">
          <h2 className="text-xl font-semibold tracking-tight">
            {official ? `Learn ${data.code} and every other objective` : "Learn this and every other objective"}
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Your {data.shortCertName} path walks the whole exam in short stops,
            one objective at a time, and maps where you stand as you go.
          </p>
          <Button asChild size="lg" className="mt-1">
            <Link href={`/path/${data.certSlug}`}>
              Start my {data.shortCertName} path
              <ArrowRight />
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground">No account needed to start.</p>
        </section>

        {/* Sibling objectives — internal linking within the domain */}
        {data.siblings.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold tracking-tight">
              {official
                ? `More objectives${data.domainNumber ? ` in Domain ${data.domainNumber}` : ""}`
                : `More ${data.shortCertName} topics`}
            </h2>
            <div className="mt-3 grid gap-1.5">
              {data.siblings.map((s) => (
                <Link
                  key={s.slug}
                  href={`/objectives/${data.certSlug}/${s.slug}`}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-2.5 text-sm transition-colors hover:border-muted-foreground/40"
                >
                  {official ? (
                    <span>
                      <span className="mr-1.5 font-mono text-xs text-muted-foreground">
                        {s.code}
                      </span>
                      {s.title}
                    </span>
                  ) : (
                    <span>{s.topic}</span>
                  )}
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </section>
        )}

        <p className="mt-8 text-sm">
          <Link href={objectiveHub ?? hub} className="text-primary underline underline-offset-4">
            ← All {data.shortCertName} {objectiveHub ? `${data.examCode} objectives` : "practice questions"}
          </Link>
        </p>
      </main>
      <Footer />
    </div>
  );
}
