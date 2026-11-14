import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { Footer } from "@/components/marketing/Footer";
import { FaqSection } from "@/components/marketing/FaqSection";
import { RelatedLinks } from "@/components/marketing/RelatedLinks";
import { JsonLd } from "@/components/seo/JsonLd";
import { Button } from "@/components/ui/button";
import {
  COMPTIA_URLS,
  EXAM_FACTS_CHECKED,
  SECURITY_PLUS_CERT,
  SECURITY_PLUS_VERSIONS_PATH,
  SY0_801_AI_PATH,
  SY0_801_PATH,
  SY0_801_PRACTICE_PATH,
  SY0_801_PUBLISHED_ISO,
  SY0_801_UPDATED_ISO,
} from "@/lib/seo/exam-versions";
import { SY0_701_OBJECTIVES_PER_DOMAIN, SY0_801_AI_TOPICS, SY0_801_DOMAINS } from "@/data/security-plus-v8";
import { SY0_801_PRACTICE_TEST } from "@/data/security-plus-v8-practice-test";
import { pageMetadata } from "@/lib/seo/metadata";
import { articleData } from "@/lib/seo/structured-data";

const TITLE = "Security+ SY0-801: Exam Objectives, Domains and Launch Date";
const DESCRIPTION =
  "CompTIA Security+ SY0-801 (V8) launches on or around November 17, 2026. Its five domains and weights, all 27 objectives, the new AI objective, and how to prepare now.";

export const metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: SY0_801_PATH,
});

const OBJECTIVE_COUNT = SY0_801_DOMAINS.reduce((n, d) => n + d.objectives.length, 0);

const AT_A_GLANCE = [
  { label: "Exam code", value: "SY0-801 (Security+ V8)" },
  { label: "Launch", value: "On or around November 17, 2026" },
  { label: "Questions", value: "Up to 90, multiple-choice and performance-based" },
  { label: "Time", value: "90 minutes" },
  { label: "Passing score", value: "750 on a scale of 100 to 900" },
  { label: "Recommended experience", value: "Two years of hands-on security administration" },
  { label: "Retires", value: "Estimated three years after launch" },
  { label: "SY0-701 until", value: "June 11, 2027 in English" },
];

const FAQS = [
  {
    question: "When does Security+ SY0-801 launch?",
    answer:
      "CompTIA lists SY0-801 as launching on or around November 17, 2026. The current exam, SY0-701, stays open until June 11, 2027 in English, so both can be booked for several months.",
  },
  {
    question: "How many objectives does SY0-801 have?",
    answer: `${OBJECTIVE_COUNT}, in five domains: general security concepts (16% of the exam), threats, vulnerabilities and attacks (24%), security architecture (19%), security operations (27%), and security program management and oversight (14%). SY0-701 has 28.`,
  },
  {
    question: "What's the new AI objective on SY0-801?",
    answer:
      "Objective 2.6 covers threats and vulnerabilities that come with using AI. It lists model manipulation, poisoning, prompt injection, data loss, bias, explainability, hallucinations, jailbreaking, evasion, privacy, ethical considerations, session hijacking and code execution. No SY0-701 material covers it.",
  },
  {
    question: "How many questions are on SY0-801, and what's the passing score?",
    answer:
      "Up to 90 questions, a mix of multiple-choice and performance-based, in 90 minutes. The passing score is 750 on a scale of 100 to 900, the same as SY0-701.",
  },
  {
    question: "Where can I get the official SY0-801 objectives?",
    answer:
      "From CompTIA's Security+ V8 exam page, which links the full exam objectives document. The objective names on this page are our own short labels; CompTIA's document has the official wording and every sub-topic.",
  },
  {
    question: "Should I take SY0-801 or SY0-701?",
    answer:
      "If you can sit the exam by June 11, 2027 with room for a retake, SY0-701 has more study material behind it, and both lead to the same certification. If your date falls after that, or you're starting from scratch with no date, plan for SY0-801.",
  },
];

export default function SecurityPlusV8Page() {
  return (
    <div className="flex min-h-svh flex-col aurora-bg text-foreground">
      <JsonLd
        data={articleData({
          headline: TITLE,
          description: DESCRIPTION,
          path: SY0_801_PATH,
          published: SY0_801_PUBLISHED_ISO,
          modified: SY0_801_UPDATED_ISO,
        })}
      />
      <MarketingHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12 sm:py-16">
        <p className="font-mono text-xs text-muted-foreground">
          CompTIA Security+ V8 · Checked against CompTIA&apos;s exam objectives on {EXAM_FACTS_CHECKED}
        </p>
        <h1 className="mt-1 text-balance font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Security+ <span className="whitespace-nowrap">SY0-801</span>: the exam, its domains and all{" "}
          {OBJECTIVE_COUNT} objectives
        </h1>

        <div className="mt-4 grid gap-3 leading-relaxed text-muted-foreground">
          <p>
            <strong className="font-medium text-foreground">
              SY0-801 is the next Security+ exam, launching on or around November 17, 2026.
            </strong>{" "}
            It keeps SY0-701&apos;s format and passing score, regroups its objectives into{" "}
            {OBJECTIVE_COUNT}, and adds one on the threats and vulnerabilities of AI.
          </p>
          <p>
            Everything here comes from CompTIA&apos;s{" "}
            <a
              href={COMPTIA_URLS.securityV8}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-4"
            >
              Security+ V8 page
            </a>{" "}
            and the exam objectives document it links. The objective names are our own short labels;
            CompTIA&apos;s document has the official wording.
          </p>
        </div>

        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">At a glance</h2>
          <div className="mt-4 overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <tbody>
                {AT_A_GLANCE.map((row) => (
                  <tr key={row.label} className="border-b last:border-0">
                    <th scope="row" className="w-2/5 px-3 py-2.5 text-left align-top font-medium sm:px-4">
                      {row.label}
                    </th>
                    <td className="px-3 py-2.5 align-top text-muted-foreground sm:px-4">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">Domains and objectives</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Each domain&apos;s share of the exam, and what it covers.
          </p>
          <div className="mt-5 grid gap-6">
            {SY0_801_DOMAINS.map((d) => (
              <div key={d.number} className="rounded-xl border bg-card p-4 sm:p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="min-w-0 font-semibold leading-snug">
                    <span className="mr-1.5 font-mono text-xs text-muted-foreground">{d.number}</span>{" "}
                    {d.title}
                  </h3>
                  <span className="shrink-0 font-mono text-sm tabular-nums">{d.weight}%</span>
                </div>
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(d.weight / 27) * 100}%` }} />
                </div>
                <ul className="mt-4 grid gap-1.5 text-sm">
                  {d.objectives.map((o) => (
                    <li key={o.code} className="flex items-baseline gap-2.5">
                      <span className="w-7 shrink-0 font-mono text-xs text-muted-foreground">{o.code}</span>
                      <span className="min-w-0 leading-relaxed">
                        {o.label}
                        {o.isNew && (
                          <span className="ml-2 inline-flex rounded-full bg-primary/10 px-2 py-0.5 align-middle font-mono text-[10px] font-medium uppercase tracking-wider text-primary">
                            New
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">What changed from SY0-701</h2>
          <ul className="mt-4 grid list-disc gap-2.5 pl-5 leading-relaxed text-muted-foreground">
            <li>
              <strong className="font-medium text-foreground">A new AI objective, 2.6.</strong> It covers
              the threats and vulnerabilities of using AI, which Security+ hasn&apos;t had an objective for
              before.
            </li>
            <li>
              <strong className="font-medium text-foreground">
                {OBJECTIVE_COUNT} objectives instead of{" "}
                {SY0_701_OBJECTIVES_PER_DOMAIN.reduce((a, b) => a + b, 0)}.
              </strong>{" "}
              General security concepts goes from {SY0_701_OBJECTIVES_PER_DOMAIN[0]} objectives to{" "}
              {SY0_801_DOMAINS[0].objectives.length}, with security controls and core concepts now one
              objective. Security operations goes from {SY0_701_OBJECTIVES_PER_DOMAIN[3]} to{" "}
              {SY0_801_DOMAINS[3].objectives.length}.
            </li>
            <li>
              <strong className="font-medium text-foreground">Mitigation moves to security operations.</strong>{" "}
              Domain 2 is now &ldquo;Threats, Vulnerabilities, and Attacks&rdquo;, and applying mitigating
              controls opens domain 4.
            </li>
            <li>
              <strong className="font-medium text-foreground">New weights.</strong> General security
              concepts rises from 12% to 16%, and security program management falls from 20% to 14%.
            </li>
          </ul>
          <p className="mt-3 text-sm text-muted-foreground">
            Deciding between the two?{" "}
            <Link href={SECURITY_PLUS_VERSIONS_PATH} className="text-primary underline underline-offset-4">
              SY0-801 vs SY0-701: which to take
            </Link>
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">The new AI objective</h2>
          <p className="mt-2 leading-relaxed text-muted-foreground">
            Objective 2.6 names {SY0_801_AI_TOPICS.length} topics. Here&apos;s each one in a line.
          </p>
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
          <h2 className="text-xl font-semibold tracking-tight">Take the free SY0-801 practice test</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            {SY0_801_PRACTICE_TEST.length} questions across all {OBJECTIVE_COUNT} objectives in the exam&apos;s
            weights, timed, with a score by domain and every answer explained. No account needed.
          </p>
          <Button asChild size="lg" className="mt-1">
            <Link href={SY0_801_PRACTICE_PATH}>
              Take the practice test
              <ArrowRight />
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground">
            Only after the new AI objective?{" "}
            <Link href={SY0_801_AI_PATH} className="underline underline-offset-4 hover:text-foreground">
              Try the AI questions
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
              href: SECURITY_PLUS_VERSIONS_PATH,
              label: "SY0-801 vs SY0-701",
              note: "Which version to take, by exam date",
            },
            {
              href: SY0_801_AI_PATH,
              label: "SY0-801 AI practice questions",
              note: "Free questions on objective 2.6",
            },
            {
              href: `/objectives/${SECURITY_PLUS_CERT}`,
              label: "SY0-701 exam objectives",
              note: "Every SY0-701 objective, with practice for each one",
            },
            {
              href: "/security-plus-pbq-examples",
              label: "Security+ PBQ examples",
              note: "Interactive performance-based questions",
            },
          ]}
        />

        <FaqSection faqs={FAQS} />

        <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
          Sources: CompTIA&apos;s{" "}
          <a href={COMPTIA_URLS.securityV8} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
            Security+ V8 exam page
          </a>{" "}
          and its SY0-801 exam objectives (document version 2.0), and the{" "}
          <a href={COMPTIA_URLS.securityV7} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
            Security+ V7 page
          </a>{" "}
          for SY0-701&apos;s dates.
        </p>
      </main>
      <Footer />
    </div>
  );
}
