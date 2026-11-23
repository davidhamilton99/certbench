import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LinkArrow } from "@/components/ui/link-arrow";
import { LanderPage } from "@/components/marketing/lander/Lander";
import { ArticleBody, ArticleHero, ArticleRow, ArticleSection, CtaBand } from "@/components/marketing/lander/Article";
import { FREE_LAB_COUNT } from "@/core/path/free-labs";
import { CHECKPOINT_SIZE } from "@/core/path/plan";
import { REHEARSAL_FORMATS } from "@/core/path/rehearsal";
import { longDate } from "@/core/path/versions";
import { keepCodes } from "@/lib/keep-codes";
import { PASS_GUARANTEE_HREF, PASS_GUARANTEE_TERMS } from "@/lib/pricing/guarantee";
import { PRO_PRICE_TERMS } from "@/lib/pricing/terms";
import { READINESS_TARGET } from "@/lib/readiness/band";
import { EXAMS_WITH_FREE_LABS } from "@/lib/seo/cert-pages";
import { COMPTIA_URLS, EXAM_FACTS_CHECKED } from "@/lib/seo/exam-versions";
import { pageMetadata } from "@/lib/seo/metadata";
import { ABOUT_PAGES_UPDATED_ISO } from "@/lib/seo/page-dates";

export const metadata = pageMetadata({
  title: "How CertBench is made",
  description:
    "Where CertBench's CompTIA practice questions come from, how they are checked, how the readiness score is calculated, and what CertBench cannot tell you.",
  path: "/about",
});

const FULL = REHEARSAL_FORMATS.full;

function Source({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="cb-link">
      {children}
    </a>
  );
}

export default function AboutPage() {
  return (
    // The page ends on the navy band, which stands on the footer.
    <LanderPage className="pb-0">
      <ArticleBody>
        <ArticleHero eyebrow="About CertBench" title="How CertBench is made">
          <p>
            CertBench is an independent study program for the CompTIA Security+, Network+ and A+ exams. This page
            explains where its questions come from, how they are checked, how its score is calculated, and what it
            cannot tell you.
          </p>
        </ArticleHero>

        <ArticleSection title="Where the questions come from">
          <dl className="border-t border-border">
            <ArticleRow term="Written for CertBench">
              <p>
                Every question is written for CertBench against the exam objectives that CompTIA publishes.{" "}
                <strong>No question is taken from a real exam</strong>, and none is copied from another question bank.
                CompTIA&apos;s policy prohibits the use of real exam questions, and CertBench does not use or offer
                them.
              </p>
            </ArticleRow>
            <ArticleRow term="Linked to an objective">
              <p>
                Each question is linked to the exam objective that it tests, so an incorrect answer shows you which
                objective to study again. For Security+ and A+ the objective numbers are CompTIA&apos;s own.{" "}
                <strong>Network+ is the exception.</strong> Its questions are grouped into topics whose numbering is
                not CompTIA&apos;s, so the Network+ pages name the topic and do not cite an objective number.
              </p>
            </ArticleRow>
            <ArticleRow term="Explained">
              <p>
                Every question has an explanation of why the correct answer is correct. A short version is shown as
                soon as you answer.
              </p>
            </ArticleRow>
          </dl>
        </ArticleSection>

        <ArticleSection title="How the questions are checked">
          <dl className="border-t border-border">
            <ArticleRow term="Against CompTIA's published information">
              <p>
                Exam versions, domain weights and retirement dates are taken from CompTIA&apos;s own exam pages. All
                five were read on <strong>{EXAM_FACTS_CHECKED}</strong>:{" "}
                <Source href={COMPTIA_URLS.securityV7}>Security+ SY0-701</Source>,{" "}
                <Source href={COMPTIA_URLS.securityV8}>Security+ SY0-801</Source>,{" "}
                <Source href={COMPTIA_URLS.networkPlus}>Network+ N10-009</Source>,{" "}
                <Source href={COMPTIA_URLS.aPlusCore1}>A+ Core 1</Source> and{" "}
                <Source href={COMPTIA_URLS.aPlusCore2}>A+ Core 2</Source>.
              </p>
            </ArticleRow>
            <ArticleRow term="By automated checks">
              <p>
                The newest question sets, which were written for Security+ SY0-801, must pass a set of automated
                checks before they are published. Each question must have four distinct options and an explanation,
                and must not use &ldquo;all of the above&rdquo;. Across a set, the correct answers must be spread
                evenly from A to D, the correct answer must not be identifiable as the longest option, and no question
                may be repeated.
              </p>
            </ArticleRow>
            <ArticleRow term="By the people who use it">
              <p>
                If you believe that a question is wrong, please write to{" "}
                <a href="mailto:support@certbench.dev" className="cb-link">
                  support@certbench.dev
                </a>
                . Every report is read by a person, and a question that is wrong is corrected or withdrawn.
              </p>
            </ArticleRow>
          </dl>
        </ArticleSection>

        <ArticleSection title="How the score is calculated">
          <dl className="border-t border-border">
            <ArticleRow term="What it measures">
              <p>
                The score is the share of exam-style questions that you answered correctly, weighted by the share of
                the exam that each domain makes up. Short recall questions do not count toward it. A question left
                unanswered counts as incorrect, as it does in the exam.
              </p>
            </ArticleRow>
            <ArticleRow term="Why it is not a score out of 900">
              <p>
                CompTIA scores its exams on a scale of 100 to 900 and does not publish how that scale is calculated.
                No practice test can give you a true scaled score, so CertBench does not show one.
              </p>
            </ArticleRow>
            <ArticleRow term={`The readiness target of ${READINESS_TARGET}%`}>
              <p>
                CertBench sets a readiness target of {READINESS_TARGET}% and shows every score against it. The target
                is a guide and not a guarantee. Your first result comes from a checkpoint of {CHECKPOINT_SIZE}{" "}
                questions, in which one answer changes the score by about {Math.round(100 / CHECKPOINT_SIZE)} points. A
                full practice exam of {FULL.questions} questions in {FULL.minutes} minutes gives a more reliable
                result.
              </p>
            </ArticleRow>
          </dl>
        </ArticleSection>

        <ArticleSection title="What CertBench is not">
          <dl className="border-t border-border">
            <ArticleRow term="Not CompTIA">
              <p>
                CertBench is not affiliated with, endorsed by or sponsored by CompTIA. CompTIA, Security+, Network+ and
                A+ are trademarks of CompTIA and are used here only to identify the exams.
              </p>
            </ArticleRow>
            <ArticleRow term="Not a course">
              <p>
                CertBench teaches through questions and hands-on labs. It has no video lessons or textbook chapters,
                so it works best alongside a course or a textbook.
              </p>
            </ArticleRow>
            <ArticleRow term="Not a guarantee of a pass">
              <p>
                No study tool can guarantee that you will pass. The Pro guarantee is a refund. {PASS_GUARANTEE_TERMS}{" "}
                <Link href={PASS_GUARANTEE_HREF} className="cb-link">
                  Read the terms
                </Link>
                .
              </p>
            </ArticleRow>
          </dl>
        </ArticleSection>

        <ArticleSection title="Who operates CertBench, and what it costs">
          <dl className="border-t border-border">
            <ArticleRow term="Who operates it">
              <p>
                CertBench is a small, independent product. The person who builds it also answers the support email, at{" "}
                <a href="mailto:support@certbench.dev" className="cb-link">
                  support@certbench.dev
                </a>
                .
              </p>
            </ArticleRow>
            <ArticleRow term="What it costs">
              {/* The price is stated here and not only on the pricing page: this
                  is one of the pages a careful reader is sent to. */}
              <p>
                The beginning of every study path is free. A free account also includes one full-length practice exam
                for each exam, and {FREE_LAB_COUNT} hands-on labs for each of {keepCodes(EXAMS_WITH_FREE_LABS)}. Pro
                opens the remainder. {PRO_PRICE_TERMS} The{" "}
                <Link href="/pricing" className="cb-link">
                  pricing page
                </Link>{" "}
                lists what each plan includes. Payment is handled by Stripe, and you can cancel from your billing page
                at any time.
              </p>
            </ArticleRow>
            <ArticleRow term="Colleges and training providers">
              <p>
                Instructors who teach CompTIA courses can read the{" "}
                <Link href="/educators" className="cb-link">
                  information for educators
                </Link>
                .
              </p>
            </ArticleRow>
          </dl>
        </ArticleSection>

        {/* The day these words last changed, kept beside the sitemap's date for this page. */}
        <p className="text-note text-muted-foreground">
          This page was last updated on {longDate(ABOUT_PAGES_UPDATED_ISO)}.
        </p>
      </ArticleBody>

      <CtaBand title="Try the questions">
        <p className="cb-measure text-body text-muted-foreground">
          The most direct way to assess a question bank is to answer some of its questions. The first questions do not
          require an account.
        </p>
        <Button asChild size="lg" className="mt-1">
          <Link href="/start">
            Choose your exam
            <LinkArrow />
          </Link>
        </Button>
      </CtaBand>
    </LanderPage>
  );
}
