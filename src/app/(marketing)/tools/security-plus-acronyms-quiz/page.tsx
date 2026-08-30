import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getRecallDecks } from "@/data/recall";
import { acronyms } from "@/data/reference/security-plus-sy0-701/acronyms";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { Footer } from "@/components/marketing/Footer";
import { FaqSection } from "@/components/marketing/FaqSection";
import { AcronymDrill } from "@/components/marketing/AcronymDrill";
import { Button } from "@/components/ui/button";

const COUNT = acronyms.entries.length;

export const metadata = {
  title: "Free CompTIA Security+ Acronyms Quiz",
  description: `Drill all ${COUNT} CompTIA Security+ SY0-701 acronyms — free, endless, instant feedback, no signup. Includes the full acronym list to memorize.`,
};

const FAQS = [
  {
    question: "How many acronyms are on the Security+ SY0-701 exam?",
    answer: `CompTIA's official objectives list around ${COUNT} acronyms — from the everyday (CIA, AAA, MFA, PKI) to the obscure (SASE, TAXII, OVAL). This quiz drills the full set in both directions: expand the acronym, and name the acronym from its meaning.`,
  },
  {
    question: "What's the best way to memorize Security+ acronyms?",
    answer:
      "Short, frequent drills beat one long cram. Do 15–20 here every day and let spaced repetition surface the ones you keep missing right before you'd forget them. Focus on the high-frequency families — access control (DAC/MAC/RBAC/ABAC), the AAA protocols (RADIUS/TACACS+), and the detection stack (IDS/IPS/EDR/XDR/SIEM/SOAR).",
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
    <div className="flex min-h-svh flex-col">
      <MarketingHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12 sm:py-16">
        <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Security+ acronyms quiz
        </h1>
        <p className="mt-4 leading-relaxed text-muted-foreground">
          The Security+ SY0-701 exam leans hard on acronyms. This endless drill
          covers all {COUNT} on CompTIA&apos;s list, both directions — expand the
          acronym, or name it from its meaning. Answer with the number keys. No
          signup, no limit.
        </p>

        <div className="mt-8">
          {deck ? (
            <AcronymDrill deck={deck} />
          ) : (
            <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
              The drill is unavailable right now — the full list is below.
            </p>
          )}
        </div>

        {/* Full reference list */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">
            The full Security+ acronym list
          </h2>
          <div className="mt-4 overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-4 py-2.5 font-medium">Acronym</th>
                  <th className="px-4 py-2.5 font-medium">Expansion</th>
                  <th className="hidden px-4 py-2.5 font-medium sm:table-cell">
                    Category
                  </th>
                </tr>
              </thead>
              <tbody>
                {acronyms.entries.map((e) => (
                  <tr key={e.columns.acronym} className="border-b last:border-0">
                    <td className="px-4 py-2 font-mono text-xs font-medium">
                      {e.columns.acronym}
                    </td>
                    <td className="px-4 py-2">{e.columns.expansion}</td>
                    <td className="hidden px-4 py-2 text-muted-foreground sm:table-cell">
                      {e.columns.category}
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
            Acronyms are the easy part
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            The rest of the exam is scenarios and PBQs. Take the free 25-question
            diagnostic to see how ready you actually are — and get a daily plan
            for everything else.
          </p>
          <Button asChild size="lg" className="mt-1">
            <Link href="/register">
              Take the free diagnostic
              <ArrowRight />
            </Link>
          </Button>
        </section>

        <FaqSection faqs={FAQS} />
      </main>
      <Footer />
    </div>
  );
}
