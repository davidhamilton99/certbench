import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { Footer } from "@/components/marketing/Footer";
import { FaqSection } from "@/components/marketing/FaqSection";
import { SubnettingDrillLazy } from "@/components/marketing/SubnettingDrillLazy";
import { MODES } from "@/lib/tools/subnetting";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Free Subnetting Practice — Rapid Drills",
  description:
    "Get fast at subnetting with mode-based rapid drills: binary, CIDR ↔ mask, network IDs, broadcast addresses, and host math. Instant grading with worked solutions. Free, no signup.",
};

const FAQS = [
  {
    question: "How do I get faster at subnetting?",
    answer:
      "Drill one conversion at a time until it's reflex, then stack the next — that's why this tool is organized as modes instead of mixed questions. Learn the mask octets cold (128, 192, 224, 240, 248, 252, 254, 255), then use the block-size method: subtract the interesting mask octet from 256 and count in blocks. Exam-ready pace is roughly 30 seconds per question, which the timer here tracks for you.",
  },
  {
    question: "What is the magic number (block size) method?",
    answer:
      "Take the mask octet that isn't 0 or 255 and subtract it from 256 — that's your block size. For /26 (mask 255.255.255.192): 256 − 192 = 64, so subnets start at 0, 64, 128, 192. Any address falls in the block at or below it: 192.168.1.154 sits in the 128 block, so the network is 192.168.1.128 and the broadcast is one below the next block, 192.168.1.191. No binary needed once the mask octets are memorized.",
  },
  {
    question: "Do I need subnetting for Network+ and Security+?",
    answer:
      "Network+ (N10-009) tests subnetting directly — mask and prefix questions, usable-host math, and it appears inside performance-based questions. Security+ assumes you can read CIDR notation and recognize network boundaries in firewall rules and logs. CCNA leans on the same skills even harder, so the drills transfer.",
  },
  {
    question: "Should I practice subnetting in binary or with shortcuts?",
    answer:
      "Both, in that order. Binary mode builds the mental model — why 192 means two network bits. The block-size shortcut is what you'll actually use under exam time pressure. If you can convert octets to binary and recite the block sizes, every subnetting question becomes arithmetic.",
  },
  {
    question: "Is this subnetting practice really free?",
    answer:
      "Yes — every mode, unlimited questions, no account. A free CertBench account adds the full Network+ question bank with spaced repetition, a 25-question diagnostic, and a readiness score.",
  },
];

export default function SubnettingPracticePage() {
  return (
    <div className="flex min-h-svh flex-col">
      <MarketingHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12 sm:py-16">
        <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Subnetting practice
        </h1>
        <p className="mt-4 leading-relaxed text-muted-foreground">
          Speed comes from drilling one conversion until it&apos;s reflex — not
          from grinding mixed question sets. Pick a mode, answer as fast as you
          can, and misses pause on a worked solution that shows the block-size
          shortcut. Free, endless, no signup.
        </p>

        <div className="mt-8">
          <SubnettingDrillLazy />
        </div>

        {/* What each mode drills — content for readers and crawlers alike */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">The modes</h2>
          <div className="mt-4 grid gap-1.5">
            {MODES.map((m) => (
              <div
                key={m.id}
                className="flex items-baseline justify-between gap-3 rounded-lg border bg-card px-4 py-2.5 text-sm"
              >
                <span className="font-medium">{m.label}</span>
                <span className="text-right font-mono text-xs text-muted-foreground">
                  {m.blurb}
                </span>
              </div>
            ))}
            <div className="flex items-baseline justify-between gap-3 rounded-lg border bg-card px-4 py-2.5 text-sm">
              <span className="font-medium">Gauntlet</span>
              <span className="text-right font-mono text-xs text-muted-foreground">
                All modes shuffled — exam pace
              </span>
            </div>
          </div>
        </section>

        {/* The method, taught in the open — this is the page's teaching core */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">
            The block-size method in 20 seconds
          </h2>
          <div className="mt-4 grid gap-3 leading-relaxed text-muted-foreground">
            <p>
              Memorize the eight mask octets — 128, 192, 224, 240, 248, 252,
              254, 255 — and every subnetting question becomes arithmetic:
            </p>
            <ol className="grid gap-2 pl-5" style={{ listStyle: "decimal" }}>
              <li>
                <span className="text-foreground">Find the block size:</span>{" "}
                256 minus the interesting mask octet. For /26
                (255.255.255.192): 256 − 192 = <span className="font-mono">64</span>.
              </li>
              <li>
                <span className="text-foreground">Count the blocks:</span>{" "}
                subnets start at 0, 64, 128, 192.
              </li>
              <li>
                <span className="text-foreground">Place the address:</span>{" "}
                192.168.1.154 falls in the 128 block → network{" "}
                <span className="font-mono">192.168.1.128</span>, broadcast one
                below the next block →{" "}
                <span className="font-mono">192.168.1.191</span>, usable hosts{" "}
                <span className="font-mono">.129–.190</span>.
              </li>
            </ol>
            <p>
              The Network ID and Broadcast &amp; range modes above drill
              exactly this loop until it takes seconds.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="mt-10 grid justify-items-center gap-3 rounded-xl border bg-muted/40 px-6 py-10 text-center">
          <h2 className="text-xl font-semibold tracking-tight">
            Subnetting is one objective of many
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            The N10-009 exam has five domains. Take the free 25-question
            diagnostic to see where you actually stand — and get a daily plan
            built from your weak spots.
          </p>
          <Button asChild size="lg" className="mt-1">
            <Link href="/register">
              Take the free diagnostic
              <ArrowRight />
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground">
            Not ready to sign up?{" "}
            <Link
              href="/network-plus-practice-test"
              className="text-primary underline underline-offset-4"
            >
              Try the free Network+ practice test
            </Link>{" "}
            — no account needed.
          </p>
        </section>

        <FaqSection faqs={FAQS} />
      </main>
      <Footer />
    </div>
  );
}
