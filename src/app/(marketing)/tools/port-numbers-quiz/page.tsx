import { PORT_ENTRIES } from "@/lib/tools/port-quiz-data";
import { ROUND_SIZE } from "@/core/drill-rounds/drill-rounds";
import { LanderHero, LanderPage, LanderStage } from "@/components/marketing/lander/Lander";
import { FaqSection } from "@/components/marketing/FaqSection";
import { PortQuiz } from "@/components/marketing/PortQuiz";
import { PathCard } from "@/components/marketing/PathCard";
import { ReferenceFold } from "@/components/marketing/ReferenceFold";
import { ToolEmailCapture } from "@/components/marketing/ToolEmailCapture";
import { RelatedLinks } from "@/components/marketing/RelatedLinks";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Free CompTIA Port Numbers Quiz",
  description:
    "Drill the port numbers every CompTIA exam tests — Security+, Network+, and A+. Start free with no signup; a free account saves your progress and targets your misses.",
  path: "/tools/port-numbers-quiz",
});

const FAQS = [
  {
    question: "Which port numbers do I need to memorize for CompTIA exams?",
    answer:
      `The core set is about ${PORT_ENTRIES.length} ports: the classics (SSH 22, DNS 53, HTTP 80, HTTPS 443, RDP 3389), the email family (SMTP 25/587, POP3 110/995, IMAP 143/993), and infrastructure protocols (DHCP 67/68, SNMP 161/162, LDAP 389/636). Network+ leans hardest on ports; Security+ loves asking which secure variant replaces which insecure one.`,
  },
  {
    question: "What's the best way to memorize port numbers?",
    answer:
      "Short, frequent drills beat one long cram. Do a round here daily, and pay attention to the pairs — secure vs insecure versions (HTTP 80 → HTTPS 443, LDAP 389 → LDAPS 636, Telnet 23 → SSH 22) are the most-tested pattern. With a free account, every round opens with the ports you missed last time, so your reps go where they're needed.",
  },
  {
    question: "Do I need to know TCP vs UDP for each port?",
    answer:
      "Yes — especially for Network+. The commonly tested UDP ones: DHCP (67/68), TFTP (69), NTP (123), SNMP (161/162), and syslog (514). DNS famously uses both: UDP for queries, TCP for zone transfers.",
  },
];

/** The best-known ports, named in the folded list's summary (those the list has). */
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
        eyebrow="A+ · Network+ · Security+"
        title="CompTIA port numbers quiz"
        sub={`The ${PORT_ENTRIES.length} ports CompTIA tests, asked both ways round.`}
        specs={[`Round 1 of ${ROUND_SIZE} free`, "No signup", "Marked as you tap"]}
      />
      <LanderStage width="md">
        <PortQuiz entries={PORT_ENTRIES} />
      </LanderStage>
      <div className="mx-auto w-full max-w-3xl px-5 pt-6 sm:px-6">
        <p className="mt-10 leading-relaxed text-muted-foreground">
          Every CompTIA exam expects you to know your ports cold. This drill covers the {PORT_ENTRIES.length}{" "}
          they actually test, in both directions: name the port, and name the protocol. A free account saves
          your progress and builds every round after the first from the ports you miss.
        </p>

        {/* The full list stays in the page for anyone searching "port numbers",
            folded under the drill rather than standing in front of it. */}
        <ReferenceFold
          className="mt-8"
          title="The full CompTIA port numbers list"
          summary={<>{headliners.join(", ")} and {PORT_ENTRIES.length - headliners.length} more, each with TCP or UDP.</>}
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">Port</th>
                <th className="px-3 py-2 font-medium">Protocol</th>
                <th className="px-3 py-2 font-medium">Transport</th>
              </tr>
            </thead>
            <tbody>
              {PORT_ENTRIES.map((e) => (
                <tr key={e.port} className="border-t border-border/60">
                  <td className="px-3 py-2 font-mono text-xs font-medium tabular-nums">{e.port}</td>
                  <td className="px-3 py-2">{e.protocol}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{e.transport}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ReferenceFold>

        <PathCard
          className="mt-10"
          kicker="Your exam's path"
          title="Ports are the easy 5%"
          href="/start"
          label="Start my exam path"
          context="port_quiz_page"
        >
          The rest of the exam is scenarios. Pick your exam and its path walks every objective in short rounds like
          this one, up to a readiness checkpoint that shows where you stand.
        </PathCard>

        <section className="mt-10">
          <ToolEmailCapture source="port-numbers-quiz" />
        </section>

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
              note: "Rapid CIDR and subnet-mask drills",
            },
          ]}
        />

        <FaqSection faqs={FAQS} />
      </div>
    </LanderPage>
  );
}
