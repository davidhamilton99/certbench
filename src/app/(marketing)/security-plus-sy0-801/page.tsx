import Link from "next/link";
import { FaqSection } from "@/components/marketing/FaqSection";
import { RelatedLinks } from "@/components/marketing/RelatedLinks";
import { LanderBlock, LanderPage } from "@/components/marketing/lander/Lander";
import { ArticleBody, ArticleHero, ArticleRow, ArticleSection, CtaBand } from "@/components/marketing/lander/Article";
import { JsonLd } from "@/components/seo/JsonLd";
import { Button } from "@/components/ui/button";
import {
  COMPTIA_URLS,
  EXAM_FACTS_CHECKED,
  SECURITY_PLUS_CERT,
  SECURITY_PLUS_VERSIONS_PATH,
  SY0_801_AI_PATH,
  SY0_801_CERT,
  SY0_801_PATH,
  SY0_801_PRACTICE_PATH,
  SY0_801_PUBLISHED_ISO,
  SY0_801_UPDATED_ISO,
} from "@/lib/seo/exam-versions";
import { SY0_701_OBJECTIVES_PER_DOMAIN, SY0_801_AI_TOPICS, SY0_801_DOMAINS } from "@/data/security-plus-v8";
import { pageMetadata } from "@/lib/seo/metadata";
import { articleData } from "@/lib/seo/structured-data";

const TITLE = "Security+ SY0-801: exam objectives, domains and launch date";
const DESCRIPTION =
  "CompTIA Security+ SY0-801 (V8) is the version that CompTIA now recommends. This page sets out its five domains and their weights, all 27 objectives, the new AI objective, and how to prepare.";

export const metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: SY0_801_PATH,
});

const OBJECTIVE_COUNT = SY0_801_DOMAINS.reduce((n, d) => n + d.objectives.length, 0);

const AT_A_GLANCE = [
  { label: "Exam code", value: "SY0-801 (Security+ V8)" },
  { label: "Launch", value: "November 17, 2026" },
  { label: "Questions", value: "Up to 90, multiple-choice and performance-based" },
  { label: "Time limit", value: "90 minutes" },
  { label: "Passing score", value: "750 on a scale of 100 to 900" },
  { label: "Recommended experience", value: "Two years of hands-on experience as a security administrator" },
  { label: "Retirement", value: "Estimated three years after launch" },
  { label: "SY0-701 available until", value: "June 11, 2027 in English" },
];

const FAQS = [
  {
    question: "When did Security+ SY0-801 launch?",
    answer:
      "CompTIA launched SY0-801 on November 17, 2026, and its Security+ page calls V8 the recommended version. The previous exam, SY0-701, stays open until June 11, 2027 in English, so both can be booked until then.",
  },
  {
    question: "How many objectives does SY0-801 have?",
    answer: `SY0-801 has ${OBJECTIVE_COUNT} objectives in five domains: general security concepts (16% of the exam), threats, vulnerabilities and attacks (24%), security architecture (19%), security operations (27%), and security program management and oversight (14%). SY0-701 has 28.`,
  },
  {
    question: "What is the new AI objective on SY0-801?",
    answer:
      "Objective 2.6 covers the threats and vulnerabilities that come with using AI. It lists model manipulation, poisoning, prompt injection, data loss, bias, explainability, hallucinations, jailbreaking, evasion, privacy, ethical considerations, session hijacking and code execution. SY0-701 has no objective on AI.",
  },
  {
    question: "How many questions are on SY0-801, and what is the passing score?",
    answer:
      "The exam has up to 90 questions, a mix of multiple-choice and performance-based, with a time limit of 90 minutes. The passing score is 750 on a scale of 100 to 900, the same as SY0-701.",
  },
  {
    question: "Where can I get the official SY0-801 objectives?",
    answer:
      "CompTIA's Security+ V8 exam page links the full exam objectives document. The objective names on this page are CertBench's own short labels. CompTIA's document has the official wording and every sub-topic.",
  },
  {
    question: "Should I take SY0-801 or SY0-701?",
    answer:
      "If you can take the exam by June 11, 2027, with time for a retake, SY0-701 has more study material behind it, and CompTIA lists both exams as versions of Security+. If your date falls after that, or if you are starting now and have no date, plan for SY0-801.",
  },
];

/** "1" from "1.0": a domain is named by its number alone. */
const domainLabel = (n: string) => n.replace(/\.0$/, "");

export default function SecurityPlusV8Page() {
  return (
    <LanderPage>
      <JsonLd
        data={articleData({
          headline: TITLE,
          description: DESCRIPTION,
          path: SY0_801_PATH,
          published: SY0_801_PUBLISHED_ISO,
          modified: SY0_801_UPDATED_ISO,
        })}
      />
      <ArticleBody>
        <ArticleHero
          eyebrow="CompTIA Security+ V8"
          title={`Security+ SY0-801: the exam, its domains and all ${OBJECTIVE_COUNT} objectives`}
        >
          <p>
            <strong>
              SY0-801 is the newest Security+ exam. CompTIA launched it on November 17, 2026 and now recommends it.
            </strong>{" "}
            It keeps the format and the passing score of SY0-701, regroups the objectives into {OBJECTIVE_COUNT}, and
            adds one on the threats and vulnerabilities of AI.
          </p>
          <p>
            The dates, the format and the domain weights on this page were last checked against CompTIA&apos;s{" "}
            <a href={COMPTIA_URLS.securityV8} target="_blank" rel="noopener noreferrer" className="cb-link">
              Security+ V8 page
            </a>{" "}
            on {EXAM_FACTS_CHECKED}. The objectives are from the exam objectives document that the page links. The
            objective names here are CertBench&apos;s own short labels, and CompTIA&apos;s document has the official
            wording.
          </p>
        </ArticleHero>

        <ArticleSection title="At a glance">
          <table className="w-full border-collapse border-t border-border text-left text-small">
            <caption className="sr-only">Security+ SY0-801 at a glance</caption>
            <tbody>
              {AT_A_GLANCE.map((row) => (
                <tr key={row.label} className="border-b border-border">
                  <th scope="row" className="w-2/5 py-3 pr-6 align-top font-semibold">
                    {row.label}
                  </th>
                  <td className="py-3 align-top text-muted-foreground">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ArticleSection>

        {/* Each domain is a ruled list under its own heading, with its share of
            the exam as a figure. There are no bars: the figure says it. */}
        <ArticleSection
          title="Domains and objectives"
          sub="Each domain is listed with its share of the exam and the objectives that it covers."
        >
          <div className="grid gap-10">
            {SY0_801_DOMAINS.map((d) => (
              <div key={d.number}>
                <h3 className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 border-b border-foreground/70 pb-2 text-small font-semibold">
                  <span>
                    Domain {domainLabel(d.number)}: {d.title}
                  </span>{" "}
                  <span className="text-note font-normal text-muted-foreground">{d.weight}% of the exam</span>
                </h3>
                {/* A space in the text between the parts of a row: read without
                    styles, the row is words and not one run. */}
                <ul className="divide-y divide-border border-b border-border">
                  {d.objectives.map((o) => (
                    <li key={o.code} className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-baseline gap-x-4 py-2.5 text-small">
                      <span className="font-mono text-note text-muted-foreground">{o.code}</span>{" "}
                      <span className="min-w-0">
                        {o.label}
                        {o.isNew && (
                          <>
                            {" "}
                            <span className="ml-1 whitespace-nowrap text-note font-semibold">New in SY0-801</span>
                          </>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </ArticleSection>

        <ArticleSection title="What changed from SY0-701">
          <ul className="cb-measure grid list-disc gap-2.5 pl-5 text-body text-muted-foreground [&_strong]:font-medium [&_strong]:text-foreground">
            <li>
              <strong>A new AI objective, 2.6.</strong> It covers the threats and vulnerabilities of using AI, and
              SY0-701 has no objective on AI.
            </li>
            <li>
              <strong>
                {OBJECTIVE_COUNT} objectives instead of {SY0_701_OBJECTIVES_PER_DOMAIN.reduce((a, b) => a + b, 0)}.
              </strong>{" "}
              General security concepts goes from {SY0_701_OBJECTIVES_PER_DOMAIN[0]} objectives to{" "}
              {SY0_801_DOMAINS[0].objectives.length}, with security controls and core concepts now one objective.
              Security operations goes from {SY0_701_OBJECTIVES_PER_DOMAIN[3]} to{" "}
              {SY0_801_DOMAINS[3].objectives.length}.
            </li>
            <li>
              <strong>Mitigation moves to security operations.</strong> Domain 2 is now &ldquo;Threats,
              Vulnerabilities, and Attacks&rdquo;, and applying mitigating controls opens domain 4.
            </li>
            <li>
              <strong>New weights.</strong> General security concepts rises from 12% to 16%, and security program
              management falls from 20% to 14%.
            </li>
          </ul>
          <p className="cb-measure mt-5 text-body text-muted-foreground">
            If you are deciding between the two versions, read{" "}
            <Link href={SECURITY_PLUS_VERSIONS_PATH} className="cb-link">
              which version to take
            </Link>
            .
          </p>
        </ArticleSection>

        <ArticleSection
          title="The new AI objective"
          sub={`Objective 2.6 names ${SY0_801_AI_TOPICS.length} topics. Each one is defined briefly here.`}
        >
          <dl className="border-t border-border">
            {SY0_801_AI_TOPICS.map((t) => (
              <ArticleRow key={t.term} term={t.term}>
                <p>{t.gist}</p>
              </ArticleRow>
            ))}
          </dl>
        </ArticleSection>
      </ArticleBody>

      <CtaBand title="Take the free SY0-801 practice exam">
        {/* Only what holds for whichever exam that page serves: its questions are drawn from the bank when it is built. */}
        <p className="cb-measure text-body text-muted-foreground">
          The practice exam is timed and follows the exam&apos;s domain weights. It is scored by domain, and every
          answer is explained. Anyone can take it, and a free account shows the score.
        </p>
        <Button asChild size="lg" className="mt-1">
          <Link href={SY0_801_PRACTICE_PATH}>Take the practice exam</Link>
        </Button>
        <p className="cb-measure-sm text-small text-muted-foreground">
          You can also{" "}
          <Link href={SY0_801_AI_PATH} className="cb-link">
            try the questions on the new AI objective
          </Link>
          ,{" "}
          <Link href={`/path/${SY0_801_CERT}`} className="cb-link">
            start the SY0-801 study path
          </Link>{" "}
          or, if you are taking SY0-701,{" "}
          <Link href={`/path/${SECURITY_PLUS_CERT}`} className="cb-link">
            start the SY0-701 study path
          </Link>
          .
        </p>
      </CtaBand>

      <LanderBlock>
        <RelatedLinks
          links={[
            {
              href: SY0_801_PRACTICE_PATH,
              label: "SY0-801 practice test",
              note: "A free timed exam, scored by domain",
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
              note: "12 free hands-on labs, three of them with no account",
            },
          ]}
        />

        <FaqSection faqs={FAQS} />

        <p className="cb-measure-xs mt-10 text-note text-muted-foreground">
          The sources for this page are CompTIA&apos;s{" "}
          <a href={COMPTIA_URLS.securityV8} target="_blank" rel="noopener noreferrer" className="cb-link">
            Security+ V8 exam page
          </a>{" "}
          and its SY0-801 exam objectives (document version 2.0), and the{" "}
          <a href={COMPTIA_URLS.securityV7} target="_blank" rel="noopener noreferrer" className="cb-link">
            Security+ V7 page
          </a>{" "}
          for the dates of SY0-701.
        </p>
      </LanderBlock>
    </LanderPage>
  );
}
