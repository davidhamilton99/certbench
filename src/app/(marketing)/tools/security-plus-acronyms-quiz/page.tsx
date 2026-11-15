import { getRecallDecks } from "@/data/recall";
import { acronyms } from "@/data/reference/security-plus-sy0-701/acronyms";
import { ROUND_SIZE } from "@/core/drill-rounds/drill-rounds";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { Footer } from "@/components/marketing/Footer";
import { FaqSection } from "@/components/marketing/FaqSection";
import { AcronymDrill } from "@/components/marketing/AcronymDrill";
import { PathCard } from "@/components/marketing/PathCard";
import { ReferenceFold } from "@/components/marketing/ReferenceFold";
import { ToolEmailCapture } from "@/components/marketing/ToolEmailCapture";
import { RelatedLinks } from "@/components/marketing/RelatedLinks";
import { SECURITY_PLUS_VERSIONS_PATH } from "@/lib/seo/exam-versions";
import { pageMetadata } from "@/lib/seo/metadata";

const COUNT = acronyms.entries.length;

export const metadata = pageMetadata({
  title: "Free Security+ Acronyms List & Quiz (SY0-701)",
  description: `The full list of ${COUNT} CompTIA Security+ SY0-701 acronyms, with a drill that gives instant feedback. Start free with no signup; a free account saves your progress.`,
  path: "/tools/security-plus-acronyms-quiz",
});

const FAQS = [
  {
    question: "How many acronyms are on the Security+ SY0-701 exam?",
    answer: `CompTIA's official objectives list around ${COUNT} acronyms — from the everyday (CIA, AAA, MFA, PKI) to the obscure (SASE, TAXII, OVAL). This quiz drills the full set in both directions: expand the acronym, and name the acronym from its meaning.`,
  },
  {
    question: "What's the best way to memorize Security+ acronyms?",
    answer:
      "Short, frequent drills beat one long cram. Do a round here every day — with a free account, each one opens with the acronyms you missed last time. Focus on the high-frequency families — access control (DAC/MAC/RBAC/ABAC), the AAA protocols (RADIUS/TACACS+), and the detection stack (IDS/IPS/EDR/XDR/SIEM/SOAR).",
  },
  {
    question: "Do I need to know every acronym for the exam?",
    answer:
      "You won't be asked to define all of them, but the exam uses acronyms constantly in both questions and answer choices — recognizing them cold saves time and prevents avoidable mistakes. The high-frequency ones (CIA, PKI, MFA, EDR, SIEM, SOAR, IAM) show up everywhere.",
  },
];

export default function AcronymsQuizPage() {
  const deck = getRecallDecks("security-plus-sy0-701").find(
    (d) => d.config.tableId === "acronyms"
  );

  return (
    <div className="flex min-h-svh flex-col aurora-bg text-foreground">
      <MarketingHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-8 sm:py-14">
        <h1 className="text-balance font-display text-[1.75rem] font-semibold leading-tight tracking-tight sm:text-4xl">
          Security+ acronyms list and quiz
        </h1>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          All {COUNT} SY0-701 acronyms, asked both ways round. Round 1 of {ROUND_SIZE} is free, no signup.
        </p>

        <div className="mt-6">
          {deck ? (
            <AcronymDrill deck={deck} />
          ) : (
            <p className="glass rounded-3xl p-6 text-sm text-muted-foreground">
              The drill is unavailable right now. The full list is below.
            </p>
          )}
        </div>

        <p className="mt-10 leading-relaxed text-muted-foreground">
          The Security+ SY0-701 exam leans hard on acronyms. This drill covers all {COUNT} on CompTIA&apos;s
          list in both directions: expand the acronym, or name it from its meaning. Answer with the number keys.
          A free account saves your progress and builds every round after the first from the ones you miss.
        </p>

        <ReferenceFold
          className="mt-8"
          title="The full Security+ acronym list"
          summary={
            <>
              All {COUNT} from {acronyms.entries[0]?.columns.acronym} to {acronyms.entries.at(-1)?.columns.acronym},
              each with what it stands for.
            </>
          }
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">Acronym</th>
                <th className="px-3 py-2 font-medium">Expansion</th>
                <th className="hidden px-3 py-2 font-medium sm:table-cell">Category</th>
              </tr>
            </thead>
            <tbody>
              {acronyms.entries.map((e) => (
                <tr key={e.columns.acronym} className="border-t border-border/60 align-baseline">
                  <td className="px-3 py-1.5 font-mono text-xs font-medium">{e.columns.acronym}</td>
                  <td className="px-3 py-1.5">{e.columns.expansion}</td>
                  <td className="hidden px-3 py-1.5 text-xs text-muted-foreground sm:table-cell">
                    {e.columns.category}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ReferenceFold>

        <PathCard
          className="mt-10"
          kicker="Your Security+ path"
          title="Acronyms are the easy part"
          href="/path/security-plus-sy0-701"
          label="Start my Security+ path"
          context="acronym_quiz_page"
        >
          The rest of the exam is scenarios. Your Security+ path walks every objective in short rounds like this one,
          up to a readiness checkpoint that shows where you stand.
        </PathCard>

        <section className="mt-10">
          <ToolEmailCapture source="security-plus-acronyms-quiz" />
        </section>

        <RelatedLinks
          links={[
            {
              href: "/security-plus-practice-test",
              label: "Security+ practice test",
              note: "Original SY0-701 questions with full explanations",
            },
            {
              href: "/security-plus-pbq-examples",
              label: "Security+ PBQ examples",
              note: "Work through interactive performance-based questions",
            },
            {
              href: SECURITY_PLUS_VERSIONS_PATH,
              label: "SY0-801 vs SY0-701",
              note: "What changes, and which one to take",
            },
            {
              href: "/tools/port-numbers-quiz",
              label: "Port numbers quiz",
              note: "Drill the ports Security+ loves to test",
            },
          ]}
        />

        <FaqSection faqs={FAQS} />
      </main>
      <Footer />
    </div>
  );
}
