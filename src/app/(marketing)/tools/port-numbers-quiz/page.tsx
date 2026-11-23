import { PORT_ENTRIES } from "@/lib/tools/port-quiz-data";
import { ROUND_SIZE } from "@/core/drill-rounds/drill-rounds";
import { LanderBlock, LanderHero, LanderPage, LanderProse, LanderStage } from "@/components/marketing/lander/Lander";
import { FaqSection } from "@/components/marketing/FaqSection";
import { PortQuiz } from "@/components/marketing/PortQuiz";
import { PathCard } from "@/components/marketing/PathCard";
import { ReferenceFold } from "@/components/marketing/ReferenceFold";
import { ToolEmailCapture } from "@/components/marketing/ToolEmailCapture";
import { RelatedLinks } from "@/components/marketing/RelatedLinks";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Free CompTIA port numbers quiz",
  description: `Practice ${PORT_ENTRIES.length} port numbers and their protocols for the CompTIA Security+, Network+ and A+ exams. The first round is free and needs no account. A free account saves your progress and begins each round with the ports that you missed.`,
  path: "/tools/port-numbers-quiz",
});

const FAQS = [
  {
    question: "Which port numbers do I need to memorize for CompTIA exams?",
    // CompTIA's own objectives were read only for A+ Core 1 (facts file, 23 November 2026), so only that exam is named.
    answer: `For A+ Core 1 (220-1201), CompTIA's exam objectives list the ports and protocols under objective 2.1. This quiz covers ${PORT_ENTRIES.length} ports, among them the best-known ports (SSH 22, DNS 53, HTTP 80, HTTPS 443 and RDP 3389), the email protocols (SMTP 25 and 587, POP3 110 and 995, IMAP 143 and 993) and the infrastructure protocols (DHCP 67 and 68, SNMP 161 and 162, LDAP 389 and 636).`,
  },
  {
    question: "What is the best way to memorize port numbers?",
    answer:
      "Short, frequent practice works better than one long session. Complete a round each day, and learn the pairs of insecure and secure protocols: HTTP 80 and HTTPS 443, LDAP 389 and LDAPS 636, Telnet 23 and SSH 22. With a free account, every round begins with the ports that you missed in the last one.",
  },
  {
    question: "Do I need to know whether each port uses TCP or UDP?",
    answer:
      "For A+ Core 1 (220-1201), CompTIA's exam objectives include it: objective 2.1 covers TCP and UDP ports and protocols. The list on this page gives the transport of every port. The protocols that use UDP include DHCP (67 and 68), TFTP (69), NTP (123), SNMP (161 and 162) and syslog (514). DNS uses both: UDP for queries and TCP for zone transfers.",
  },
];

/** The best-known ports, named in the folded list's summary (those that the list has). */
const HEADLINERS = [
  ["SSH", "22"],
  ["DNS", "53"],
  ["HTTP", "80"],
  ["HTTPS", "443"],
  ["RDP", "3389"],
] as const;

export default function PortQuizPage() {
  const headliners = HEADLINERS.filter(([, port]) => PORT_ENTRIES.some((e) => e.port === port)).map(
    ([name, port]) => `${name} ${port}`
  );

  return (
    <LanderPage>
      <LanderHero
        eyebrow="A+, Network+ and Security+"
        title="CompTIA port numbers quiz"
        sub={`This quiz covers ${PORT_ENTRIES.length} ports for the CompTIA exams, asked in both directions.`}
        specs={[
          { label: "First round", value: `${ROUND_SIZE} questions` },
          { label: "Account", value: "Not required for the first round" },
          { label: "Marking", value: "After each answer" },
        ]}
      />
      <LanderStage width="md">
        <PortQuiz entries={PORT_ENTRIES} />
      </LanderStage>

      <LanderProse className="pt-10 sm:pt-12">
        <p>
          This quiz covers {PORT_ENTRIES.length} port numbers in both directions: you name the port, and you name the
          protocol. A free account saves your progress and builds every round after the first from the ports that you
          missed.
        </p>
      </LanderProse>

      {/* The full list stays in the page for anyone who searches for the port
          numbers themselves. It is folded under the quiz and not in front of it. */}
      <LanderBlock className="mt-8">
        <ReferenceFold
          title="The port numbers in this quiz"
          summary={
            <>
              {headliners.join(", ")} and {PORT_ENTRIES.length - headliners.length} more, each with TCP or UDP.
            </>
          }
        >
          <table className="w-full text-small">
            <thead>
              <tr className="text-left text-note text-muted-foreground">
                <th scope="col" className="px-3 py-2 font-medium">
                  Port
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Protocol
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Transport
                </th>
              </tr>
            </thead>
            <tbody>
              {PORT_ENTRIES.map((e) => (
                <tr key={e.port} className="border-t border-border">
                  <td className="px-3 py-2 font-mono text-note font-medium tabular-nums">{e.port}</td>
                  <td className="px-3 py-2">{e.protocol}</td>
                  <td className="px-3 py-2 font-mono text-note text-muted-foreground">{e.transport}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ReferenceFold>
      </LanderBlock>

      <PathCard
        className="mt-16 sm:mt-24"
        title="Study for your exam in short steps"
        href="/start"
        label="Choose your exam"
        context="port_quiz_page"
      >
        Choose your exam, and its study path works through the exam topic by topic, in short sets of questions like
        this one, up to a readiness checkpoint that shows where you stand.
      </PathCard>

      <LanderBlock className="mt-12 sm:mt-16">
        <ToolEmailCapture source="port-numbers-quiz" />
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
              href: "/network-plus-practice-test",
              label: "Network+ practice test",
              note: "A free full-length N10-009 exam: 90 questions, 90 minutes",
            },
            {
              href: "/a-plus-practice-test",
              label: "A+ practice test",
              note: "Original Core 1 and Core 2 questions with full explanations",
            },
            {
              href: "/tools/subnetting-practice",
              label: "Subnetting practice",
              note: "Timed drills on prefixes, masks and addresses",
            },
          ]}
        />

        <FaqSection faqs={FAQS} />
      </LanderBlock>
    </LanderPage>
  );
}
