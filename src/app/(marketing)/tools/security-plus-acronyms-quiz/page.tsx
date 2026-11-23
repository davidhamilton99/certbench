import { getRecallDecks } from "@/data/recall";
import { acronyms } from "@/data/reference/security-plus-sy0-701/acronyms";
import { ROUND_SIZE } from "@/core/drill-rounds/drill-rounds";
import { FREE_LAB_COUNT } from "@/core/path/free-labs";
import { LanderBlock, LanderHero, LanderPage, LanderProse, LanderStage } from "@/components/marketing/lander/Lander";
import { FaqSection } from "@/components/marketing/FaqSection";
import { AcronymDrill } from "@/components/marketing/AcronymDrill";
import { PathCard } from "@/components/marketing/PathCard";
import { ReferenceFold } from "@/components/marketing/ReferenceFold";
import { ToolEmailCapture } from "@/components/marketing/ToolEmailCapture";
import { RelatedLinks } from "@/components/marketing/RelatedLinks";
import { SECURITY_PLUS_VERSIONS_PATH } from "@/lib/seo/exam-versions";
import { pageMetadata } from "@/lib/seo/metadata";
import { PORT_ENTRIES } from "@/lib/tools/port-quiz-data";

const COUNT = acronyms.entries.length;

export const metadata = pageMetadata({
  title: "Free Security+ acronyms list and quiz (SY0-701)",
  description: `This page lists ${COUNT} Security+ SY0-701 acronyms, with one meaning for each, and a quiz that marks each answer as you give it. The first round is free and needs no account. A free account saves your progress.`,
  path: "/tools/security-plus-acronyms-quiz",
});

const FAQS = [
  {
    // CompTIA's own count of its acronyms is not in the facts file, so the answer gives the list's count and says what it holds.
    question: "How many acronyms are in this list?",
    answer: `The list has ${COUNT} Security+ SY0-701 acronyms, from the common (CIA, AAA, MFA and PKI) to the less common (SASE, TAXII and OVAL), and the quiz asks each one in both directions. It gives one meaning for each acronym: where an acronym has more than one, it gives the one that CertBench judged most useful for the exam.`,
  },
  {
    question: "What is the best way to memorize Security+ acronyms?",
    answer:
      "Short, frequent practice works better than one long session. Complete a round each day. With a free account, each round begins with the acronyms that you missed in the last one. It helps to learn related acronyms together: access control (DAC, MAC, RBAC and ABAC), the authentication protocols (RADIUS and TACACS+), and detection and response (IDS, IPS, EDR, XDR, SIEM and SOAR).",
  },
  {
    question: "Do I need to know every acronym for the exam?",
    // CompTIA does not publish what its exams ask (facts file), so the answer makes no claim about the exam's questions.
    answer:
      "CompTIA's exam questions are confidential, so CertBench does not say which acronyms an exam uses or how it asks about them. An acronym that you recognize at once saves time wherever you meet it, and the quiz builds that recognition in both directions.",
  },
];

export default function AcronymsQuizPage() {
  const deck = getRecallDecks("security-plus-sy0-701").find((d) => d.config.tableId === "acronyms");

  return (
    <LanderPage>
      <LanderHero
        eyebrow="Security+ SY0-701"
        title="Security+ acronyms list and quiz"
        sub={`This quiz covers ${COUNT} SY0-701 acronyms, asked in both directions.`}
        specs={[
          { label: "First round", value: `${ROUND_SIZE} questions` },
          { label: "Account", value: "Not required for the first round" },
          { label: "Marking", value: "After each answer" },
        ]}
      />
      <LanderStage width="md">
        {deck ? (
          <AcronymDrill deck={deck} />
        ) : (
          <p className="glass rounded-lg p-6 text-small text-muted-foreground">
            The quiz is not available at present. The list of acronyms is on this page.
          </p>
        )}
      </LanderStage>

      <LanderProse className="pt-10 sm:pt-12">
        <p>
          This quiz covers the {COUNT} acronyms in CertBench&apos;s SY0-701 list in both directions: you expand the
          acronym, or you name it from its meaning. The list gives one meaning for each acronym, and where an acronym
          has more than one, it gives the one that CertBench judged most useful for the exam. You can answer with the
          number keys. A free account saves your progress and builds every round after the first from the acronyms that you
          missed.
        </p>
      </LanderProse>

      <LanderBlock className="mt-8">
        <ReferenceFold
          title="The Security+ acronyms in this quiz"
          summary={
            <>
              The list runs from {acronyms.entries[0]?.columns.acronym} to {acronyms.entries.at(-1)?.columns.acronym},
              with one meaning for each of its {COUNT} acronyms.
            </>
          }
        >
          <table className="w-full text-small">
            <thead>
              <tr className="text-left text-note text-muted-foreground">
                <th scope="col" className="px-3 py-2 font-medium">
                  Acronym
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Expansion
                </th>
                <th scope="col" className="hidden px-3 py-2 font-medium sm:table-cell">
                  Category
                </th>
              </tr>
            </thead>
            <tbody>
              {acronyms.entries.map((e) => (
                <tr key={e.columns.acronym} className="border-t border-border align-baseline">
                  <td className="px-3 py-1.5 font-mono text-note font-medium">{e.columns.acronym}</td>
                  <td className="px-3 py-1.5">{e.columns.expansion}</td>
                  <td className="hidden px-3 py-1.5 text-note text-muted-foreground sm:table-cell">
                    {e.columns.category}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ReferenceFold>
      </LanderBlock>

      <PathCard
        className="mt-16 sm:mt-24"
        title="Study for Security+ in short steps"
        href="/path/security-plus-sy0-701"
        label="Start the Security+ study path"
        context="acronym_quiz_page"
      >
        The Security+ study path covers every objective in short sets of questions like this one, up to a readiness
        checkpoint that shows where you stand.
      </PathCard>

      <LanderBlock className="mt-12 sm:mt-16">
        <ToolEmailCapture source="security-plus-acronyms-quiz" />
      </LanderBlock>

      <LanderBlock>
        <RelatedLinks
          links={[
            {
              href: "/security-plus-practice-test",
              label: "Security+ practice test",
              note: "A free full-length SY0-701 exam: 90 questions, 90 minutes",
            },
            {
              href: "/security-plus-pbq-examples",
              label: "Security+ PBQ examples",
              note: `${FREE_LAB_COUNT} free hands-on labs, three of them with no account`,
            },
            {
              href: SECURITY_PLUS_VERSIONS_PATH,
              label: "SY0-801 vs SY0-701",
              note: "What changes, and which one to take",
            },
            {
              href: "/tools/port-numbers-quiz",
              label: "Port numbers quiz",
              note: `A quiz on ${PORT_ENTRIES.length} port numbers and their protocols`,
            },
          ]}
        />

        <FaqSection faqs={FAQS} />
      </LanderBlock>
    </LanderPage>
  );
}
