import { CERT_PAGES_UPDATED_ISO, PRACTICE_TEST_PAGES, type PracticeTestPage } from "@/lib/seo/cert-pages";
import { FaqSection } from "@/components/marketing/FaqSection";
import { QuestionDeck, type DeckQuestion } from "@/components/marketing/QuestionDeck";
import { ExamVersionNote } from "@/components/marketing/ExamVersionNote";
import { RelatedLinks } from "@/components/marketing/RelatedLinks";
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
import { ExamOutline } from "@/components/marketing/lander/ExamOutline";
import { TileGrid, type Tile } from "@/components/marketing/lander/TileGrid";
import { QuickRound } from "@/components/path/QuickRound";
import { PracticeExam, PracticeExamJump } from "@/components/marketing/PracticeExam";
import type { PublicTestData, QuickRoundData } from "@/core/path/types";
import { JsonLd } from "@/components/seo/JsonLd";
import { keepCodes } from "@/lib/keep-codes";
import { replacedBy, usesOfficialObjectiveNumbers } from "@/lib/seo/exam-versions";
import { REHEARSAL_FORMATS } from "@/core/path/rehearsal";

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

/** The practice exam's place on the page: the opening lines link to it. */
const EXAM_ANCHOR = "practice-test";

/** Counts are written the American way wherever the page is built. */
const count = (n: number) => n.toLocaleString("en-US");

/** The template of the practice-test pages. A page loads its data with @/server/seo and passes it in. */
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
  /** The exam's introductory questions, played at the top (pages for one exam). */
  round?: QuickRoundData | null;
  /** The exam's free timed practice exam (pages for one exam). */
  test?: PublicTestData | null;
}) {
  // The cores' own pages are offered at the top, so they are not repeated here.
  const otherHubs = PRACTICE_TEST_PAGES.filter(
    (p) => p.path !== page.path && !page.cores?.some((c) => c.href === `/${p.path}`)
  );
  // The Network+ objective numbers are not CompTIA's yet, so that list goes by topic.
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

  // The samples as one deck, shortest first within each exam so that the first
  // question is an approachable one. A page with two exams says which exam
  // each question belongs to.
  const multi = data.sampleGroups.length > 1;
  const deck: DeckQuestion[] = data.sampleGroups.flatMap((group) =>
    [...group.questions]
      .sort((a, b) => a.questionText.length - b.questionText.length)
      .map((q) => (multi ? { ...q, tag: `${group.certName} (${group.examCode})` } : q))
  );
  const pathHref = page.certSlugs.length === 1 ? `/path/${page.certSlugs[0]}` : "/start";
  const examName = round?.examName ?? page.title.replace(/ practice test$/i, "");
  const codes = examOutlines.map((e) => e.examCode).join(" and ");
  // The exam as a sentence names it: "Security+ SY0-701".
  const exam = `${examName} ${codes}`;
  const testMinutes = test ? REHEARSAL_FORMATS[test.size].minutes : 0;
  const fullTest = test?.size === "full";
  const bank = `${count(data.totalQuestions)} questions`;

  // Objectives as rows, a group for each domain (for each exam and domain on a page with two exams).
  const groups = objectiveGroups(objectives, examOutlines, official);

  // The opening sentences name who offers what, so that they can be quoted
  // with their source: CertBench, the exam, and the terms.
  const sub = test
    ? `CertBench offers a free ${fullTest ? "full-length " : ""}practice exam for ${exam}. It has ${test.reps.length} questions and a time limit of ${testMinutes} minutes. You do not need an account to start, and a free account shows your score.${
        round ? ` You can begin with ${round.reps.length} introductory questions.` : ""
      }`
    : round
      ? `CertBench offers ${round.reps.length} free introductory questions for ${exam}. You do not need an account to answer them.`
      : `CertBench offers free exam-style questions for ${exam}. Each one is explained as soon as you answer.`;

  // The page's facts, each with its label.
  const specs: Spec[] = test
    ? [
        { label: "Questions", value: String(test.reps.length) },
        { label: "Time limit", value: `${testMinutes} minutes` },
        { label: "Scoring", value: "By domain" },
        { label: "Question bank", value: bank },
      ]
    : round
      ? [
          { label: "Introductory questions", value: String(round.reps.length) },
          { label: "Question bank", value: bank },
        ]
      : [
          { label: "Question bank", value: bank },
          { label: "Explanations", value: "With every answer" },
          { label: "Price", value: "Free" },
        ];

  // For search and AI answers: this page is a free practice resource for the exam.
  const learningResource = {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name: page.metaTitle,
    description: page.metaDescription,
    url: `https://certbench.dev/${page.path}`,
    // The day the page's words last changed: the day the sitemap gives for it.
    dateModified: CERT_PAGES_UPDATED_ISO,
    learningResourceType: "Practice test",
    educationalUse: "Practice",
    isAccessibleForFree: true,
    ...(test ? { timeRequired: `PT${testMinutes}M` } : {}),
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
        // The exam's code stands over the title only where the title does not hold it.
        eyebrow={examOutlines.every((e) => page.h1.includes(e.examCode)) ? undefined : codes}
        title={page.h1}
        // An exam code is never broken across two lines.
        sub={keepCodes(sub)}
        specs={specs}
      >
        {/* The exam is further down the page than its first screen: the way to
            it, or back into a sitting left mid-way, is in the opening lines. */}
        {test && <PracticeExamJump testId={test.testId} href={`#${EXAM_ANCHOR}`} />}
        {/* An exam taken in parts: each part's own practice-test page comes first. */}
        {page.cores && (
          <TileGrid
            details="always"
            groups={[
              {
                tiles: page.cores.map((core) => ({
                  href: core.href,
                  title: `${core.name} practice test (${core.examCode})`,
                  detail: core.blurb,
                })),
              },
            ]}
          />
        )}
      </LanderHero>

      {/* A retired exam changes what this page is, so that is said first. */}
      {retired && (
        <LanderBlock className="mt-8">
          <ExamVersionNote certSlugs={page.certSlugs} />
        </LanderBlock>
      )}

      {/* Something to do comes first: the exam's introductory questions, which
          are the first step of its study path. */}
      {round && (
        <LanderStage>
          <QuickRound
            cert={round.cert}
            stopId="warmup"
            examName={round.examName}
            structure={round.structure}
            reps={round.reps}
            label={`${round.examName} introductory questions`}
            surface="practice_test_page"
            unit={official ? "objectives" : "topics"}
          />
        </LanderStage>
      )}

      {!retired && (
        <LanderBlock className="mt-8">
          <ExamVersionNote certSlugs={page.certSlugs} />
        </LanderBlock>
      )}

      {/* What a search for a practice test is after: a full-length timed exam,
          taken on the study path's own exam player and scored by domain, then
          the way on. A half-length sitting is cut from the same questions. */}
      {test && (
        <LanderSection
          id={EXAM_ANCHOR}
          title={`Free ${examName} practice exam`}
          sub={keepCodes(
            fullTest
              ? `The CertBench practice exam for ${exam} has ${test.reps.length} questions and a time limit of ${testMinutes} minutes, which is the limit of the real exam. You can also take a half-length exam of ${REHEARSAL_FORMATS.half.questions} questions. As in the real exam, answers are not shown until the end. Every question is then explained with your score.`
              : `The CertBench practice exam for ${exam} has ${test.reps.length} questions and a time limit of ${testMinutes} minutes. As in the real exam, answers are not shown until the end. Every question is then explained with your score.`
          )}
          width="md"
        >
          <PracticeExam
            testId={test.testId}
            structure={test.structure}
            reps={test.reps}
            size={test.size}
            offerHalf
            headingLevel="h3"
            listTitle={`All ${test.reps.length} questions, with answers`}
            objectiveCodes={official}
            next={{
              heading: `Your ${examName} study path begins from this result`,
              // Network+ is set out by CertBench's own topics, so its page says "topic".
              body: `On your study path, this exam counts as your readiness checkpoint. The questions that you missed are brought back for review, and every ${official ? "objective" : "topic"} is set out in short steps.`,
              primary: { href: `${pathHref}?from=practice-test`, label: "Open the study path" },
            }}
          />
        </LanderSection>
      )}

      {/* The samples, one at a time on the study path's own card. Every question
          and answer is also in the page, in the deck's folded list. */}
      {deck.length > 0 && (
        <LanderSection
          title={round ? "Exam-style sample questions" : "Sample questions"}
          sub={`There are ${deck.length} sample questions here, and each one is explained as you answer. The full bank has ${bank}.`}
          width="md"
        >
          <QuestionDeck
            questions={deck}
            label={`${examName} sample questions`}
            surface="practice_test_page"
            path={pathHref}
            examName={examName}
          />
        </LanderSection>
      )}

      {/* Each domain, and its share of the exam. */}
      <LanderSection title="What the exam covers" sub="The table shows each domain's share of the exam." width="xl">
        <ExamOutline exams={examOutlines} />
      </LanderSection>

      {/* Practice by objective: links to each objective's own page. */}
      {groups.length > 0 && (
        <LanderSection
          eyebrow={`${objectives.length} ${official ? "objectives" : "topics"}`}
          title={official ? "Practice by exam objective" : "Practice by topic"}
          sub={`Each ${official ? "objective" : "topic"} has its own practice questions, with explanations.`}
          width="xl"
        >
          <TileGrid groups={groups} />
        </LanderSection>
      )}

      <PathCard
        className="mt-20 sm:mt-28"
        title={`Study for ${examName} in short steps`}
        href={pathHref}
        label="Start the study path"
        context="practice_test_page"
        note="You do not need an account to start."
      >
        The study path covers every {official ? "exam objective" : "topic"} in short sets of questions like these. A
        readiness checkpoint then shows where you stand.
      </PathCard>

      <LanderProse>
        {page.intro.map((p) => (
          <p key={p.slice(0, 32)}>{p}</p>
        ))}
      </LanderProse>

      <LanderBlock>
        <RelatedLinks links={page.related ?? []} />
        {otherHubs.length > 0 && (
          <section className="mt-16 sm:mt-24">
            <h2 className="cb-subsection border-t border-foreground/80 pt-5">Other CompTIA practice tests</h2>
            <TileGrid
              className="mt-6"
              groups={[{ tiles: otherHubs.map((h) => ({ href: `/${h.path}`, title: h.title })) }]}
            />
          </section>
        )}
        <FaqSection faqs={page.faqs} />
      </LanderBlock>
    </LanderPage>
  );
}

/** Objectives as groups of rows: one for each domain, named by exam too when a page has two. */
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
      const prefix = certs.length > 1 && exam ? exam.examCode : "";
      byKey.set(key, {
        label: official
          ? `${prefix ? `${prefix}, ` : ""}Domain ${domain.replace(/\.0$/, "")}${title ? `: ${title}` : ""}`
          : prefix || undefined,
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
