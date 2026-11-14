import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { Footer } from "@/components/marketing/Footer";
import { FaqSection } from "@/components/marketing/FaqSection";
import { PracticeExam, type PracticeExamNext } from "@/components/marketing/PracticeExam";
import { RelatedLinks } from "@/components/marketing/RelatedLinks";
import { SampleQuestion } from "@/components/marketing/SampleQuestion";
import { JsonLd } from "@/components/seo/JsonLd";
import { Button } from "@/components/ui/button";
import { SY0_801_DOMAINS } from "@/data/security-plus-v8";
import { SY0_801_PRACTICE_TEST } from "@/data/security-plus-v8-practice-test";
import {
  COMPTIA_URLS,
  SECURITY_PLUS_CERT,
  SECURITY_PLUS_VERSIONS_PATH,
  SY0_801_AI_PATH,
  SY0_801_PATH,
  SY0_801_PRACTICE_CHECKED,
  SY0_801_PRACTICE_PATH,
  SY0_801_PRACTICE_PUBLISHED_ISO,
  SY0_801_UPDATED_ISO,
} from "@/lib/seo/exam-versions";
import { pageMetadata } from "@/lib/seo/metadata";
import { examReps, examStructure } from "@/lib/tools/practice-exam";

const QUESTION_COUNT = SY0_801_PRACTICE_TEST.length;
const OBJECTIVE_COUNT = SY0_801_DOMAINS.reduce((n, d) => n + d.objectives.length, 0);
const PATH_HREF = `/path/${SECURITY_PLUS_CERT}`;

const TITLE = "Free Security+ SY0-801 Practice Test";
const DESCRIPTION = `Free ${QUESTION_COUNT}-question Security+ SY0-801 practice test covering all ${OBJECTIVE_COUNT} objectives in the exam's weights. Timed, scored by domain, every answer explained. No account.`;

export const metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: SY0_801_PRACTICE_PATH,
});

const STRUCTURE = examStructure({
  slug: "security-plus-sy0-801",
  examName: "Security+ SY0-801",
  examCode: "SY0-801",
  domains: SY0_801_DOMAINS,
});
const REPS = examReps(SY0_801_PRACTICE_TEST);

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

const NEXT: PracticeExamNext = {
  heading: "Keep going on the Security+ path",
  body: "CertBench's Security+ path is built on SY0-701, the exam CompTIA keeps open until June 11, 2027 in English. It covers the ground the two exams share in short stops and brings back whatever you miss. SY0-801's new AI objective has its own free questions.",
  primary: { href: PATH_HREF, label: "Start my Security+ path" },
  links: [
    { href: SY0_801_AI_PATH, label: "Practise the AI objective" },
    { href: SECURITY_PLUS_VERSIONS_PATH, label: "SY0-801 or SY0-701?" },
  ],
};

const FAQS = [
  {
    question: "Is this practice test for SY0-801 or SY0-701?",
    answer: `SY0-801, the Security+ exam CompTIA lists as launching on or around November 17, 2026. Each question is tagged to one of SY0-801's ${OBJECTIVE_COUNT} objectives. For SY0-701, which stays open until June 11, 2027 in English, use CertBench's Security+ practice test and path.`,
  },
  {
    question: "How long is the real SY0-801 exam?",
    answer: `Up to 90 questions, multiple-choice and performance-based, in 90 minutes. This practice test is half that: ${QUESTION_COUNT} multiple-choice questions in 45 minutes, so the pace is the same.`,
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
      "No, all of it is multiple-choice. The real exam also has performance-based questions, and CertBench's Security+ PBQ examples let you try that format in the browser.",
  },
];

export default function Sy0801PracticeTestPage() {
  const learningResource = {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name: TITLE,
    description: DESCRIPTION,
    url: `https://certbench.dev${SY0_801_PRACTICE_PATH}`,
    learningResourceType: "Practice test",
    educationalUse: "Practice",
    isAccessibleForFree: true,
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
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12 sm:py-16">
        <p className="font-mono text-xs text-muted-foreground">
          CompTIA Security+ V8 · Questions checked against CompTIA&apos;s SY0-801 objectives on{" "}
          {SY0_801_PRACTICE_CHECKED}
        </p>
        <h1 className="mt-1 text-balance font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Free Security+ <span className="whitespace-nowrap">SY0-801</span> practice test
        </h1>

        {/* One short paragraph, then the test: on a phone the way in is on the first screen. */}
        <p className="mt-4 leading-relaxed text-muted-foreground">
          <strong className="font-medium text-foreground">
            {QUESTION_COUNT} original questions in 45 minutes, with at least one on each of SY0-801&apos;s{" "}
            {OBJECTIVE_COUNT} objectives.
          </strong>{" "}
          Sit it against the clock for a score by domain, or{" "}
          <a href="#questions" className="text-primary underline underline-offset-4">
            work through the questions one at a time
          </a>
          .
        </p>

        <section className="mt-6" aria-label="The practice test">
          <PracticeExam testId="security-plus-sy0-801" structure={STRUCTURE} reps={REPS} size="half" next={NEXT} />
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight">What the test covers</h2>
          <div className="mt-2 grid gap-3 leading-relaxed text-muted-foreground">
            <p>
              SY0-801 is the Security+ exam CompTIA lists as launching on or around November 17, 2026. CertBench
              wrote these questions for it, including its new objective on the threats of AI. None are taken
              from the exam.
            </p>
            <p>
              The {QUESTION_COUNT} questions are split across the five domains the way the exam weights them.
            </p>
          </div>
          <div className="mt-4 grid gap-1.5">
            {SECTIONS.map(({ domain, count }) => (
              <div
                key={domain.number}
                className="flex items-baseline justify-between gap-3 rounded-lg border bg-card px-4 py-2.5 text-sm"
              >
                <span className="min-w-0">
                  <span className="mr-1.5 font-mono text-xs text-muted-foreground">{domain.number}</span>
                  {domain.title}
                </span>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                  {domain.weight}% of exam · {count} questions
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

        <section id="questions" className="mt-12 scroll-mt-20">
          <h2 className="text-xl font-semibold tracking-tight">Practise one question at a time</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            The same {QUESTION_COUNT} questions, grouped by domain and objective. Pick an answer to see whether
            it&apos;s right and why.
          </p>
          {SECTIONS.map(({ domain, objectives }) => (
            <div key={domain.number} className="mt-8">
              <h3 className="flex items-baseline justify-between gap-3 border-b pb-2 font-semibold leading-snug">
                <span className="min-w-0">
                  <span className="mr-1.5 font-mono text-xs text-muted-foreground">{domain.number}</span>
                  {domain.title}
                </span>
                <span className="shrink-0 font-mono text-xs font-normal text-muted-foreground">
                  {domain.weight}% of exam
                </span>
              </h3>
              {objectives.map(({ objective, questions }) => (
                <div key={objective.code} className="mt-5">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    <span className="mr-1.5 font-mono text-xs">{objective.code}</span>
                    {objective.label}
                  </h4>
                  <div className="mt-3 grid gap-4">
                    {questions.map(({ question, number }) => (
                      <SampleQuestion key={question.id} number={number} question={question} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </section>

        <section className="mt-12 grid justify-items-center gap-3 rounded-xl border bg-muted/40 px-6 py-10 text-center">
          <h2 className="text-xl font-semibold tracking-tight">Study Security+ one short step at a time</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            CertBench&apos;s Security+ path covers every SY0-701 objective in short stops. About twenty minutes
            in, a readiness checkpoint shows where you stand by domain. SY0-701 stays open until June 11, 2027 in
            English.
          </p>
          <Button asChild size="lg" className="mt-1">
            <Link href={PATH_HREF}>
              Start my Security+ path
              <ArrowRight />
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground">
            No account needed to start.{" "}
            <Link href={SECURITY_PLUS_VERSIONS_PATH} className="underline underline-offset-4 hover:text-foreground">
              SY0-801 or SY0-701: which to take
            </Link>
          </p>
        </section>

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
              note: "Try performance-based questions in the browser",
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

        <FaqSection faqs={FAQS} />

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
