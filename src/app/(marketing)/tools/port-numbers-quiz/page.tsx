import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PORT_ENTRIES } from "@/lib/tools/port-quiz-data";
import { ROUND_SIZE } from "@/core/drill-rounds/drill-rounds";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { Footer } from "@/components/marketing/Footer";
import { FaqSection } from "@/components/marketing/FaqSection";
import { PortQuiz } from "@/components/marketing/PortQuiz";
import { ToolEmailCapture } from "@/components/marketing/ToolEmailCapture";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Free CompTIA Port Numbers Quiz",
  description:
    "Drill the port numbers every CompTIA exam tests — Security+, Network+, and A+. Start free with no signup; a free account saves your progress and targets your misses.",
};

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

export default function PortQuizPage() {
  return (
    <div className="flex min-h-svh flex-col aurora-bg text-foreground">
      <MarketingHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12 sm:py-16">
        <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Port numbers quiz
        </h1>
        <p className="mt-4 leading-relaxed text-muted-foreground">
          Every CompTIA exam — A+, Network+, Security+ — expects you to know
          your ports cold. This drill covers the {PORT_ENTRIES.length} ports
          they actually test, in both directions: name the port, and name the
          protocol. Your first round of {ROUND_SIZE} is free with no signup — a
          free account saves your progress and builds every round after it
          from the ports you miss.
        </p>

        <div className="mt-8">
          <PortQuiz entries={PORT_ENTRIES} />
        </div>

        {/* Full reference */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">
            The full list
          </h2>
          <div className="mt-4 overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-4 py-2.5 font-medium">Port</th>
                  <th className="px-4 py-2.5 font-medium">Protocol</th>
                  <th className="hidden px-4 py-2.5 font-medium sm:table-cell">
                    Transport
                  </th>
                </tr>
              </thead>
              <tbody>
                {PORT_ENTRIES.map((e) => (
                  <tr key={e.port} className="border-b last:border-0">
                    <td className="px-4 py-2 font-mono text-xs">{e.port}</td>
                    <td className="px-4 py-2">{e.protocol}</td>
                    <td className="hidden px-4 py-2 text-muted-foreground sm:table-cell">
                      {e.transport}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* CTA */}
        <section className="mt-10 grid justify-items-center gap-3 rounded-xl border bg-muted/40 px-6 py-10 text-center">
          <h2 className="text-xl font-semibold tracking-tight">
            Ports are the easy 5%
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            The rest of the exam is scenarios. Pick your exam and its path
            walks every objective in short rounds like this one.
          </p>
          <Button asChild size="lg" className="mt-1">
            <Link href="/start">
              Start my exam path
              <ArrowRight />
            </Link>
          </Button>
        </section>

        <section className="mt-10">
          <ToolEmailCapture source="port-numbers-quiz" />
        </section>

        <FaqSection faqs={FAQS} />
      </main>
      <Footer />
    </div>
  );
}
