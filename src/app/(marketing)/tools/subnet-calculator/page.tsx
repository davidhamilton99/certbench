import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { Footer } from "@/components/marketing/Footer";
import { FaqSection } from "@/components/marketing/FaqSection";
import { SubnetCalculator } from "@/components/marketing/SubnetCalculator";
import { JsonLd } from "@/components/seo/JsonLd";
import { calculateSubnet } from "@/lib/tools/subnet-calculator";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Free Subnet Calculator (IPv4 / CIDR)",
  description:
    "Free IPv4 subnet calculator — enter an IP and CIDR prefix to get the network address, broadcast, usable host range, subnet mask, wildcard mask, and host count instantly. No signup.",
};

/** Static CIDR cheat sheet, computed once from the same engine as the tool. */
const CHEAT = [16, 18, 20, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32].map(
  (p) => calculateSubnet("0.0.0.0", p)!
);

const FAQS = [
  {
    question: "How do I calculate a subnet by hand?",
    answer:
      "Use the block-size (magic number) method. Find the interesting mask octet (the one that isn't 0 or 255), subtract it from 256 to get the block size, and the subnets step by that block: 0, block, 2×block… Your address falls in the block at or below it — that's the network address, and the broadcast is one below the next block. For /26 (mask 255.255.255.192): 256 − 192 = 64, so 192.168.1.130 sits in the .128 block → network 192.168.1.128, broadcast 192.168.1.191.",
  },
  {
    question: "How many usable hosts are in a /26?",
    answer:
      "62. Host bits are 32 − 26 = 6, so 2^6 = 64 total addresses, minus the network and broadcast addresses = 62 usable. The same math gives 254 for a /24, 30 for a /27, and 2 for a /30 (the classic point-to-point link).",
  },
  {
    question: "What is a wildcard mask?",
    answer:
      "The bitwise inverse of the subnet mask — where the mask has 1s, the wildcard has 0s. A /24 mask of 255.255.255.0 has a wildcard of 0.0.0.255. Cisco ACLs and OSPF network statements use wildcard masks instead of subnet masks, so it's worth being able to flip between them.",
  },
  {
    question: "What's the difference between a /31 and a /30?",
    answer:
      "A /30 has 4 addresses: network, two usable hosts, and broadcast — the traditional point-to-point link. A /31 (RFC 3021) drops the network/broadcast distinction so both addresses are usable, saving an address on point-to-point links. This calculator counts a /31 as 2 usable hosts with no broadcast.",
  },
  {
    question: "Is this subnet calculator free?",
    answer:
      "Yes — unlimited, no account. If you're studying for Network+ or A+, a free CertBench account adds timed subnetting drills, the full question bank with spaced repetition, and a readiness score across every exam domain.",
  },
];

const learningResource = {
  "@context": "https://schema.org",
  "@type": "LearningResource",
  name: "Free Subnet Calculator (IPv4 / CIDR)",
  description:
    "Calculate the network address, broadcast, usable host range, subnet mask, wildcard mask, and host count for any IPv4 address and CIDR prefix.",
  url: "https://certbench.dev/tools/subnet-calculator",
  learningResourceType: "Calculator",
  educationalUse: "Practice",
  isAccessibleForFree: true,
  inLanguage: "en",
  provider: {
    "@type": "Organization",
    name: "CertBench",
    url: "https://certbench.dev",
  },
};

export default function SubnetCalculatorPage() {
  return (
    <div className="flex min-h-svh flex-col aurora-bg text-foreground">
      <JsonLd data={learningResource} />
      <MarketingHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12 sm:py-16">
        <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Subnet calculator
        </h1>
        <p className="mt-4 leading-relaxed text-muted-foreground">
          Enter an IPv4 address and a CIDR prefix to get the network and
          broadcast addresses, the usable host range, subnet and wildcard
          masks, and the host count — instantly. Free, no signup.
        </p>

        <div className="mt-8">
          <SubnetCalculator />
        </div>

        {/* CIDR cheat sheet — content for readers and crawlers alike */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">
            CIDR cheat sheet
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The prefixes you&apos;ll meet most on Network+, A+, and CCNA.
          </p>
          <div className="mt-4 overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-4 py-2.5 font-medium">CIDR</th>
                  <th className="px-4 py-2.5 font-medium">Subnet mask</th>
                  <th className="hidden px-4 py-2.5 font-medium sm:table-cell">
                    Wildcard
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium">
                    Usable hosts
                  </th>
                </tr>
              </thead>
              <tbody>
                {CHEAT.map((r) => (
                  <tr key={r.prefix} className="border-b last:border-0">
                    <td className="px-4 py-2 font-mono text-xs">/{r.prefix}</td>
                    <td className="px-4 py-2 font-mono text-xs">{r.mask}</td>
                    <td className="hidden px-4 py-2 font-mono text-xs text-muted-foreground sm:table-cell">
                      {r.wildcard}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-xs tabular-nums">
                      {r.usableHosts.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* The method, taught in the open */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">
            The block-size method in 20 seconds
          </h2>
          <div className="mt-4 grid gap-3 leading-relaxed text-muted-foreground">
            <p>
              You don&apos;t need binary once the mask octets are memorized —
              128, 192, 224, 240, 248, 252, 254, 255. Every subnet question
              becomes arithmetic:
            </p>
            <ol className="grid gap-2 pl-5" style={{ listStyle: "decimal" }}>
              <li>
                <span className="text-foreground">Find the block size:</span>{" "}
                subtract the interesting mask octet from 256. For /26 (192):
                256 − 192 = <span className="font-mono">64</span>.
              </li>
              <li>
                <span className="text-foreground">Step in blocks:</span> subnets
                start at 0, 64, 128, 192. Your address falls in the block at or
                below it → that&apos;s the network.
              </li>
              <li>
                <span className="text-foreground">Broadcast:</span> one below
                the next block. For 192.168.1.130 /26 → network{" "}
                <span className="font-mono">192.168.1.128</span>, broadcast{" "}
                <span className="font-mono">192.168.1.191</span>.
              </li>
            </ol>
            <p>
              Want to get fast at this?{" "}
              <Link
                href="/tools/subnetting-practice"
                className="text-primary underline underline-offset-4"
              >
                Drill it under a timer
              </Link>{" "}
              until it&apos;s reflex.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="mt-10 grid justify-items-center gap-3 rounded-xl border bg-muted/40 px-6 py-10 text-center">
          <h2 className="text-xl font-semibold tracking-tight">
            Subnetting is one Network+ objective
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
