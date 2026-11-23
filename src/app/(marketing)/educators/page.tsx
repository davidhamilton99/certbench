import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LinkPending } from "@/components/ui/link-arrow";
import { Inventory } from "@/components/home/Inventory";
import { LanderPage } from "@/components/marketing/lander/Lander";
import { ArticleBody, ArticleHero, ArticleRow, ArticleSection, CtaBand } from "@/components/marketing/lander/Article";
import { FREE_LAB_COUNT } from "@/core/path/free-labs";
import { MINUTES_PER_STOP } from "@/core/path/plan";
import { REHEARSAL_FORMATS } from "@/core/path/rehearsal";
import { longDate } from "@/core/path/versions";
import { keepCodes } from "@/lib/keep-codes";
import { PRO_PRICE_REGION_NOTE, PRO_PRICE_SHORT } from "@/lib/pricing/terms";
import { READINESS_TARGET } from "@/lib/readiness/band";
import { EXAMS_WITH_FREE_LABS, practicePageFor } from "@/lib/seo/cert-pages";
import { EXAM_FACTS_CHECKED, SECURITY_PLUS_CERT } from "@/lib/seo/exam-versions";
import { pageMetadata } from "@/lib/seo/metadata";
import { ABOUT_PAGES_UPDATED_ISO } from "@/lib/seo/page-dates";
import { examInventory } from "@/server/path/inventory";

export const metadata = pageMetadata({
  title: "For educators",
  description:
    "Information for instructors who teach CompTIA Security+, Network+ and A+ courses: what CertBench covers, how its questions are written and checked, what students can use free of charge, and how to arrange access for a class.",
  path: "/educators",
});

// The table is counted from the question bank, which changes only when
// questions are added or withdrawn, and every deployment builds the page again.
// Counts that are at most a day old are close enough, so the page is rebuilt
// once a day and not once an hour.
export const revalidate = 86400;

const FULL = REHEARSAL_FORMATS.full;

/** The last section of the page, which the introduction links to. */
const CLASS_ACCESS = "class-access";

/** The address for arranging access, with a subject so that the message arrives sorted. */
const CLASS_ACCESS_MAIL = `mailto:support@certbench.dev?subject=${encodeURIComponent("Access for a class")}`;

export default async function EducatorsPage() {
  const rows = await examInventory();
  return (
    // The page ends on the navy band, which stands on the footer.
    <LanderPage className="pb-0">
      <ArticleBody>
        <ArticleHero eyebrow="For educators" title="CertBench for CompTIA courses">
          <p>
            CertBench is an independent study program for the CompTIA Security+, Network+ and A+ exams. This page is
            for instructors and program coordinators who are considering it for their students.
          </p>
          {/* The answer an instructor came for, with its limits, before the detail. */}
          <p>
            A course can use CertBench at no cost to the institution, because students can begin with free accounts.
            CertBench does not have class lists or reports for instructors, and it does not connect to a learning
            management system. To arrange access for a class, see{" "}
            <a href={`#${CLASS_ACCESS}`} className="cb-link">
              the last section of this page
            </a>
            .
          </p>
          <p>
            The page sets out what the program covers, how its questions are written and checked, what students can
            use free of charge, and what the program does not do.
          </p>
        </ArticleHero>

        {/* The table needs the room, so this section runs to the page's right edge. */}
        <ArticleSection
          wide
          title="What CertBench covers"
          sub={
            <>
              CertBench holds a question bank, hands-on labs and a full-length practice exam for each exam in this
              table.{" "}
              {keepCodes(
                "Most of the Security+ SY0-801 questions are also in the SY0-701 bank, so the two Security+ rows should not be added together."
              )}{" "}
              The figures in this table are counted from the current question bank. Exam versions, domain weights and
              retirement dates were last checked against CompTIA&apos;s exam pages, and its article on the two A+
              exams, on {EXAM_FACTS_CHECKED}.
            </>
          }
        >
          <Inventory rows={rows} />
        </ArticleSection>

        <ArticleSection title="How CertBench supports a course">
          <dl className="border-t border-border">
            <ArticleRow term="Practice by objective">
              <p>
                Every question is linked to the exam objective that it tests or, for Network+, to a topic of
                CertBench&apos;s own. For Security+ SY0-701 and A+, each objective has its own page of practice
                questions with explanations, and Network+ has a page for each topic. The pages have fixed addresses, so
                you can assign them alongside your own teaching.
              </p>
            </ArticleRow>
            <ArticleRow term="A timed practice exam">
              <p>
                Each exam has a full-length practice exam of {FULL.questions} questions with a time limit of{" "}
                {FULL.minutes} minutes. It is scored by domain, and every question is explained at the end. A student
                needs only a free account to see the score.
              </p>
              <p>
                The free practice exam is the same for every student, and for Security+ SY0-701, Network+ and A+ its
                questions and answers are also published on the practice-test page, so it is suited to practice and
                not to graded assessment.
              </p>
            </ArticleRow>
            <ArticleRow term="Hands-on practice">
              <p>
                The Security+, Network+ and A+ exams have performance-based questions as well as multiple-choice
                questions, and CompTIA does not publish which topics they test. Each exam on CertBench has hands-on
                labs as practice for them: in a lab, a student carries out a task in the browser instead of choosing an
                answer. The labs include simulations, network diagrams, and ordering and matching tasks, and they are
                graded with partial credit. For each of {keepCodes(EXAMS_WITH_FREE_LABS)}, {FREE_LAB_COUNT} labs are
                free.
              </p>
            </ArticleRow>
            <ArticleRow term="Study in short steps">
              <p>
                The study path works through each exam topic by topic, in steps of about {MINUTES_PER_STOP} minutes.
                For Security+ and A+, each topic is one of CompTIA&apos;s exam objectives. Questions that a student
                answers incorrectly are brought back in later steps.
              </p>
            </ArticleRow>
            <ArticleRow term="Results by domain">
              <p>
                Results are reported for each exam domain against a readiness target of {READINESS_TARGET}%, so a
                student can see which domains need more work. The target is a guide and not a prediction of the exam
                result.
              </p>
            </ArticleRow>
          </dl>
        </ArticleSection>

        <ArticleSection title="How the questions are written and checked">
          <dl className="border-t border-border">
            <ArticleRow term="Original questions">
              <p>
                Every question is written for CertBench. <strong>No question is taken from a real exam.</strong>{" "}
                CompTIA&apos;s policy prohibits the use of real exam questions, and CertBench does not use or offer
                them.
              </p>
            </ArticleRow>
            <ArticleRow term="Explanations">
              <p>Every question has an explanation of why the correct answer is correct.</p>
            </ArticleRow>
            <ArticleRow term="Corrections">
              <p>
                Reports of errors are read by a person, and a question that is wrong is corrected or withdrawn. You and
                your students can send reports to{" "}
                <a href="mailto:support@certbench.dev" className="cb-link">
                  support@certbench.dev
                </a>
                .
              </p>
            </ArticleRow>
            <ArticleRow term="Further detail">
              <p>
                The page{" "}
                <Link href="/about" className="cb-link">
                  How CertBench is made
                </Link>{" "}
                describes the checks in full and explains how the score is calculated.
              </p>
            </ArticleRow>
          </dl>
        </ArticleSection>

        <ArticleSection title="What students can use free of charge">
          <ul className="cb-measure grid list-disc gap-2.5 pl-5 text-body text-muted-foreground">
            <li>The introductory questions for each exam, without an account.</li>
            <li>
              One full-length practice exam of {FULL.questions} questions for each exam, scored with a free account.
            </li>
            <li>
              For each of {keepCodes(EXAMS_WITH_FREE_LABS)}, {FREE_LAB_COUNT} hands-on labs, the first three without
              an account.
            </li>
            <li>The first study step and the readiness checkpoint, with a free account.</li>
            <li>Practice drills for subnetting, port numbers and acronyms.</li>
            <li>
              {keepCodes(
                "The page of practice questions for each objective of Security+ SY0-701 and A+, and for each Network+ topic."
              )}
            </li>
          </ul>
          {/* The price is stated here and not only on the pricing page: an
              instructor is asked what the program costs a student. */}
          <p className="cb-measure mt-5 text-body text-muted-foreground">
            CertBench Pro opens the rest of the study path, every hands-on lab and further practice exams. For an
            individual student, {PRO_PRICE_SHORT}. {PRO_PRICE_REGION_NOTE} The{" "}
            <Link href="/pricing" className="cb-link">
              pricing page
            </Link>{" "}
            lists what each plan includes.
          </p>
        </ArticleSection>

        <ArticleSection title="What CertBench does not do">
          <dl className="border-t border-border">
            <ArticleRow term="It is not a course">
              <p>
                CertBench has no video lessons or textbook chapters. It is intended to accompany your teaching and your
                course materials, and not to replace them.
              </p>
            </ArticleRow>
            <ArticleRow term="It has no instructor accounts">
              <p>
                CertBench does not have class lists or reports for instructors, and it does not connect to a learning
                management system. Each student sees their own results. If these features would be useful to you,
                please say so when you write.
              </p>
            </ArticleRow>
            <ArticleRow term="It is not CompTIA">
              <p>
                CertBench is not affiliated with, endorsed by or sponsored by CompTIA. It cannot provide a scaled exam
                score, and it does not guarantee that a student will pass.
              </p>
            </ArticleRow>
          </dl>
        </ArticleSection>

        <ArticleSection title="Student accounts and privacy">
          <p className="cb-measure text-body text-muted-foreground">
            A student account requires an email address and a password, or a Google sign-in. CertBench does not sell
            personal data. The{" "}
            <Link href="/privacy" className="cb-link">
              privacy policy
            </Link>{" "}
            explains what is collected and why, including the usage analytics that CertBench uses to improve the
            program.
          </p>
        </ArticleSection>

        <ArticleSection id={CLASS_ACCESS} title="Arranging access for a class">
          <p className="cb-measure text-body text-muted-foreground">
            A course can use CertBench at no cost to the institution, because students can begin with free accounts.
            CertBench does not have class lists or reports for instructors, and it does not connect to a learning
            management system. If you would like your students to have Pro access, please write to{" "}
            <a href={CLASS_ACCESS_MAIL} className="cb-link">
              support@certbench.dev
            </a>{" "}
            and include the course, the exam and the number of students. CertBench aims to reply within 24 hours.
          </p>
        </ArticleSection>

        {/* The day these words last changed, kept beside the sitemap's date for this page. */}
        <p className="text-note text-muted-foreground">
          This page was last updated on {longDate(ABOUT_PAGES_UPDATED_ISO)}.
        </p>
      </ArticleBody>

      <CtaBand title="Review the questions yourself">
        <p className="cb-measure text-body text-muted-foreground">
          The most direct way to assess a question bank is to answer some of its questions. You do not need an
          account.
        </p>
        <div className="mt-1 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href={practicePageFor(SECURITY_PLUS_CERT)}>Open the Security+ practice exam</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/start">
              <LinkPending>Choose your exam</LinkPending>
            </Link>
          </Button>
        </div>
      </CtaBand>
    </LanderPage>
  );
}
