import Link from "next/link";
import { FaqSection } from "@/components/marketing/FaqSection";
import { PracticeExam, type PracticeExamNext } from "@/components/marketing/PracticeExam";
import { RelatedLinks } from "@/components/marketing/RelatedLinks";
import { CtaBand } from "@/components/marketing/lander/Article";
import {
  LanderBlock,
  LanderHero,
  LanderPage,
  LanderSection,
  LanderStage,
  type Spec,
} from "@/components/marketing/lander/Lander";
import { QuestionDeck, type DeckQuestion } from "@/components/marketing/QuestionDeck";
import { JsonLd } from "@/components/seo/JsonLd";
import { Button } from "@/components/ui/button";
import { LinkArrow } from "@/components/ui/link-arrow";
import { FREE_LAB_COUNT } from "@/core/path/free-labs";
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

/** The page's name in the browser tab and in search results. "Practice test" is what people search for. */
const TITLE = "Free Security+ SY0-801 practice test";

/** What the page offers, as search and AI answers read it: the exam it serves, whichever that is. */
function describe(exam: PublicTestData): string {
  return exam.size === "full"
    ? `Free full-length Security+ SY0-801 practice exam: ${exam.reps.length} questions in ${FULL.minutes} minutes in the exam's domain weights, scored by domain, with every answer explained.`
    : `Free ${exam.reps.length}-question Security+ SY0-801 practice test covering all ${OBJECTIVE_COUNT} objectives in the exam's weights. Timed, scored by domain, with every answer explained.`;
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

/** The page's own 45 questions as a half-length exam: the timed one when the bank cannot be drawn from. */
const FALLBACK: PublicTestData = { testId: SY0_801_CERT, structure: STRUCTURE, size: "half", reps: REPS };

/** The exam's code in running text: never broken across two lines. */
const CODE = <span className="whitespace-nowrap">SY0-801</span>;

/** The domain an objective sits in: "4.2" is in "4.0". */
const domainOf = (objective: string) => `${objective.split(".")[0]}.0`;

/** The page's questions under their domain and objective, numbered in page order. */
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

/** The same questions in objective order, each under its objective, for the untimed deck. */
const DECK: DeckQuestion[] = SECTIONS.flatMap(({ objectives }) =>
  objectives.flatMap(({ objective, questions }) =>
    questions.map(({ question }) => ({
      questionText: question.questionText,
      options: question.options,
      correctIndex: question.correctIndex,
      explanation: question.explanation,
      tag: `${objective.code} ${objective.label}`,
    }))
  )
);

const NEXT: PracticeExamNext = {
  heading: "Your SY0-801 study path begins from this result",
  body: `The CertBench SY0-801 study path covers all ${OBJECTIVE_COUNT} objectives in short steps, including the new objective on AI, and brings back the questions that you miss. On your study path, this exam counts as your readiness checkpoint.`,
  primary: { href: `${PATH_HREF}?from=practice-test`, label: "Open the study path" },
  links: [
    { href: SY0_801_AI_PATH, label: "Practice the AI objective" },
    { href: SECURITY_PLUS_VERSIONS_PATH, label: "Compare SY0-801 and SY0-701" },
  ],
};

function faqs(fullTest: boolean) {
  return [
    {
      question: "Is this practice test for SY0-801 or SY0-701?",
      answer: `It is for SY0-801, the newest Security+ exam and the version that CompTIA now recommends. Each question is tagged to one of the ${OBJECTIVE_COUNT} SY0-801 objectives. For SY0-701, which stays open until June 11, 2027 in English, use the CertBench SY0-701 practice exam and study path.`,
    },
    {
      question: "How long is the real SY0-801 exam?",
      answer: fullTest
        ? `The real exam has up to ${FULL.questions} questions, multiple-choice and performance-based, in ${FULL.minutes} minutes. This practice exam is the same length: ${FULL.questions} multiple-choice questions in ${FULL.minutes} minutes, or a half-length exam of ${HALF.questions} questions in ${HALF.minutes} minutes at the same pace.`
        : `The real exam has up to ${FULL.questions} questions, multiple-choice and performance-based, in ${FULL.minutes} minutes. This practice exam is half that length: ${QUESTION_COUNT} multiple-choice questions in ${HALF.minutes} minutes, so the pace is the same.`,
    },
    {
      question: "What score do I need to pass SY0-801?",
      answer:
        "You need 750 on a scale of 100 to 900. CompTIA does not publish how that scale maps to a share of questions answered correctly, so no practice exam can give you a scaled score. This one reports the percentage that you answered correctly, weighted by each domain's share of the exam.",
    },
    {
      question: "Are these real exam questions?",
      answer:
        "No. They are original questions written by CertBench against CompTIA's published SY0-801 exam objectives. CompTIA's exam questions are confidential, and using leaked questions breaks its exam policies.",
    },
    {
      question: "What is new on SY0-801 compared with SY0-701?",
      answer: `SY0-801 has a new objective, 2.6, on the threats and vulnerabilities of using AI. It has ${OBJECTIVE_COUNT} objectives instead of 28, applying mitigating controls moves into security operations, and the domain weights change. The format and the passing score stay the same.`,
    },
    {
      question: "Does this practice test include performance-based questions?",
      answer: `No. Every question here is multiple-choice. The real exam also has performance-based questions, and the CertBench Security+ PBQ page has ${FREE_LAB_COUNT} interactive ones that are free to work through in the browser, the first three with no account.`,
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

  // The page's facts, each with its label.
  const specs: Spec[] = [
    { label: "Questions", value: String(exam.reps.length) },
    { label: "Time limit", value: `${examMinutes} minutes` },
    { label: "Scoring", value: "By domain" },
    { label: "Objectives covered", value: `${Math.min(covered, OBJECTIVE_COUNT)} of ${OBJECTIVE_COUNT}` },
  ];

  return (
    <LanderPage>
      <JsonLd data={learningResource} />
      <LanderHero
        above={
          <p className="text-note text-muted-foreground">
            CompTIA Security+ V8. The questions were checked against CompTIA&apos;s SY0-801 objectives on{" "}
            {SY0_801_PRACTICE_CHECKED}.
          </p>
        }
        title={TITLE}
        // The opening sentences name who offers what, so that they can be quoted with their source.
        sub={
          fullTest ? (
            <>
              CertBench offers a free full-length practice exam for Security+ {CODE}. It has {exam.reps.length}{" "}
              questions and a time limit of {examMinutes} minutes, which is the limit of the real exam. You do not
              need an account to start, and a free account shows your score. You can also take a half-length exam of{" "}
              {HALF.questions} questions, or{" "}
              <a href="#questions" className="cb-link">
                answer {QUESTION_COUNT} more questions one at a time
              </a>
              .
            </>
          ) : (
            <>
              CertBench offers a free practice exam for Security+ {CODE}. It has {QUESTION_COUNT} original questions
              and a time limit of {HALF.minutes} minutes, with at least one question on each of the {OBJECTIVE_COUNT}{" "}
              SY0-801 objectives. You do not need an account to start, and a free account shows your score. You can
              also{" "}
              <a href="#questions" className="cb-link">
                answer the questions one at a time
              </a>
              .
            </>
          )
        }
        specs={specs}
      />

      {/* The exam comes straight after the opening lines: on a phone the way in is on the first screen. */}
      <LanderStage>
        <section aria-label="The practice exam">
          <PracticeExam
            testId={exam.testId}
            structure={exam.structure}
            reps={exam.reps}
            size={exam.size}
            offerHalf
            next={NEXT}
          />
        </section>
      </LanderStage>

      <LanderSection
        title="What the practice exam covers"
        sub={`SY0-801 is the newest Security+ exam, and the version that CompTIA now recommends. CertBench wrote these questions for it, including its new objective on the threats of AI. None of them is taken from the exam. The ${exam.reps.length} questions are divided among the five domains in the proportions of the exam.`}
      >
        <table className="w-full border-collapse text-left text-small">
          <caption className="sr-only">
            The domains of SY0-801, each with its share of the exam and its number of questions in this practice exam
          </caption>
          <thead>
            <tr className="border-y border-foreground/70 text-note text-muted-foreground">
              <th scope="col" className="py-2.5 pr-4 font-medium">
                Domain
              </th>
              {/* Two lines on a phone, so the domains keep most of the width. */}
              <th scope="col" className="w-20 py-2.5 pl-4 text-right font-medium sm:w-px sm:whitespace-nowrap">
                Share of the exam
              </th>
              <th scope="col" className="w-px py-2.5 pl-4 text-right font-medium">
                Questions
              </th>
            </tr>
          </thead>
          <tbody>
            {SECTIONS.map(({ domain }) => (
              <tr key={domain.number} className="border-b border-border">
                <th scope="row" className="py-3 pr-4 font-normal">
                  <span className="mr-2 font-mono text-note text-muted-foreground">
                    {domain.number.replace(/\.0$/, "")}
                  </span>
                  {domain.title}
                </th>
                <td className="py-3 pl-4 text-right">{domain.weight}%</td>
                <td className="py-3 pl-4 text-right">{perDomain.get(domain.number) ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-4 text-small text-muted-foreground">
          What each objective covers is set out in the{" "}
          <Link href={SY0_801_PATH} className="cb-link">
            {CODE} exam objectives
          </Link>
          .
        </p>
      </LanderSection>

      <LanderSection
        id="questions"
        title="Practice one question at a time"
        sub={
          fullTest
            ? `There are ${QUESTION_COUNT} more SY0-801 questions here, in the order of the objectives. They are not timed, and each one is explained as soon as you answer.`
            : `These are the same ${QUESTION_COUNT} questions, in the order of the objectives. They are not timed, and each one is explained as soon as you answer.`
        }
        width="md"
      >
        <QuestionDeck
          questions={DECK}
          label="SY0-801 practice questions"
          surface="sy0801_practice_test_page"
          path={PATH_HREF}
          examName="Security+"
          listTitle={`All ${QUESTION_COUNT} questions by objective, with answers`}
        />
      </LanderSection>

      <CtaBand title="Study for SY0-801 in short steps">
        <p className="cb-measure text-body text-muted-foreground">
          The CertBench SY0-801 study path covers all {OBJECTIVE_COUNT} objectives in short steps, including the
          threats of AI. A readiness checkpoint then shows where you stand in each domain.
        </p>
        <Button asChild size="lg" className="mt-2 h-auto min-h-12 max-w-full whitespace-normal py-2.5 text-left">
          <Link href={PATH_HREF}>
            Start the SY0-801 study path
            <LinkArrow />
          </Link>
        </Button>
        <p className="text-small text-muted-foreground">
          You do not need an account to start. CertBench also explains{" "}
          <Link href={SECURITY_PLUS_VERSIONS_PATH} className="cb-link">
            whether to take SY0-801 or SY0-701
          </Link>
          .
        </p>
      </CtaBand>

      <LanderBlock>
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
              label: "SY0-801 and SY0-701 compared",
              note: "Which version to take, by exam date",
            },
            {
              href: "/security-plus-pbq-examples",
              label: "Security+ PBQ examples",
              note: `${FREE_LAB_COUNT} free interactive PBQs, three of them with no account`,
            },
            {
              href: "/security-plus-practice-test",
              label: "Security+ SY0-701 practice test",
              note: "Questions for the exam that stays open until June 11, 2027",
            },
            {
              href: "/tools/security-plus-acronyms-quiz",
              label: "Security+ acronyms quiz",
              note: "Practice the acronyms that both exams use",
            },
          ]}
        />

        <FaqSection faqs={faqs(fullTest)} />

        <p className="cb-measure mt-10 text-note text-muted-foreground">
          The exam details and objectives are from CompTIA&apos;s{" "}
          <a href={COMPTIA_URLS.securityV8} target="_blank" rel="noopener noreferrer" className="cb-link">
            Security+ V8 page
          </a>{" "}
          and the SY0-801 exam objectives that it links to (document version 2.0). The questions and explanations
          are by CertBench.
        </p>
      </LanderBlock>
    </LanderPage>
  );
}
