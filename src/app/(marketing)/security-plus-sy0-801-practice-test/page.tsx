import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { Footer } from "@/components/marketing/Footer";
import { FaqSection } from "@/components/marketing/FaqSection";
import { PracticeExam, type PracticeExamNext } from "@/components/marketing/PracticeExam";
import { RelatedLinks } from "@/components/marketing/RelatedLinks";
import { CtaBand } from "@/components/marketing/lander/Article";
import { QuestionDeck, type DeckQuestion } from "@/components/marketing/QuestionDeck";
import { JsonLd } from "@/components/seo/JsonLd";
import { Button } from "@/components/ui/button";
import { SY0_801_DOMAINS } from "@/data/security-plus-v8";
import { SY0_801_PRACTICE_TEST } from "@/data/security-plus-v8-practice-test";
import {
  COMPTIA_URLS,
  SECURITY_PLUS_VERSIONS_PATH,
  SY0_801_CERT,
  SY0_801_AI_PATH,
  SY0_801_PATH,
  SY0_801_PRACTICE_CHECKED,
  SY0_801_PRACTICE_PATH,
  SY0_801_PRACTICE_PUBLISHED_ISO,
  SY0_801_UPDATED_ISO,
} from "@/lib/seo/exam-versions";
import { pageMetadata } from "@/lib/seo/metadata";
import { examReps, examStructure } from "@/lib/tools/practice-exam";
import { REHEARSAL_FORMATS } from "@/core/path/rehearsal";
import type { PublicTestData } from "@/core/path/types";
import { loadPublicTest } from "@/server/path/public-test";

// The timed exam is drawn from the SY0-801 bank when the page is built.
export const revalidate = 86400;

const QUESTION_COUNT = SY0_801_PRACTICE_TEST.length;
const OBJECTIVE_COUNT = SY0_801_DOMAINS.reduce((n, d) => n + d.objectives.length, 0);
const PATH_HREF = `/path/${SY0_801_CERT}`;

const FULL = REHEARSAL_FORMATS.full;
const HALF = REHEARSAL_FORMATS.half;

const TITLE = "Free Security+ SY0-801 Practice Test";

/** What the page offers, as search and AI answers read it: the test it serves, whichever that is. */
function describe(exam: PublicTestData): string {
  return exam.size === "full"
    ? `Free full-length Security+ SY0-801 practice exam: ${exam.reps.length} questions in ${FULL.minutes} minutes in the exam's domain weights, scored by domain, every answer explained.`
    : `Free ${exam.reps.length}-question Security+ SY0-801 practice test covering all ${OBJECTIVE_COUNT} objectives in the exam's weights. Timed, scored by domain, every answer explained.`;
}

export async function generateMetadata() {
  const exam = (await loadPublicTest(SY0_801_CERT)) ?? FALLBACK;
  return pageMetadata({ title: TITLE, description: describe(exam), path: SY0_801_PRACTICE_PATH });
}

const STRUCTURE = examStructure({
  slug: "security-plus-sy0-801",
  examName: "Security+ SY0-801",
  examCode: "SY0-801",
  domains: SY0_801_DOMAINS,
});
const REPS = examReps(SY0_801_PRACTICE_TEST);

/** The page's own 45 questions as a half-length test: the timed one if the bank can't be drawn from. */
const FALLBACK: PublicTestData = { testId: SY0_801_CERT, structure: STRUCTURE, size: "half", reps: REPS };

/** The domain an objective sits in: "4.2" is in "4.0". */
const domainOf = (objective: string) => `${objective.split(".")[0]}.0`;

/** The test's questions under their domain and objective, numbered in page order. */
const SECTIONS = (() => {
  let number = 0;
  return SY0_801_DOMAINS.map((domain) => ({
    domain,
    objectives: domain.objectives
      .map((objective) => ({
        objective,
        questions: SY0_801_PRACTICE_TEST.filter((q) => q.objective === objective.code).map((question) => ({
          question,
          number: ++number,
        })),
      }))
      .filter((group) => group.questions.length > 0),
  })).map((section) => ({
    ...section,
    count: section.objectives.reduce((n, group) => n + group.questions.length, 0),
  }));
})();

/** The same questions in objective order, each tagged with its objective, for the untimed deck. */
const DECK: DeckQuestion[] = SECTIONS.flatMap(({ objectives }) =>
  objectives.flatMap(({ objective, questions }) =>
    questions.map(({ question }) => ({
      questionText: question.questionText,
      options: question.options,
      correctIndex: question.correctIndex,
      explanation: question.explanation,
      tag: `${objective.code} · ${objective.label}`,
    }))
  )
);

const NEXT: PracticeExamNext = {
  heading: "Keep going on the SY0-801 path",
  body: `CertBench's SY0-801 path covers all ${OBJECTIVE_COUNT} objectives in short stops, the new AI objective included, and brings back whatever you miss. A few minutes in, a readiness checkpoint shows where you stand by domain.`,
  primary: { href: PATH_HREF, label: "Start my SY0-801 path" },
  links: [
    { href: SY0_801_AI_PATH, label: "Practise the AI objective" },
    { href: SECURITY_PLUS_VERSIONS_PATH, label: "SY0-801 or SY0-701?" },
  ],
};

function faqs(fullTest: boolean) {
  return [
  {
    question: "Is this practice test for SY0-801 or SY0-701?",
    answer: `SY0-801, the newest Security+ exam and the version CompTIA now recommends. Each question is tagged to one of SY0-801's ${OBJECTIVE_COUNT} objectives. For SY0-701, which stays open until June 11, 2027 in English, use CertBench's SY0-701 practice test and path.`,
  },
  {
    question: "How long is the real SY0-801 exam?",
    answer: fullTest
      ? `Up to ${FULL.questions} questions, multiple-choice and performance-based, in ${FULL.minutes} minutes. This practice exam is the same length: ${FULL.questions} multiple-choice questions in ${FULL.minutes} minutes, or a half exam of ${HALF.questions} in ${HALF.minutes} minutes at the same pace.`
      : `Up to ${FULL.questions} questions, multiple-choice and performance-based, in ${FULL.minutes} minutes. This practice test is half that: ${QUESTION_COUNT} multiple-choice questions in ${HALF.minutes} minutes, so the pace is the same.`,
  },
  {
    question: "What score do I need to pass SY0-801?",
    answer:
      "750 on a scale of 100 to 900. CompTIA doesn't publish how that scale maps to a share of questions answered correctly, so no practice test can give you a scaled score. This one reports the percentage you got right, weighted by how much of the exam each domain makes up.",
  },
  {
    question: "Are these real exam questions?",
    answer:
      "No. They're original questions written by CertBench against CompTIA's published SY0-801 exam objectives. CompTIA's exam questions are confidential, and using leaked ones breaks its exam policies.",
  },
  {
    question: "What's new on SY0-801 compared with SY0-701?",
    answer: `A new objective, 2.6, on the threats and vulnerabilities of using AI. There are ${OBJECTIVE_COUNT} objectives instead of 28, applying mitigating controls moves into security operations, and the domain weights change. The format and the passing score stay the same.`,
  },
  {
    question: "Does this test include performance-based questions?",
    answer:
      "No, all of it is multiple-choice. The real exam also has performance-based questions: CertBench's Security+ PBQ page has 12 interactive ones to work free in the browser, the first three with no account.",
  },
  ];
}

export default async function Sy0801PracticeTestPage() {
  const exam = (await loadPublicTest(SY0_801_CERT)) ?? FALLBACK;
  const fullTest = exam.size === "full";
  const examMinutes = REHEARSAL_FORMATS[exam.size].minutes;
  const covered = new Set(exam.reps.map((rep) => rep.objective)).size;
  const perDomain = new Map<string, number>();
  for (const rep of exam.reps) perDomain.set(domainOf(rep.objective), (perDomain.get(domainOf(rep.objective)) ?? 0) + 1);

  const learningResource = {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name: TITLE,
    description: describe(exam),
    url: `https://certbench.dev${SY0_801_PRACTICE_PATH}`,
    learningResourceType: "Practice test",
    educationalUse: "Practice",
    isAccessibleForFree: true,
    timeRequired: `PT${examMinutes}M`,
    inLanguage: "en",
    datePublished: SY0_801_PRACTICE_PUBLISHED_ISO,
    dateModified: SY0_801_UPDATED_ISO,
    provider: { "@type": "Organization", name: "CertBench", url: "https://certbench.dev" },
    about: [{ "@type": "Thing", name: "CompTIA Security+ SY0-801" }],
  };

  return (
    <div className="flex min-h-svh flex-col aurora-bg text-foreground">
      <JsonLd data={learningResource} />
      <MarketingHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-10 pt-12 sm:px-6 sm:pt-20">
        <p className="font-mono text-xs text-muted-foreground">
          CompTIA Security+ V8 · Questions checked against CompTIA&apos;s SY0-801 objectives on{" "}
          {SY0_801_PRACTICE_CHECKED}
        </p>
        <h1 className="mt-4 cb-display text-balance text-[2.35rem] sm:text-[3.5rem]">
          Free Security+ <span className="whitespace-nowrap">SY0-801</span> practice test
        </h1>

        {/* One short paragraph, then the test: on a phone the way in is on the first screen. */}
        <p className="mt-4 leading-relaxed text-muted-foreground">
          <strong className="font-medium text-foreground">
            {fullTest ? (
              <>
                A full-length exam: {exam.reps.length} questions in {examMinutes} minutes, the real exam&apos;s limit,
                across {covered >= OBJECTIVE_COUNT ? "all" : covered} of SY0-801&apos;s {OBJECTIVE_COUNT} objectives.
              </>
            ) : (
              <>
                {QUESTION_COUNT} original questions in {HALF.minutes} minutes, with at least one on each of
                SY0-801&apos;s {OBJECTIVE_COUNT} objectives.
              </>
            )}
          </strong>{" "}
          Sit it against the clock for a score by domain{fullTest ? <>, take a half exam of {HALF.questions}</> : null}, or{" "}
          <a href="#questions" className="text-primary underline underline-offset-4">
            {fullTest ? <>work through {QUESTION_COUNT} more questions one at a time</> : "work through the questions one at a time"}
          </a>
          .
        </p>

        <section className="mt-6" aria-label="The practice test">
          <PracticeExam
            testId={exam.testId}
            structure={exam.structure}
            reps={exam.reps}
            size={exam.size}
            offerHalf
            next={NEXT}
          />
        </section>

        <section className="mt-16 sm:mt-20">
          <h2 className="text-2xl font-semibold tracking-[-0.035em] sm:text-[2rem] sm:leading-tight">What the test covers</h2>
          <div className="mt-2 grid gap-3 leading-relaxed text-muted-foreground">
            <p>
              SY0-801 is the newest Security+ exam, the version CompTIA now recommends. CertBench
              wrote these questions for it, including its new objective on the threats of AI. None are taken
              from the exam.
            </p>
            <p>
              The {exam.reps.length} questions are split across the five domains the way the exam weights them.
            </p>
          </div>
          <div className="mt-4 grid gap-1.5">
            {SECTIONS.map(({ domain }) => (
              <div
                key={domain.number}
                className="flex items-baseline justify-between gap-3 glass rounded-2xl px-5 py-3.5 text-[15px]"
              >
                <span className="min-w-0">
                  <span className="mr-1.5 font-mono text-xs text-muted-foreground">{domain.number}</span>
                  {domain.title}
                </span>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                  {domain.weight}% of exam · {perDomain.get(domain.number) ?? 0} questions
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            What each objective covers:{" "}
            <Link href={SY0_801_PATH} className="text-primary underline underline-offset-4">
              SY0-801 exam objectives
            </Link>
          </p>
        </section>

        <section id="questions" className="mt-16 grid scroll-mt-20 gap-4 sm:mt-20">
          <div className="grid gap-1">
            <h2 className="text-2xl font-semibold tracking-[-0.035em] sm:text-[2rem] sm:leading-tight">Practise one question at a time</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {fullTest
                ? `${QUESTION_COUNT} more SY0-801 questions in objective order, untimed, each explained as soon as you answer.`
                : `The same ${QUESTION_COUNT} questions in objective order, untimed, each explained as soon as you answer.`}
            </p>
          </div>
          <QuestionDeck
            questions={DECK}
            label="SY0-801 · one at a time"
            surface="sy0801_practice_test_page"
            path={PATH_HREF}
            examName="Security+"
            listTitle={`All ${QUESTION_COUNT} questions by objective, with answers`}
          />
        </section>

        <CtaBand title="Study SY0-801 one short step at a time">
          <p className="max-w-md text-balance text-[15px] leading-relaxed text-muted-foreground">
            CertBench&apos;s SY0-801 path covers all {OBJECTIVE_COUNT} objectives in short stops, AI threats
            included. A few minutes in, a readiness checkpoint shows where you stand by domain.
          </p>
          <Button asChild size="lg" className="mt-1">
            <Link href={PATH_HREF}>
              Start my SY0-801 path
              <ArrowRight />
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground">
            No account needed to start.{" "}
            <Link href={SECURITY_PLUS_VERSIONS_PATH} className="underline underline-offset-4 hover:text-foreground">
              SY0-801 or SY0-701: which to take
            </Link>
          </p>
        </CtaBand>

        <RelatedLinks
          links={[
            {
              href: SY0_801_PATH,
              label: "SY0-801 exam objectives",
              note: `The exam, its five domains and all ${OBJECTIVE_COUNT} objectives`,
            },
            {
              href: SY0_801_AI_PATH,
              label: "SY0-801 AI practice questions",
              note: "More questions on the new objective, 2.6",
            },
            {
              href: SECURITY_PLUS_VERSIONS_PATH,
              label: "SY0-801 vs SY0-701",
              note: "Which version to take, by exam date",
            },
            {
              href: "/security-plus-pbq-examples",
              label: "Security+ PBQ examples",
              note: "12 free interactive PBQs, 3 with no account",
            },
            {
              href: "/security-plus-practice-test",
              label: "Security+ SY0-701 practice test",
              note: "Questions for the exam open until June 11, 2027",
            },
            {
              href: "/tools/security-plus-acronyms-quiz",
              label: "Security+ acronyms quiz",
              note: "Drill the acronyms both exams use",
            },
          ]}
        />

        <FaqSection faqs={faqs(fullTest)} />

        <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
          Exam details and objectives from CompTIA&apos;s{" "}
          <a href={COMPTIA_URLS.securityV8} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
            Security+ V8 page
          </a>{" "}
          and the SY0-801 exam objectives it links (document version 2.0). Questions and explanations by
          CertBench.
        </p>
      </main>
      <Footer />
    </div>
  );
}
