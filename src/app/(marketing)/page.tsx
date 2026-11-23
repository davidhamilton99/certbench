import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LinkArrow } from "@/components/ui/link-arrow";
import { CtaBand } from "@/components/marketing/lander/Article";
import { Testimonials } from "@/components/marketing/Testimonials";
import { ExamPicker } from "@/components/path/ExamPicker";
import { SampleQuestions } from "@/components/home/SampleQuestions";
import { Inventory } from "@/components/home/Inventory";
import { Method } from "@/components/home/Method";
import { Plan } from "@/components/home/Plan";
import { createAnonClient } from "@/server/supabase/anon";
import { listApprovedTestimonials } from "@/server/data/testimonials";
import { authoredToRep } from "@/server/path/build-stop";
import { examInventory, examStructure } from "@/server/path/inventory";
import { buildPlan, LEARN_BEFORE_CHECKPOINT, MINUTES_PER_STOP } from "@/core/path/plan";
import { seededRng, seedFrom } from "@/core/path/compose";
import { FREE_LAB_COUNT } from "@/core/path/free-labs";
import { REHEARSAL_FORMATS } from "@/core/path/rehearsal";
import { warmup } from "@/data/path/security-plus-sy0-701/domains-1-2";
import { keepCodes } from "@/lib/keep-codes";
import { PRO_PRICES, PRO_PRICE_TERMS } from "@/lib/pricing/terms";
import { EXAMS_WITH_FREE_LABS, practicePageFor } from "@/lib/seo/cert-pages";
import { EXAM_FACTS_CHECKED } from "@/lib/seo/exam-versions";
import { cn } from "@/lib/utils";

// The root layout's self-referencing canonical ("./") resolves to "/index"
// for the home route. The home page's canonical is pinned to the site root
// here, so that Google consolidates on https://certbench.dev/.
export const metadata = {
  alternates: { canonical: "/" },
};

// What this page counts changes a few times a month, and every deployment
// builds it again, so it is rebuilt once a day and not once an hour. An
// approved testimonial does not wait for that: the route that approves it asks
// for this page to be rebuilt at once.
export const revalidate = 86400;

/** The exam the homepage's sample questions and method come from: the one most people come for. */
const CERT = "security-plus-sy0-701";

/** The sample questions: four of the path's first questions that are asked in full sentences. */
const DEMO_KEYS = ["w3", "w5", "w4", "w6"];

/**
 * Example figures for the sample score report: a second practice exam, the
 * first one's result, and each domain's. Weighted by SY0-701's domains, the
 * five come to 82.
 */
const SAMPLE = { score: 82, from: 61, domains: [88, 79, 74, 83, 86] };

const FULL = REHEARSAL_FORMATS.full;

const QUALITY: { title: string; body: string }[] = [
  {
    title: "Questions are written for CertBench.",
    body: "The Security+ and A+ questions are written against the exam objectives that CompTIA publishes. No question is taken from a real exam, and none is copied from another question bank.",
  },
  {
    title: "Every answer is explained.",
    body: "On the study path, you are told why the correct answer is correct as soon as you answer. Questions that you answer incorrectly are repeated until you answer them correctly.",
  },
  {
    title: "Exam facts carry a date.",
    body: `Exam versions, domain weights and retirement dates were last checked against CompTIA's own exam pages, and its article on the two A+ exams, on ${EXAM_FACTS_CHECKED}.`,
  },
  {
    title: "CertBench is independent.",
    body: "CertBench is not affiliated with or endorsed by CompTIA. Messages sent to support@certbench.dev are read and answered by our team.",
  },
];

export default async function LandingPage() {
  // A read that fails stops the render. This page is rebuilt on a timer, and a
  // rebuild that throws leaves the last good page in place and is tried again.
  // A rebuild that went on without its figures, its outline or its
  // testimonials would replace the good page until the next one.
  const [testimonials, structure, rows] = await Promise.all([
    listApprovedTestimonials(createAnonClient(), 6),
    examStructure(CERT),
    examInventory(),
  ]);
  const showTestimonials = testimonials.length >= 3;
  const plan = buildPlan(structure);
  const reps = DEMO_KEYS.flatMap((key) => {
    const a = warmup.find((w) => w.key === key);
    return a ? [authoredToRep(a, seededRng(seedFrom("home-demo", key)))] : [];
  });
  const examHref = practicePageFor(CERT);

  return (
    <>
      {/*
        What this is and the one choice to make, beside the product itself to
        try. Two equal columns that begin and end on the same lines: the words
        on the left, and on the right one sheet of sample questions that keeps
        its size from the first question to the result.
      */}
      <section className="pb-16 sm:pb-24">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 pt-10 sm:px-6 sm:pt-14 lg:grid-cols-2 lg:gap-16 lg:pt-16">
          <div className="grid content-start gap-5 sm:gap-7">
            <div className="grid gap-4 sm:gap-5">
              <h1 className="cb-title">Prepare for your CompTIA certification exam.</h1>
              <p className="text-body text-muted-foreground sm:text-xl">
                CertBench is a study program for CompTIA Security+, Network+ and A+. It works through your exam
                topic by topic in short steps, gives you practice in hands-on labs, and finishes with a
                full-length timed practice exam.
              </p>
              <p className="text-body sm:text-xl">It is free to start, and you do not need a payment card.</p>
            </div>
            <div id="exams" className="grid gap-3">
              <h2 className="text-lg font-semibold">Choose your exam to begin.</h2>
              <ExamPicker surface="home" />
            </div>
          </div>

          <SampleQuestions reps={reps} structure={structure} steps={plan.stops.length} />
        </div>
      </section>

      {/* The numbers people compare study tools by, counted from the bank. */}
      <section className="border-t border-border bg-surface py-16 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 sm:gap-12 sm:px-6">
          <div className="grid gap-3">
            <h2 className="cb-section">What each exam includes</h2>
            {/* The free labs are named with their exams, because Security+ SY0-801 has no free lab. */}
            <p className="cb-measure text-body text-muted-foreground">
              CertBench holds a question bank, hands-on labs and a full-length practice exam for each exam in this
              table. One practice exam is free for each exam. For each of {keepCodes(EXAMS_WITH_FREE_LABS)},{" "}
              {FREE_LAB_COUNT} labs are free.
            </p>
          </div>
          <div className="grid gap-4">
            <Inventory rows={rows} />
            {/*
              How to read the two Security+ rows, set where the table ends so it is read with the figures.
              The exam codes stay whole where a narrow screen breaks the line.
            */}
            <p className="cb-measure-sm text-small text-muted-foreground">
              {keepCodes(
                "Most of the questions and labs for Security+ SY0-801 are shared with SY0-701, so the two Security+ rows should not be added together."
              )}
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 sm:gap-12 sm:px-6">
          <div className="grid gap-3">
            <h2 className="cb-section">How CertBench works</h2>
            <p className="cb-measure text-body text-muted-foreground">
              Preparation has three parts. Each part is shown here with an example from{" "}
              {keepCodes(`${structure.examName} ${structure.examCode}`)}.
            </p>
          </div>
          <Method
            structure={structure}
            steps={plan.stops.length}
            minutes={MINUTES_PER_STOP}
            sample={SAMPLE}
            freeLabs={FREE_LAB_COUNT}
            questions={FULL.questions}
            examMinutes={FULL.minutes}
            examHref={examHref}
            labsHref="/security-plus-pbq-examples"
          />
        </div>
      </section>

      {/*
        Why to believe it, in things that can be checked, and then a word to
        the people who teach these exams. Both stand on the one grey band, so
        paper and desk alternate down the whole page without an exception.
      */}
      <div className="border-t border-border bg-surface">
        <section className="py-16 sm:py-24">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 sm:px-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
            <div className="grid content-start gap-4">
              <h2 className="cb-section">Quality and accuracy</h2>
              <p className="cb-measure text-body text-muted-foreground">
                You are trusting a study tool with an exam fee and several weeks of your time. This is how CertBench
                is written and checked.
              </p>
              <Link href="/about" className="cb-link cb-tap w-fit font-semibold">
                Read how CertBench is made
              </Link>
            </div>
            <dl className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {QUALITY.map((p) => (
                <div key={p.title} className="grid content-start gap-1.5 border-t border-foreground/70 pt-4">
                  <dt className="text-body font-semibold leading-snug">{p.title}</dt>
                  <dd className="text-small text-muted-foreground">{p.body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="pb-16 sm:pb-24">
          <div className="mx-auto max-w-6xl px-5 sm:px-6">
            <div className="grid gap-6 border-t border-border pt-16 sm:pt-24 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
              <h2 className="cb-section">For colleges and training providers</h2>
              <div className="grid content-start gap-4">
                <p className="cb-measure text-body text-muted-foreground">
                  Instructors who teach CompTIA courses can use CertBench alongside their own materials. Each
                  question is linked to the objective or topic that it tests, each exam has a free full-length
                  practice exam, and students can begin without paying.
                </p>
                <Link href="/educators" className="cb-link cb-tap w-fit font-semibold">
                  Read the information for educators
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>

      {showTestimonials && <Testimonials items={testimonials} />}

      {/*
        Price, plainly. The testimonials, when they are shown, are set on
        paper, so this section takes the desk then and the alternation holds.
      */}
      <section className={cn("py-16 sm:py-24", showTestimonials && "border-t border-border bg-surface")}>
        <div className="mx-auto grid max-w-6xl gap-10 px-5 sm:px-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-start lg:gap-16">
          <div className="grid content-start gap-4">
            <h2 className="cb-section">Pricing</h2>
            <p className="cb-measure text-body text-muted-foreground">
              CertBench is free to start, and you can decide later whether to pay. {PRO_PRICE_TERMS}
            </p>
            <Link href="/pricing" className="cb-link cb-tap w-fit font-semibold">
              View pricing
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Plan
              name="Free"
              price="$0"
              note="No payment card is required."
              lead="The free plan includes:"
              items={[
                `One full-length practice exam of ${FULL.questions} questions in ${FULL.minutes} minutes`,
                `${FREE_LAB_COUNT} hands-on labs for each of ${EXAMS_WITH_FREE_LABS}`,
                // Said of every exam, so a step is a topic: the Network+ topics are not CompTIA's objectives.
                `The introductory questions, ${LEARN_BEFORE_CHECKPOINT === 1 ? "your first topic" : `your first ${LEARN_BEFORE_CHECKPOINT} topics`} and the readiness checkpoint`,
              ]}
            />
            <Plan
              name="Pro"
              price={PRO_PRICES.monthly}
              note={`This is the price for a month. Pro also costs ${PRO_PRICES.quarterly} every three months, or ${PRO_PRICES.annual} a year.`}
              lead="Pro includes:"
              items={[
                "The whole study path, which works through your exam topic by topic",
                "Every hands-on lab, and new timed practice exams",
                "Review of the questions that you answered incorrectly",
              ]}
            />
          </div>
        </div>
      </section>

      {/*
        The page ends on the navy band, as it began under one, with the one
        decision it asks for: the same band, from the same kit, that closes
        every other public page. The section above ends in its own space, so
        the band adds none. The arrow marks the way onto the study path.
      */}
      <CtaBand title="Choose your exam to begin." className="mt-0 sm:mt-0">
        <Button asChild size="lg" className="mt-1">
          <Link href="/start">
            Choose your exam
            <LinkArrow />
          </Link>
        </Button>
      </CtaBand>
    </>
  );
}
