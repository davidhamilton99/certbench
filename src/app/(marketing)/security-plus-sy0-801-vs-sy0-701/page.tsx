import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { Footer } from "@/components/marketing/Footer";
import { FaqSection } from "@/components/marketing/FaqSection";
import { RelatedLinks } from "@/components/marketing/RelatedLinks";
import { CtaBand } from "@/components/marketing/lander/Article";
import { JsonLd } from "@/components/seo/JsonLd";
import { Button } from "@/components/ui/button";
import {
  COMPTIA_URLS,
  EXAM_FACTS_CHECKED,
  EXAM_FACTS_CHECKED_ISO,
  SECURITY_PLUS_CERT,
  SECURITY_PLUS_DOMAIN_CHANGES,
  SECURITY_PLUS_VERSIONS_PATH,
  SY0_801_AI_PATH,
  SY0_801_CERT,
  SY0_801_PATH,
  SY0_801_PRACTICE_PATH,
} from "@/lib/seo/exam-versions";
import { pageMetadata } from "@/lib/seo/metadata";
import { articleData } from "@/lib/seo/structured-data";

const TITLE = "Security+ SY0-801 vs SY0-701: Which Should You Take?";
const DESCRIPTION =
  "SY0-801 is the Security+ version CompTIA now recommends, and SY0-701 retires June 11, 2027. What changes, what stays the same, and how to pick by exam date.";

export const metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: SECURITY_PLUS_VERSIONS_PATH,
});

const DATES = [
  { label: "Launch", sy0701: "November 7, 2023", sy0801: "On or around November 17, 2026" },
  { label: "Retires (English)", sy0701: "June 11, 2027", sy0801: "Estimated 3 years after launch" },
  {
    label: "Other languages",
    sy0701: "Japanese, Portuguese, Spanish and Thai until August 13, 2027",
    sy0801: "English listed so far",
  },
];

const SAME = [
  "Up to 90 questions, a mix of multiple-choice and performance-based, in 90 minutes.",
  "A passing score of 750 on a scale of 100 to 900.",
  "The certification you earn: CompTIA Security+, good for three years from the day you pass.",
];

const CHOICES = [
  {
    situation: "Already studying, exam in the next few months",
    take: "SY0-701",
    why: "Your notes and practice still apply. Switching objectives now costs more than it gains.",
  },
  {
    situation: "Starting now, can test by spring 2027",
    take: "SY0-701",
    why: "Three years of study material exists for it, and you keep room for a retake before June 11.",
  },
  {
    situation: "Exam date after June 11, 2027",
    take: "SY0-801",
    why: "It's the only English version you'll be able to book.",
  },
  {
    situation: "Testing in Japanese, Portuguese, Spanish or Thai",
    take: "SY0-701",
    why: "It's available until August 13, 2027, and CompTIA lists SY0-801 in English so far.",
  },
];

const FAQS = [
  {
    question: "When did SY0-801 come out?",
    answer:
      "CompTIA scheduled Security+ V8 (SY0-801) for on or around November 17, 2026, and now lists it as the recommended version.",
  },
  {
    question: "When does SY0-701 retire?",
    answer:
      "The English exam retires on June 11, 2027. The Japanese, Portuguese, Spanish and Thai versions retire on August 13, 2027. Until then you can still book SY0-701.",
  },
  {
    question: "Should I take SY0-701 or switch to SY0-801?",
    answer:
      "SY0-701, if you can sit it by June 11, 2027 with room for a retake: both lead to the same certification, and SY0-701 has three years of study material behind it. Take SY0-801 if your exam date falls after that, or you have no date and would rather learn the newest objectives from the start.",
  },
  {
    question: "Will my Security+ expire early now that SY0-801 is out?",
    answer:
      "No. CompTIA says Security+ is good for three years from the date you pass, so a new exam version doesn't shorten a certification you already hold.",
  },
  {
    question: "What's new on SY0-801?",
    answer:
      "The biggest addition is AI: a new objective, 2.6, on the threats and vulnerabilities of AI usage, from prompt injection and poisoning to jailbreaking and hallucinations, plus AI in automation. CompTIA's page also mentions operational technology environments. Domain weights shift too: general security concepts rises from 12% to 16%, and security program management falls from 20% to 14%.",
  },
  {
    question: "Is SY0-801 harder than SY0-701?",
    answer:
      "Nobody can say until people have sat it. The format and the 750 passing score stay the same, so treat confident claims either way as guesses.",
  },
  {
    question: "Does CertBench have SY0-801 questions?",
    answer:
      "Yes. CertBench's SY0-801 path covers all 27 objectives in short stops, the new AI objective (2.6) included, and there are two free sets: a timed SY0-801 practice test across every objective, and questions on 2.6. The SY0-701 path stays for anyone sitting SY0-701, and Pro covers both.",
  },
];

function change(from: number, to: number): string {
  const diff = to - from;
  return diff > 0 ? `+${diff}` : `−${Math.abs(diff)}`;
}

export default function SecurityPlusVersionsPage() {
  return (
    <div className="flex min-h-svh flex-col aurora-bg text-foreground">
      <JsonLd
        data={articleData({
          headline: TITLE,
          description: DESCRIPTION,
          path: SECURITY_PLUS_VERSIONS_PATH,
          published: "2026-11-02",
          modified: EXAM_FACTS_CHECKED_ISO,
        })}
      />
      <MarketingHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-10 pt-12 sm:px-6 sm:pt-20">
        <p className="font-mono text-xs text-muted-foreground">
          CompTIA Security+ · Checked against CompTIA&apos;s pages on {EXAM_FACTS_CHECKED}
        </p>
        <h1 className="mt-4 cb-display text-balance text-[2.35rem] sm:text-[3.5rem]">
          Security+ <span className="whitespace-nowrap">SY0-801</span> vs{" "}
          <span className="whitespace-nowrap">SY0-701</span>: which should you take?
        </h1>

        <div className="mt-6 grid gap-4 text-[17px] leading-relaxed text-muted-foreground sm:mt-8">
          <p>
            <strong className="font-medium text-foreground">
              Take SY0-701 if you can sit it by June 11, 2027 with room for a retake.
            </strong>{" "}
            Both exams lead to the same Security+ certification, and SY0-701 has
            three years of study material behind it.
          </p>
          <p>
            <strong className="font-medium text-foreground">
              Plan for SY0-801 if your exam date falls after that,
            </strong>{" "}
            or if you have no date yet and would rather learn the newest objectives
            from the start.
          </p>
          <p>
            A disclosure: CertBench has a guided path for each version, and Pro covers
            both, so we sell you the same thing whichever you choose. There&apos;s also a
            free{" "}
            <Link href={SY0_801_PRACTICE_PATH} className="text-primary underline underline-offset-4">
              SY0-801 practice test
            </Link>
            . Every date and weight below comes from CompTIA&apos;s own{" "}
            <a
              href={COMPTIA_URLS.securityV7}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-4"
            >
              SY0-701
            </a>{" "}
            and{" "}
            <a
              href={COMPTIA_URLS.securityV8}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-4"
            >
              SY0-801
            </a>{" "}
            pages, so you can check it.
          </p>
        </div>

        <section className="mt-16 sm:mt-20">
          <h2 className="text-2xl font-semibold tracking-[-0.035em] sm:text-[2rem] sm:leading-tight">Key dates</h2>
          <div className="glass mt-5 overflow-x-auto rounded-[1.5rem]">
            <table className="w-full text-[15px]">
              <thead>
                <tr className="border-b border-foreground/[0.08] text-left">
                  <th className="px-3 py-2.5 font-medium sm:px-4">
                    <span className="sr-only">Detail</span>
                  </th>
                  <th className="px-3 py-2.5 font-medium sm:px-4">SY0-701 (V7)</th>
                  <th className="px-3 py-2.5 font-medium sm:px-4">SY0-801 (V8)</th>
                </tr>
              </thead>
              <tbody>
                {DATES.map((row) => (
                  <tr key={row.label} className="border-b border-foreground/[0.06] last:border-0">
                    <td className="px-3 py-2.5 align-top font-medium sm:px-4">{row.label}</td>
                    <td className="px-3 py-2.5 align-top text-muted-foreground sm:px-4">{row.sy0701}</td>
                    <td className="px-3 py-2.5 align-top text-muted-foreground sm:px-4">{row.sy0801}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-16 sm:mt-20">
          <h2 className="text-2xl font-semibold tracking-[-0.035em] sm:text-[2rem] sm:leading-tight">What stays the same</h2>
          <ul className="mt-4 grid list-disc gap-2 pl-5 leading-relaxed text-muted-foreground">
            {SAME.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="mt-16 sm:mt-20">
          <h2 className="text-2xl font-semibold tracking-[-0.035em] sm:text-[2rem] sm:leading-tight">What changes</h2>
          <div className="glass mt-5 overflow-x-auto rounded-[1.5rem]">
            <table className="w-full text-[15px]">
              <thead>
                <tr className="border-b border-foreground/[0.08] text-left">
                  <th className="px-3 py-2.5 font-medium sm:px-4">Domain</th>
                  <th className="whitespace-nowrap px-2 py-2.5 text-right font-mono text-xs font-medium sm:px-4">SY0-701</th>
                  <th className="whitespace-nowrap px-2 py-2.5 text-right font-mono text-xs font-medium sm:px-4">SY0-801</th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-xs font-medium sm:px-4">+/−</th>
                </tr>
              </thead>
              <tbody>
                {SECURITY_PLUS_DOMAIN_CHANGES.map((d) => (
                  <tr key={d.name} className="border-b border-foreground/[0.06] last:border-0">
                    <td className="px-3 py-2.5 sm:px-4">{d.name}</td>
                    <td className="px-2 py-2.5 text-right font-mono text-xs tabular-nums sm:px-4">{d.sy0701}%</td>
                    <td className="px-2 py-2.5 text-right font-mono text-xs tabular-nums sm:px-4">{d.sy0801}%</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums sm:px-4">
                      {change(d.sy0701, d.sy0801)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6 grid gap-4 text-[17px] leading-relaxed text-muted-foreground sm:mt-8">
            <p>
              The largest move is security program management, down six points,
              with general security concepts up four. SY0-801 also adds a new
              objective, 2.6, on the threats and vulnerabilities of AI usage, and
              CompTIA&apos;s page mentions AI-assisted automation and operational
              technology environments.{" "}
              <Link href={SY0_801_PATH} className="text-primary underline underline-offset-4">
                See all 27 SY0-801 objectives
              </Link>
              , or{" "}
              <Link href={SY0_801_AI_PATH} className="text-primary underline underline-offset-4">
                practise the new AI objective
              </Link>
              .
            </p>
            <p>
              The recommended experience changes as well. SY0-701 recommends
              Network+ and two years in a security or systems administrator role;
              SY0-801 recommends two years of hands-on security administration.
              Neither is a requirement to book the exam.
            </p>
          </div>
        </section>

        <section className="mt-16 sm:mt-20">
          <h2 className="text-2xl font-semibold tracking-[-0.035em] sm:text-[2rem] sm:leading-tight">How to choose</h2>
          <div className="mt-4 grid gap-1.5">
            {CHOICES.map((c) => (
              <div key={c.situation} className="glass rounded-2xl px-5 py-4 text-[15px]">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="font-medium">{c.situation}</span>
                  <span className="font-mono text-xs text-primary">{c.take}</span>
                </div>
                <p className="mt-1 leading-relaxed text-muted-foreground">{c.why}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            If an employer or course names a version, take that one.
          </p>
        </section>

        <CtaBand title="Start the path for your version">
          <p className="max-w-md text-balance text-[15px] leading-relaxed text-muted-foreground">
            Each version has its own path: every objective in short stops, and a readiness checkpoint
            that shows where you stand.
          </p>
          <div className="mt-1 flex flex-wrap justify-center gap-2.5">
            <Button asChild size="lg">
              <Link href={`/path/${SY0_801_CERT}`}>
                Start my SY0-801 path
                <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href={`/path/${SECURITY_PLUS_CERT}`}>Start my SY0-701 path</Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">No account needed to start.</p>
        </CtaBand>

        <RelatedLinks
          links={[
            {
              href: SY0_801_PRACTICE_PATH,
              label: "SY0-801 practice test",
              note: "A free timed SY0-801 exam, scored by domain",
            },
            {
              href: SY0_801_PATH,
              label: "SY0-801 exam objectives",
              note: "The exam, its five domains and all 27 objectives",
            },
            {
              href: SY0_801_AI_PATH,
              label: "SY0-801 AI practice questions",
              note: "Free questions on the new AI objective, 2.6",
            },
            {
              href: "/security-plus-practice-test",
              label: "Security+ practice test",
              note: "A free full-length SY0-701 exam: 90 questions, 90 minutes",
            },
            {
              href: `/objectives/${SECURITY_PLUS_CERT}`,
              label: "SY0-701 exam objectives",
              note: "Every objective by domain, with practice for each one",
            },
            {
              href: "/security-plus-pbq-examples",
              label: "Security+ PBQ examples",
              note: "12 free interactive PBQs, 3 with no account",
            },
          ]}
        />

        <FaqSection faqs={FAQS} />

        <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
          Sources: CompTIA&apos;s{" "}
          <a href={COMPTIA_URLS.securityV7} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
            Security+ V7
          </a>{" "}
          and{" "}
          <a href={COMPTIA_URLS.securityV8} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
            V8
          </a>{" "}
          exam pages, and its note on{" "}
          <a href={COMPTIA_URLS.securityValidity} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
            how long Security+ lasts
          </a>
          .
        </p>
      </main>
      <Footer />
    </div>
  );
}
