import Link from "next/link";
import { FaqSection } from "@/components/marketing/FaqSection";
import { RelatedLinks } from "@/components/marketing/RelatedLinks";
import { LanderBlock, LanderPage } from "@/components/marketing/lander/Lander";
import { ArticleBody, ArticleHero, ArticleSection, CtaBand } from "@/components/marketing/lander/Article";
import { JsonLd } from "@/components/seo/JsonLd";
import { Button } from "@/components/ui/button";
import { LinkArrow } from "@/components/ui/link-arrow";
import { keepCodes } from "@/lib/keep-codes";
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

const TITLE = "Security+ SY0-801 vs SY0-701: which should you take?";
const DESCRIPTION =
  "SY0-801 is the Security+ version that CompTIA now recommends, and SY0-701 retires on June 11, 2027. This page sets out what changes, what stays the same, and how to choose by exam date.";

export const metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: SECURITY_PLUS_VERSIONS_PATH,
});

const DATES = [
  { label: "Launch", sy0701: "November 7, 2023", sy0801: "November 17, 2026" },
  { label: "Retirement (English)", sy0701: "June 11, 2027", sy0801: "Estimated three years after launch" },
  {
    label: "Other languages",
    sy0701: "Japanese, Portuguese, Spanish and Thai until August 13, 2027",
    sy0801: "Offered in English only so far",
  },
];

const SAME = [
  "Up to 90 questions, a mix of multiple-choice and performance-based, in 90 minutes.",
  "A passing score of 750 on a scale of 100 to 900.",
  "The certification: CompTIA lists both exams as versions of Security+, and a Security+ certification is valid for three years from the day that you pass.",
];

const CHOICES = [
  {
    situation: "You are already studying, and your exam is in the next few months",
    take: "SY0-701",
    why: "Your notes and practice still apply. Switching objectives now costs more than it gains.",
  },
  {
    situation: "You are starting now, and you can take the exam by spring 2027",
    take: "SY0-701",
    why: "Three years of study material exists for it, and you keep time for a retake before June 11.",
  },
  {
    situation: "Your exam date is after June 11, 2027",
    take: "SY0-801",
    why: "It is the only English version you will be able to book.",
  },
  {
    situation: "You are taking the exam in Japanese, Portuguese, Spanish or Thai",
    take: "SY0-701",
    why: "It is available until August 13, 2027, and CompTIA offers SY0-801 in English only so far.",
  },
];

const FAQS = [
  {
    question: "When did SY0-801 come out?",
    answer:
      "CompTIA launched Security+ V8 (SY0-801) on November 17, 2026, and its Security+ page calls V8 the recommended version.",
  },
  {
    question: "When does SY0-701 retire?",
    answer:
      "The English exam retires on June 11, 2027. The Japanese, Portuguese, Spanish and Thai versions retire on August 13, 2027. Until then you can still book SY0-701.",
  },
  {
    question: "Should I take SY0-701 or switch to SY0-801?",
    answer:
      "Take SY0-701 if you can take it by June 11, 2027, with time for a retake. CompTIA lists both exams as versions of Security+, and SY0-701 has three years of study material behind it. Take SY0-801 if your exam date falls after that, or if you have no date and would rather learn the newest objectives from the start.",
  },
  {
    question: "Will my Security+ expire early now that SY0-801 is out?",
    answer:
      "No. CompTIA states that Security+ is valid for three years from the date on which you pass, so a new exam version does not shorten a certification you already hold.",
  },
  {
    question: "What is new on SY0-801?",
    answer:
      "The largest addition is AI. A new objective, 2.6, covers the threats and vulnerabilities of AI usage, from prompt injection and poisoning to jailbreaking and hallucinations, and AI also appears in the automation objective. CompTIA's page also mentions operational technology environments. The domain weights change as well: general security concepts rises from 12% to 16%, and security program management falls from 20% to 14%.",
  },
  {
    question: "Is SY0-801 harder than SY0-701?",
    answer:
      "It is too early to say. The format and the passing score of 750 are unchanged, so confident claims in either direction should be treated as guesses.",
  },
  {
    question: "Does CertBench have SY0-801 questions?",
    answer:
      "Yes. CertBench's SY0-801 study path covers all 27 objectives in short steps, the new AI objective (2.6) included, and there are two free sets: a timed SY0-801 practice exam in the exam's domain weights, and questions on 2.6. The SY0-701 study path remains for anyone who is taking SY0-701, and Pro covers both.",
  },
];

/** The change in a domain's share, in percentage points: "+4", "−6" (a minus sign, not a hyphen) or "0". */
function change(from: number, to: number): string {
  const diff = to - from;
  return diff > 0 ? `+${diff}` : diff < 0 ? `−${-diff}` : "0";
}

/** The unit that a screen reader hears after the change: "+1 percentage point", "−6 percentage points". */
function points(from: number, to: number): string {
  return Math.abs(to - from) === 1 ? " percentage point" : " percentage points";
}

// On a phone each row of a table stacks: the row's heading, then each cell
// under its own label, which is taken from the column's heading.
const CELL_LAYOUT =
  "py-3 pr-6 align-top last:pr-0 max-sm:block max-sm:p-0 max-sm:before:block max-sm:before:text-note max-sm:before:font-medium max-sm:before:text-muted-foreground max-sm:before:content-[attr(data-label)]";
const CELL = `${CELL_LAYOUT} text-muted-foreground`;
/** The answer in a row (which version to take) is set in ink and not in the quiet colour. */
const ANSWER_CELL = `${CELL_LAYOUT} font-semibold`;
const ROW = "border-b border-border max-sm:grid max-sm:gap-2 max-sm:py-4";
const ROW_HEAD = "py-3 pr-6 align-top font-semibold max-sm:block max-sm:p-0";
const TABLE = "w-full border-collapse text-left text-small max-sm:block";
const HEAD_ROW = "border-y border-foreground/70 text-note text-muted-foreground";
const BODY = "max-sm:block max-sm:border-t max-sm:border-foreground/70";

export default function SecurityPlusVersionsPage() {
  return (
    <LanderPage>
      <JsonLd
        data={articleData({
          headline: TITLE,
          description: DESCRIPTION,
          path: SECURITY_PLUS_VERSIONS_PATH,
          published: "2026-11-02",
          modified: EXAM_FACTS_CHECKED_ISO,
        })}
      />
      <ArticleBody>
        <ArticleHero eyebrow="CompTIA Security+" title="Security+ SY0-801 vs SY0-701: which should you take?">
          <p>
            <strong>Choose SY0-701 if you can take it by June 11, 2027, with time for a retake.</strong> CompTIA lists
            both exams as versions of Security+, and SY0-701 has three years of study material behind it.
          </p>
          <p>
            <strong>Plan for SY0-801 if your exam date falls after that,</strong> or if you have no date yet and would
            rather learn the newest objectives from the start.
          </p>
          <p>
            A disclosure: CertBench has a study path for each version, and Pro covers both, so the choice makes no
            difference to what CertBench sells you. There is also a free{" "}
            <Link href={SY0_801_PRACTICE_PATH} className="cb-link">
              SY0-801 practice exam
            </Link>
            . Every date and weight on this page comes from CompTIA&apos;s own{" "}
            <a href={COMPTIA_URLS.securityV7} target="_blank" rel="noopener noreferrer" className="cb-link">
              SY0-701
            </a>{" "}
            and{" "}
            <a href={COMPTIA_URLS.securityV8} target="_blank" rel="noopener noreferrer" className="cb-link">
              SY0-801
            </a>{" "}
            pages, which were last checked on {EXAM_FACTS_CHECKED}.
          </p>
        </ArticleHero>

        <ArticleSection title="Key dates">
          <table className={TABLE}>
            <thead className="max-sm:sr-only">
              <tr className={HEAD_ROW}>
                <th scope="col" className="w-[26%] py-2.5 pr-6 font-medium">
                  Date
                </th>
                <th scope="col" className="w-[37%] py-2.5 pr-6 font-medium">
                  SY0-701 (V7)
                </th>
                <th scope="col" className="py-2.5 font-medium">
                  SY0-801 (V8)
                </th>
              </tr>
            </thead>
            <tbody className={BODY}>
              {DATES.map((row) => (
                <tr key={row.label} className={ROW}>
                  <th scope="row" className={ROW_HEAD}>
                    {row.label}
                  </th>
                  <td data-label="SY0-701 (V7)" className={CELL}>
                    {row.sy0701}
                  </td>
                  <td data-label="SY0-801 (V8)" className={CELL}>
                    {row.sy0801}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ArticleSection>

        <ArticleSection title="What stays the same">
          <ul className="cb-measure grid list-disc gap-2.5 pl-5 text-body text-muted-foreground">
            {SAME.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </ArticleSection>

        <ArticleSection title="What changes">
          {/*
            Four short columns: the table stays a table on a phone. Below the sm
            width its cells are set closer, and a domain's name may break inside
            a word where nothing else would fit, so that the whole table, the
            change included, fits a screen 320 pixels wide with room to spare.
            At that width no word needs to break. Should the table ever be wider
            than its box (with larger text), it scrolls inside the box and is
            not cut off.
          */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-small">
              <caption className="sr-only">The share of the exam for each domain, in SY0-701 and in SY0-801</caption>
              <thead>
                <tr className={HEAD_ROW}>
                  <th scope="col" className="py-2.5 pr-2 font-medium sm:pr-4">
                    Domain
                  </th>
                  <th scope="col" className="w-px whitespace-nowrap py-2.5 pl-2 text-right font-medium sm:pl-4">
                    SY0-701
                  </th>
                  <th scope="col" className="w-px whitespace-nowrap py-2.5 pl-2 text-right font-medium sm:pl-4">
                    SY0-801
                  </th>
                  <th scope="col" className="w-px whitespace-nowrap py-2.5 pl-2 text-right font-medium sm:pl-4">
                    Change
                  </th>
                </tr>
              </thead>
              <tbody>
                {SECURITY_PLUS_DOMAIN_CHANGES.map((d) => (
                  <tr key={d.name} className="border-b border-border">
                    <th scope="row" className="py-3 pr-2 align-top font-normal max-sm:[overflow-wrap:anywhere] sm:pr-4">
                      {keepCodes(d.name)}
                    </th>
                    <td className="py-3 pl-2 text-right align-top tabular-nums sm:pl-4">{d.sy0701}%</td>
                    <td className="py-3 pl-2 text-right align-top tabular-nums sm:pl-4">{d.sy0801}%</td>
                    <td className="whitespace-nowrap py-3 pl-2 text-right align-top tabular-nums sm:pl-4">
                      {change(d.sy0701, d.sy0801)}
                      <span className="sr-only">{points(d.sy0701, d.sy0801)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* An exam code is kept whole where a line could end inside it. */}
          <div className="cb-measure mt-6 grid gap-4 text-body text-muted-foreground sm:mt-8">
            <p>
              The largest change is to security program management, which falls by six points, and general security
              concepts rises by four.{" "}
              {keepCodes(
                "SY0-801 also adds a new objective, 2.6, on the threats and vulnerabilities of AI usage, and CompTIA's page mentions AI-assisted workflows and operational technology environments."
              )}{" "}
              You can{" "}
              <Link href={SY0_801_PATH} className="cb-link">
                {keepCodes("see all 27 SY0-801 objectives")}
              </Link>{" "}
              or{" "}
              <Link href={SY0_801_AI_PATH} className="cb-link">
                practice the new AI objective
              </Link>
              .
            </p>
            <p>
              {keepCodes(
                "The recommended experience changes as well. For SY0-701, CompTIA recommends Network+ and two years in a security or systems administrator role, and for SY0-801, two years of hands-on experience as a security administrator. CompTIA gives both as recommended experience and not as a requirement."
              )}
            </p>
          </div>
        </ArticleSection>

        <ArticleSection title="How to choose">
          <table className={TABLE}>
            <thead className="max-sm:sr-only">
              <tr className={HEAD_ROW}>
                <th scope="col" className="w-[38%] py-2.5 pr-6 font-medium">
                  Your situation
                </th>
                <th scope="col" className="w-[18%] py-2.5 pr-6 font-medium">
                  Version to take
                </th>
                <th scope="col" className="py-2.5 font-medium">
                  Reason
                </th>
              </tr>
            </thead>
            <tbody className={BODY}>
              {CHOICES.map((c) => (
                <tr key={c.situation} className={ROW}>
                  <th scope="row" className={ROW_HEAD}>
                    {c.situation}
                  </th>
                  <td data-label="Version to take" className={ANSWER_CELL}>
                    {c.take}
                  </td>
                  <td data-label="Reason" className={CELL}>
                    {c.why}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="cb-measure mt-5 text-body text-muted-foreground">
            If an employer or a course names a version, take that one.
          </p>
        </ArticleSection>
      </ArticleBody>

      <CtaBand title="Start the study path for your version">
        <p className="cb-measure text-body text-muted-foreground">
          Each version has its own study path, which sets out every objective in short steps. A readiness checkpoint
          then shows where you stand.
        </p>
        <div className="mt-1 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href={`/path/${SY0_801_CERT}`}>
              Start the SY0-801 study path
              <LinkArrow />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href={`/path/${SECURITY_PLUS_CERT}`}>Start the SY0-701 study path</Link>
          </Button>
        </div>
        <p className="text-small text-muted-foreground">You do not need an account to start.</p>
      </CtaBand>

      <LanderBlock>
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
              note: "12 free hands-on labs, three of them with no account",
            },
          ]}
        />

        <FaqSection faqs={FAQS} />

        <p className="cb-measure-xs mt-10 text-note text-muted-foreground">
          The sources for this page are CompTIA&apos;s{" "}
          <a href={COMPTIA_URLS.securityV7} target="_blank" rel="noopener noreferrer" className="cb-link">
            Security+ V7
          </a>{" "}
          and{" "}
          <a href={COMPTIA_URLS.securityV8} target="_blank" rel="noopener noreferrer" className="cb-link">
            Security+ V8
          </a>{" "}
          exam pages, and its note on{" "}
          <a href={COMPTIA_URLS.securityValidity} target="_blank" rel="noopener noreferrer" className="cb-link">
            how long the Security+ certification lasts
          </a>
          .
        </p>
      </LanderBlock>
    </LanderPage>
  );
}
