import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { Footer } from "@/components/marketing/Footer";
import { FaqSection } from "@/components/marketing/FaqSection";
import { RelatedLinks } from "@/components/marketing/RelatedLinks";
import { SampleQuestion } from "@/components/marketing/SampleQuestion";
import { JsonLd } from "@/components/seo/JsonLd";
import { Button } from "@/components/ui/button";
import {
  COMPTIA_URLS,
  SECURITY_PLUS_CERT,
  SECURITY_PLUS_VERSIONS_PATH,
  SY0_801_AI_PATH,
  SY0_801_PATH,
  SY0_801_PRACTICE_PATH,
  SY0_801_PUBLISHED_ISO,
  SY0_801_UPDATED_ISO,
} from "@/lib/seo/exam-versions";
import { SY0_801_AI_QUESTIONS, SY0_801_AI_TOPICS } from "@/data/security-plus-v8";
import { SY0_801_PRACTICE_TEST } from "@/data/security-plus-v8-practice-test";
import { pageMetadata } from "@/lib/seo/metadata";
import { articleData } from "@/lib/seo/structured-data";

const TITLE = "SY0-801 Practice Questions: AI Threats (Objective 2.6)";
const DESCRIPTION = `${SY0_801_AI_QUESTIONS.length} free, original Security+ SY0-801 practice questions on the new AI objective: prompt injection, poisoning, jailbreaking, hallucinations and more, each with the answer explained.`;

export const metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: SY0_801_AI_PATH,
});

const FAQS = [
  {
    question: "Is AI on the Security+ exam?",
    answer:
      "On SY0-801, yes. Objective 2.6 covers threats and vulnerabilities that come with using AI, and AI also appears in the automation objective. SY0-701, the exam before it, has no AI objective.",
  },
  {
    question: "What's the difference between prompt injection and jailbreaking?",
    answer:
      "Prompt injection is input that overrides the instructions an AI was given, and it can be hidden in content the AI reads, like an email or web page. Jailbreaking is prompting meant to get around a model's safety rules so it produces what it should refuse. A jailbreak is often done through prompt injection, but the goal differs: one hijacks the task, the other breaks the guardrails.",
  },
  {
    question: "What's the difference between poisoning and evasion?",
    answer:
      "Timing. Poisoning corrupts the data a model learns from, so the damage is built in before the model is used. Evasion leaves the model alone and crafts the input at use time, such as malware tweaked until a detector calls it clean.",
  },
  {
    question: "Are these real exam questions?",
    answer:
      "No. They're original questions written by CertBench to practise the topics CompTIA lists for objective 2.6. CompTIA's exam questions are confidential, and using leaked ones breaks its exam policies.",
  },
];

export default function Sy0801AiQuestionsPage() {
  return (
    <div className="flex min-h-svh flex-col aurora-bg text-foreground">
      <JsonLd
        data={articleData({
          headline: TITLE,
          description: DESCRIPTION,
          path: SY0_801_AI_PATH,
          published: SY0_801_PUBLISHED_ISO,
          modified: SY0_801_UPDATED_ISO,
        })}
      />
      <MarketingHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12 sm:py-16">
        <p className="font-mono text-xs text-muted-foreground">CompTIA Security+ SY0-801 · Objective 2.6</p>
        <h1 className="mt-1 text-balance font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          SY0-801 practice questions: AI threats and vulnerabilities
        </h1>

        <div className="mt-4 grid gap-3 leading-relaxed text-muted-foreground">
          <p>
            <strong className="font-medium text-foreground">
              SY0-801 adds an objective Security+ has never had: 2.6, on the threats and vulnerabilities of
              using AI.
            </strong>{" "}
            No SY0-701 course or practice test covers it, so here are {SY0_801_AI_QUESTIONS.length} questions
            that do, at least one for every topic CompTIA lists.
          </p>
          <p>
            Pick an answer to see whether it&apos;s right and why. They&apos;re original questions written
            by CertBench, not taken from the exam.
          </p>
        </div>

        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">The questions</h2>
          <div className="mt-4 grid gap-4">
            {SY0_801_AI_QUESTIONS.map((q, i) => (
              <SampleQuestion key={q.questionText} number={i + 1} question={q} />
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">The {SY0_801_AI_TOPICS.length} topics in one line each</h2>
          <dl className="mt-4 grid gap-2.5">
            {SY0_801_AI_TOPICS.map((t) => (
              <div key={t.term} className="rounded-lg border bg-card px-4 py-3 text-sm">
                <dt className="font-medium">{t.term}</dt>
                <dd className="mt-0.5 leading-relaxed text-muted-foreground">{t.gist}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-10 grid justify-items-center gap-3 rounded-xl border bg-muted/40 px-6 py-10 text-center">
          <h2 className="text-xl font-semibold tracking-tight">Now try the whole exam</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            A free {SY0_801_PRACTICE_TEST.length}-question SY0-801 practice test across all 27 objectives, timed,
            with a score by domain.
          </p>
          <Button asChild size="lg" className="mt-1">
            <Link href={SY0_801_PRACTICE_PATH}>
              SY0-801 practice test
              <ArrowRight />
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground">
            Want the outline first?{" "}
            <Link href={SY0_801_PATH} className="underline underline-offset-4 hover:text-foreground">
              SY0-801 exam objectives
            </Link>
          </p>
          <p className="text-xs text-muted-foreground">
            Taking SY0-701 instead?{" "}
            <Link href={`/path/${SECURITY_PLUS_CERT}`} className="underline underline-offset-4 hover:text-foreground">
              Start your Security+ path
            </Link>
          </p>
        </section>

        <RelatedLinks
          links={[
            {
              href: SY0_801_PRACTICE_PATH,
              label: "SY0-801 practice test",
              note: "A free timed test across every objective",
            },
            {
              href: SY0_801_PATH,
              label: "SY0-801 exam objectives",
              note: "The exam, its five domains and all 27 objectives",
            },
            {
              href: SECURITY_PLUS_VERSIONS_PATH,
              label: "SY0-801 vs SY0-701",
              note: "Which version to take, by exam date",
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
          Topics from objective 2.6 in CompTIA&apos;s SY0-801 exam objectives, linked from its{" "}
          <a href={COMPTIA_URLS.securityV8} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
            Security+ V8 page
          </a>
          . Questions and explanations by CertBench.
        </p>
      </main>
      <Footer />
    </div>
  );
}
