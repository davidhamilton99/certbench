import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { QuestionDeck } from "@/components/marketing/QuestionDeck";
import { PathCard } from "@/components/marketing/PathCard";
import {
  LanderBlock,
  LanderHero,
  LanderPage,
  LanderProse,
  LanderSection,
  LanderStage,
  type Spec,
} from "@/components/marketing/lander/Lander";
import { TileGrid } from "@/components/marketing/lander/TileGrid";
import { ExamVersionNote } from "@/components/marketing/ExamVersionNote";
import { QuickRound } from "@/components/path/QuickRound";
import { JsonLd } from "@/components/seo/JsonLd";
import { practicePageFor } from "@/lib/seo/cert-pages";
import {
  OBJECTIVE_HUB_CERTS,
  replacedBy,
  usesOfficialObjectiveNumbers,
} from "@/lib/seo/exam-versions";
import { codeToSlug } from "@/lib/seo/objective-code";
import { OBJECTIVES_IN_OWN_WORDS, topicInSentence } from "@/lib/seo/objective-meta";
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

/**
 * A link in the breadcrumb: quiet, and underlined so it is not told apart by
 * colour alone. It stands by itself, not inside a sentence, so it is given the
 * height that a target should have (28 pixels, and 44 on a touch screen).
 */
const CRUMB =
  "cb-tap inline-block py-1 underline decoration-foreground/30 underline-offset-4 hover:text-foreground hover:decoration-current";

/** "1" from "1.0": a domain is named by its number alone. */
const domainLabel = (n: string) => n.replace(/\.0$/, "");

export function ObjectiveLanding({
  data,
  round = null,
}: {
  data: ObjectiveLandingData;
  /** This objective's step of the study path, played on the page itself. */
  round?: QuickRoundData | null;
}) {
  const hub = practicePageFor(data.certSlug);
  const objectiveHub = OBJECTIVE_HUB_CERTS.includes(data.certSlug)
    ? `/objectives/${data.certSlug}`
    : null;
  // The Network+ objective numbers are not CompTIA's yet, so those pages go by topic.
  const official = usesOfficialObjectiveNumbers(data.certSlug);
  const ownWords = OBJECTIVES_IN_OWN_WORDS.includes(data.certSlug);
  const retired = replacedBy(data.certSlug) !== null;
  const heading = official ? `Objective ${data.code}: ${data.title}` : `${data.topic}: ${data.shortCertName} practice questions`;
  const crumb = official ? `Objective ${data.code}` : data.topic;
  const domain = official && data.domainNumber ? domainLabel(data.domainNumber) : null;

  const breadcrumbs = breadcrumbList([
    { name: "CertBench", path: "/" },
    { name: `${data.shortCertName} practice`, path: hub },
    ...(objectiveHub ? [{ name: `${data.examCode} objectives`, path: objectiveHub }] : []),
    { name: crumb, path: `/objectives/${data.certSlug}/${codeToSlug(data.code)}` },
  ]);

  const specs: Spec[] = [
    ...(domain ? [{ label: "Domain", value: data.domainTitle ? `${domain}: ${data.domainTitle}` : domain }] : []),
    ...(domain && data.domainWeight !== null && !retired
      ? [{ label: "Domain weight", value: `${data.domainWeight}% of the exam` }]
      : []),
    { label: "Account", value: "Not required" },
  ];

  return (
    <LanderPage>
      <JsonLd data={breadcrumbs} />
      <LanderHero
        above={
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-note text-muted-foreground">
            <Link href={hub} className={CRUMB}>
              {data.shortCertName} practice
            </Link>
            <ChevronRight aria-hidden className="size-3" />
            {objectiveHub && (
              <>
                <Link href={objectiveHub} className={CRUMB}>
                  {data.examCode} objectives
                </Link>
                <ChevronRight aria-hidden className="size-3" />
              </>
            )}
            {domain && (
              <>
                <span>Domain {domain}</span>
                <ChevronRight aria-hidden className="size-3" />
              </>
            )}
            {/* Set like the rest of the trail: the mono face is for a code, and this is a word and a code. */}
            <span aria-current="page">{crumb}</span>
          </nav>
        }
        eyebrow={`${data.certName} (${data.examCode})`}
        title={heading}
        sub={
          round
            ? `You can try ${round.reps.length} short questions on this ${official ? "objective" : "topic"} now.`
            : "These are original questions, and each one is explained as soon as you answer."
        }
        specs={specs}
      />
      {retired && (
        <LanderBlock className="mt-8">
          <ExamVersionNote certSlugs={[data.certSlug]} />
        </LanderBlock>
      )}

      {/* Lead with something to do: this objective's step of the study path. */}
      {round && (
        <LanderStage>
          <QuickRound
            cert={round.cert}
            stopId={data.code}
            examName={round.examName}
            structure={round.structure}
            reps={round.reps}
            label={official ? `Objective ${data.code}: ${round.title}` : round.title}
            surface="objective_page"
            unit={official ? "objectives" : "topics"}
          />
        </LanderStage>
      )}

      {/* The objective's questions from the bank, one at a time on the study path's own card. */}
      {data.samples.length > 0 && (
        <LanderSection
          // A Network+ topic is a phrase in the middle of the heading ("More practice questions on the OSI model").
          title={
            official
              ? `${round ? "More " : ""}${data.code} practice questions`
              : `${round ? "More practice" : "Practice"} questions on ${topicInSentence(data.topic)}`
          }
          sub={`There are ${data.samples.length} exam-style questions here, and each one is explained as you answer.`}
          width="md"
          className={round ? undefined : "sm:pt-14"}
        >
          <QuestionDeck
            questions={data.samples}
            label={official ? `Objective ${data.code} practice questions` : `${data.topic} practice questions`}
            surface="objective_page"
            path={`/path/${data.certSlug}`}
            examName={data.shortCertName}
          />
        </LanderSection>
      )}

      <PathCard
        className="mt-20 sm:mt-28"
        kicker={`${data.shortCertName} study path`}
        title={official ? `Study ${data.code} and every other objective` : "Study this and every other topic"}
        href={`/path/${data.certSlug}`}
        label={`Start the ${data.shortCertName} study path`}
        context="objective_page"
        note="You do not need an account to start."
      >
        {/* Network+ is set out by CertBench's own topics, so its study path is not said to cover the whole exam. */}
        {official
          ? `The ${data.shortCertName} study path covers the whole exam in short steps, one objective at a time, and shows where you stand as you progress.`
          : `The ${data.shortCertName} study path works through the exam topic by topic, in short steps, and shows where you stand as you progress.`}
      </PathCard>

      <LanderProse>
        {/* The objective's name is not quoted: on the A+ pages it is CertBench's own wording, and the page says so. */}
        {official ? (
          <p>
            This page has practice questions for {data.shortCertName} objective {data.code}. Every question is
            original, is written to the {data.examCode} exam objectives, and has a full explanation. Answer the
            questions above to have them marked at once.
            {ownWords && (
              <>
                {" "}
                The objective&apos;s name on this page is CertBench&apos;s own wording, and CompTIA&apos;s objectives
                document has the official wording.
              </>
            )}
          </p>
        ) : (
          <p>
            This page has practice questions on {topicInSentence(data.topic)} for {data.shortCertName}{" "}
            {data.examCode}. Every question is original, is written for the exam, and has a full explanation. Answer
            the questions above to have them marked at once.
          </p>
        )}
        {domain && data.domainTitle && data.domainWeight !== null && (
          <p>
            This objective belongs to{" "}
            <strong>
              Domain {domain}: {data.domainTitle}
            </strong>
            {retired ? (
              <> of the {data.examCode} exam.</>
            ) : (
              <>, which accounts for about {data.domainWeight}% of the exam.</>
            )}
          </p>
        )}
      </LanderProse>

      {/* The other objectives of the domain, each a link to its own page. */}
      {data.siblings.length > 0 && (
        <LanderSection
          title={official ? `More objectives${domain ? ` in Domain ${domain}` : ""}` : `More ${data.shortCertName} topics`}
          width="xl"
        >
          <TileGrid
            groups={[
              {
                tiles: data.siblings.map((sib) =>
                  official
                    ? { href: `/objectives/${data.certSlug}/${sib.slug}`, code: sib.code, title: sib.topic, detail: sib.title }
                    : { href: `/objectives/${data.certSlug}/${sib.slug}`, title: sib.topic }
                ),
              },
            ]}
          />
        </LanderSection>
      )}

      <LanderBlock className="mt-10 text-small">
        {/* A link that stands alone: tall enough to press (see CRUMB). */}
        <Link href={objectiveHub ?? hub} className="cb-link cb-tap inline-block py-1">
          View all {data.shortCertName} {objectiveHub ? `${data.examCode} objectives` : "practice questions"}
        </Link>
      </LanderBlock>
    </LanderPage>
  );
}
