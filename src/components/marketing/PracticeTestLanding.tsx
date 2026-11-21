import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PRACTICE_TEST_PAGES, type PracticeTestPage } from "@/lib/seo/cert-pages";
import { FaqSection } from "@/components/marketing/FaqSection";
import { QuestionDeck, QuestionList, type DeckQuestion } from "@/components/marketing/QuestionDeck";
import { ExamVersionNote } from "@/components/marketing/ExamVersionNote";
import { RelatedLinks } from "@/components/marketing/RelatedLinks";
import { PathCard } from "@/components/marketing/PathCard";
import { LanderHero, LanderPage, LanderProse, LanderSection, LanderStage } from "@/components/marketing/lander/Lander";
import { ExamOutline } from "@/components/marketing/lander/ExamOutline";
import { TileGrid, type Tile } from "@/components/marketing/lander/TileGrid";
import { QuickRound } from "@/components/path/QuickRound";
import { PracticeExam } from "@/components/marketing/PracticeExam";
import type { PublicTestData, QuickRoundData } from "@/core/path/types";
import { JsonLd } from "@/components/seo/JsonLd";
import { replacedBy, usesOfficialObjectiveNumbers } from "@/lib/seo/exam-versions";

export interface PracticeTestLandingData {
  certs: {
    cert: { id: string; name: string; examCode: string };
    domains: { id: string; domainNumber: string; title: string; examWeight: number }[];
  }[];
  totalQuestions: number;
  sampleGroups: {
    certName: string;
    examCode: string;
    questions: {
      questionText: string;
      options: string[];
      correctIndex: number;
      explanation: string;
    }[];
  }[];
}

export interface ObjectiveLink {
  certSlug: string;
  code: string;
  title: string;
  topic: string;
  slug: string;
}

/** Presentational template for the /​*-practice-test pages; pages load data via @/server/seo. */
export function PracticeTestLanding({
  page,
  data,
  objectives = [],
  round = null,
  test = null,
}: {
  page: PracticeTestPage;
  data: PracticeTestLandingData;
  objectives?: ObjectiveLink[];
  /** The exam's warm-up, played inline at the top (single-exam pages). */
  round?: QuickRoundData | null;
  /** The exam's free timed practice test, on single-exam pages. */
  test?: PublicTestData | null;
}) {
  // The cores' own pages are offered at the top, so they aren't repeated here.
  const otherHubs = PRACTICE_TEST_PAGES.filter(
    (p) => p.path !== page.path && !page.cores?.some((c) => c.href === `/${p.path}`)
  );
  // Network+ objective numbers aren't CompTIA's yet, so that list goes by topic.
  const official = page.certSlugs.every(usesOfficialObjectiveNumbers);
  const retired = page.certSlugs.some((slug) => replacedBy(slug) !== null);
  const examOutlines =
    page.currentExams ??
    data.certs.map(({ cert, domains }) => ({
      name: cert.name,
      examCode: cert.examCode,
      domains: domains.map((d) => ({
        number: d.domainNumber,
        title: d.title,
        weight: d.examWeight,
      })),
    }));

  // The samples as one deck, shortest first within each exam so the opener is
  // approachable rather than the most daunting. A page with two exams tags each.
  const multi = data.sampleGroups.length > 1;
  const deck: DeckQuestion[] = data.sampleGroups.flatMap((group) =>
    [...group.questions]
      .sort((a, b) => a.questionText.length - b.questionText.length)
      .map((q) => (multi ? { ...q, tag: `${group.certName} · ${group.examCode}` } : q))
  );
  const pathHref = page.certSlugs.length === 1 ? `/path/${page.certSlugs[0]}` : "/start";
  const examName = round?.examName ?? page.title.replace(/ practice test$/i, "");
  const codes = examOutlines.map((e) => e.examCode).join(" · ");

  // Objectives as tiles, a group per domain (per exam and domain on a page with two exams).
  const groups = objectiveGroups(objectives, examOutlines, official);

  // GEO/SEO: mark the page as a free educational practice resource so search
  // and generative engines can identify and cite it for "free CompTIA … test".
  const learningResource = {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name: page.metaTitle,
    description: page.metaDescription,
    url: `https://certbench.dev/${page.path}`,
    learningResourceType: "Practice test",
    educationalUse: "Practice",
    isAccessibleForFree: true,
    inLanguage: "en",
    provider: {
      "@type": "Organization",
      name: "CertBench",
      url: "https://certbench.dev",
    },
    about: data.certs.map(({ cert }) => ({ "@type": "Thing", name: cert.name })),
  };

  return (
    <LanderPage>
      <JsonLd data={learningResource} />
      <LanderHero
        eyebrow={`Free · ${codes}`}
        title={page.h1}
        sub={
          round
            ? `Start with ${round.reps.length} quick questions. No account needed.`
            : "Exam-style questions, each explained the moment you answer."
        }
        specs={
          round
            ? [`${round.reps.length}-question warm-up`, ...(test ? [`${test.reps.length}-question timed test`] : []), `${data.totalQuestions.toLocaleString()} in the bank`]
            : [`${data.totalQuestions.toLocaleString()} questions`, "Full explanations", "Free"]
        }
      >
        {/* An exam taken in parts: each part's own practice test comes first. */}
        {page.cores && (
          <div className="mt-4 grid w-full max-w-2xl gap-3 text-left sm:grid-cols-2">
            {page.cores.map((core) => (
              <Link
                key={core.href}
                href={core.href}
                className="glass group grid gap-2 rounded-2xl p-5 transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[0_24px_60px_-30px_var(--primary)] sm:p-6"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="text-xl font-semibold tracking-[-0.02em]">{core.name}</span>
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground/[0.06] text-muted-foreground transition-colors group-hover:bg-foreground group-hover:text-background">
                    <ArrowRight className="size-3.5" />
                  </span>
                </span>
                <span className="font-mono text-xs text-muted-foreground">{core.examCode}</span>
                <span className="text-sm leading-relaxed text-muted-foreground">{core.blurb}</span>
              </Link>
            ))}
          </div>
        )}
      </LanderHero>

      {/* A retired exam changes what this page is, so that's said first. */}
      {retired && (
        <div className="mx-auto mt-8 max-w-2xl px-5 sm:px-6">
          <ExamVersionNote certSlugs={page.certSlugs} />
        </div>
      )}

      {/* Lead with something to do: the exam's warm-up, the same quick round
          the guided path opens with. */}
      {round && (
        <LanderStage>
          <QuickRound
            cert={round.cert}
            stopId="warmup"
            examName={round.examName}
            structure={round.structure}
            reps={round.reps}
            label={`${round.examName} warm-up`}
            surface="practice_test_page"
            unit={official ? "objectives" : "topics"}
          />
        </LanderStage>
      )}

      {!retired && (
        <div className="mx-auto mt-8 max-w-2xl px-5 sm:px-6">
          <ExamVersionNote certSlugs={page.certSlugs} />
        </div>
      )}

      {/* What a "practice test" search is after: a timed test, sat on the
          path's own exam player and scored by domain, then the way on. */}
      {test && (
        <LanderSection
          id="practice-test"
          eyebrow="Exam simulator · timed · scored by domain"
          title={`Free ${examName} practice test`}
          sub="No answers until the end, as on the exam. Every one is explained with your score."
          width="md"
          className="scroll-mt-20"
        >
          <PracticeExam
            testId={test.testId}
            structure={test.structure}
            reps={test.reps}
            size="half"
            headingLevel="h3"
            next={{
              heading: `Keep going on your ${examName} path`,
              body: "Your path walks every objective in short stops and brings back whatever you miss, then a readiness checkpoint shows where you stand by domain.",
              primary: { href: pathHref, label: "Start my path" },
            }}
          />
          <div className="mt-4">
            <QuestionList questions={testQuestions(test)} title={`All ${test.reps.length} questions, with answers`} />
          </div>
        </LanderSection>
      )}

      {/* The samples, one at a time on the path's own card. Every question and
          answer is still in the page, in the deck's folded list. */}
      {deck.length > 0 && (
        <LanderSection
          eyebrow="Exam style"
          title={round ? "Exam-style sample questions" : "Sample questions"}
          sub={`${deck.length} questions · explained as you answer · ${data.totalQuestions.toLocaleString()} in the full bank`}
          width="md"
        >
          <QuestionDeck
            questions={deck}
            label={`${examName} · sample questions`}
            surface="practice_test_page"
            path={pathHref}
            examName={examName}
          />
        </LanderSection>
      )}

      {/* Domain weights, to scale: the exam at a glance. */}
      <LanderSection eyebrow={codes} title="What the exam covers" sub="Each domain's share of the exam." width="xl">
        <ExamOutline exams={examOutlines} />
      </LanderSection>

      {/* Practice by objective — hub links to the programmatic pages */}
      {groups.length > 0 && (
        <LanderSection
          eyebrow={`${objectives.length} ${official ? "objectives" : "topics"}`}
          title={official ? "Practice by exam objective" : "Practice by topic"}
          sub={`Each ${official ? "objective" : "topic"} has its own questions, explained.`}
          width="xl"
        >
          <TileGrid groups={groups} />
        </LanderSection>
      )}

      <div className="mx-auto w-full max-w-5xl px-3 pt-20 sm:px-6 sm:pt-28">
        <PathCard
          kicker={`Your ${examName} path`}
          title="Study it one short stop at a time"
          href={pathHref}
          label="Start my path"
          context="practice_test_page"
          note="No account needed to start."
        >
          The guided path walks every exam objective in quick rounds like these, then a readiness checkpoint shows
          where you&apos;d stand today.
        </PathCard>
      </div>

      <LanderProse>
        {page.intro.map((p) => (
          <p key={p.slice(0, 32)}>{p}</p>
        ))}
      </LanderProse>

      <div className="mx-auto w-full max-w-3xl px-5 sm:px-6">
        <RelatedLinks links={page.related ?? []} />
        {otherHubs.length > 0 && (
          <section className="mt-14">
            <h2 className="text-xl font-semibold tracking-[-0.02em] sm:text-2xl">Other CompTIA practice tests</h2>
            <TileGrid
              className="mt-5"
              columns={2}
              groups={[{ tiles: otherHubs.map((h) => ({ href: `/${h.path}`, title: h.title })) }]}
            />
          </section>
        )}
        <FaqSection faqs={page.faqs} />
      </div>
    </LanderPage>
  );
}

/** Objectives as tile groups: one per domain, labelled by exam too when a page has two. */
function objectiveGroups(
  objectives: ObjectiveLink[],
  exams: { name: string; examCode: string; domains: { number: string; title: string }[] }[],
  official: boolean
): { label?: string; tiles: Tile[] }[] {
  const certs = [...new Set(objectives.map((o) => o.certSlug))];
  const byKey = new Map<string, { label?: string; tiles: Tile[] }>();
  // In exam order: by exam, then domain, then objective ("1.10" after "1.9").
  const num = (code: string) => code.split(".").map(Number);
  const ordered = [...objectives].sort((a, b) => {
    const exam = certs.indexOf(a.certSlug) - certs.indexOf(b.certSlug);
    if (exam !== 0) return exam;
    const [a1 = 0, a2 = 0] = num(a.code);
    const [b1 = 0, b2 = 0] = num(b.code);
    return a1 - b1 || a2 - b2;
  });
  for (const o of ordered) {
    const domain = `${o.code.split(".")[0]}.0`;
    const key = official ? `${o.certSlug}|${domain}` : o.certSlug;
    if (!byKey.has(key)) {
      const examIndex = certs.indexOf(o.certSlug);
      const exam = exams[examIndex] ?? exams[0];
      const title = exam?.domains.find((d) => d.number === domain)?.title;
      const prefix = certs.length > 1 && exam ? `${exam.examCode} · ` : "";
      byKey.set(key, {
        label: official ? `${prefix}Domain ${domain.replace(/\.0$/, "")}${title ? ` · ${title}` : ""}` : prefix || undefined,
        tiles: [],
      });
    }
    byKey.get(key)!.tiles.push(
      official
        ? { href: `/objectives/${o.certSlug}/${o.slug}`, code: o.code, title: o.topic, detail: o.title }
        : { href: `/objectives/${o.certSlug}/${o.slug}`, title: o.topic }
    );
  }
  return [...byKey.values()];
}

/** The timed test's questions for the folded list, each tagged with its objective. */
function testQuestions(test: PublicTestData): DeckQuestion[] {
  const titles = new Map(test.structure.domains.flatMap((d) => d.objectives.map((o) => [o.code, o.title] as const)));
  return test.reps.map((rep) => ({
    questionText: rep.prompt,
    options: rep.options,
    correctIndex: rep.answer,
    explanation: [rep.takeaway, rep.explanation].filter(Boolean).join(" "),
    tag: titles.has(rep.objective) ? `${rep.objective} · ${titles.get(rep.objective)}` : undefined,
  }));
}
